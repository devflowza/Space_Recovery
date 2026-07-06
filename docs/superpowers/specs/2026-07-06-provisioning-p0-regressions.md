# P0 — Self-service tenant provisioning is broken (3 regressions)

**Found:** 2026-07-06, while provisioning the disposable IN test tenant for Phase 4 WP-S2.8.
**Impact:** **No new tenant can be provisioned** through `provision-tenant` (self-service signup *or* admin-provisioned) — every attempt returns HTTP 500 and soft-deletes the half-created tenant. This blocks all new-customer onboarding.

Reproduced live on `ssmbegiyjivrcwgcqutu`: three attempts, each surfacing the next regression in the chain. The `provision-tenant` edge function creates a tenant, an auth user (via `auth.admin.createUser`), then — as the **service-role PostgREST client** — inserts `company_settings`, `accounting_locales`, `legal_entities`, `onboarding_progress`. Two of those steps are fail-loud (they soft-delete the tenant and rethrow); the others only `console.error`. The tenant-scoped inserts run with **no `get_current_tenant_id()` context** and **`is_platform_admin() = false`**.

## Regression 1 — `handle_new_user` didn't take the tenant-guard bypass  ✅ FIXED

`auth.admin.createUser` fires `handle_new_user` (AFTER INSERT on `auth.users`), which inserts the owner's `profiles` row with the new `tenant_id`. The BEFORE-INSERT guard `set_tenant_and_audit_fields` raises **`Cannot insert data for a different tenant` (P0001)** because `NEW.tenant_id ≠ get_current_tenant_id()` (NULL in GoTrue's admin txn), aborting `createUser` with *"Database error creating new user"*.

- **Fix applied** (migration `20260706152831`, `fix_handle_new_user_tenant_guard_bypass`): `handle_new_user` now `PERFORM set_config('app.bypass_tenant_guard','true',true)` before the insert — the guard's own transaction-local escape hatch. Safe: the `tenant_id` comes from service-role-controlled `raw_user_meta_data`. Verified: `createUser` then succeeds.
- **This fix alone does NOT restore signup** — the flow then hits regressions 2 & 3.

## Regression 2 — the tenant-guard blocks ALL service-role provisioning inserts  ⚠️ OWNER DECISION

`set_tenant_and_audit_fields` (BEFORE INSERT on every tenant-scoped table) fires for the edge function's service-role inserts too (triggers run regardless of RLS). With no tenant context and `is_platform_admin()=false`, it rejects `company_settings`, `accounting_locales`, `legal_entities`, `onboarding_progress`. Verified: for the rolled-back tenant `d45782b9`, **0** rows landed in any of those tables.

The guard's authorization is `NEW.tenant_id = get_current_tenant_id() OR is_platform_admin() OR app.bypass_tenant_guard='true'`. A platform-level provisioner (service_role) satisfies none.

**Options (owner's call — this touches the guard on ~190 tables, so not fixed here):**
1. Make the guard recognise `service_role` (e.g. `AND auth.jwt()->>'role' <> 'service_role'` in the RAISE condition), OR
2. Refactor `provision-tenant` to do all its inserts inside a single `SECURITY DEFINER` RPC that sets `app.bypass_tenant_guard` for the duration (PostgREST can't set session config across its per-request connections).

## Regression 3 — `validate_country_config_overrides` is mis-attached to `legal_entities`  ⚠️ CLEAR FIX (not applied)

The trigger function `validate_country_config_overrides()` references `NEW.country_config_overrides`, but it is attached to **both `tenants` (correct — has the column) and `legal_entities` (wrong — has no such column)**. So every `legal_entities` INSERT errors **`record "new" has no field "country_config_overrides"` (42703)** — this is the fail-loud step that rolls the tenant back once regressions 1 & 2 are cleared.

- **Recommended fix (unambiguous, safe):** `DROP TRIGGER <name> ON public.legal_entities` — the trigger never validated anything on `legal_entities` (the column doesn't exist), it only errored. Left to the owner to apply alongside the Regression-2 decision so the provisioning subsystem is fixed coherently.

## Test-rig state left behind (disposable, safe to purge)

While diagnosing, these artifacts were created and NOT cleaned (kept for owner inspection):
- Auth user `92b93bd7-9a34-4943-96bc-8531117ce518` (`phase4-in-lab@spacedatarecovery.com`, password in `<session scratchpad>/in-tenant-credentials.txt`) — created by the successful `createUser`, profile points to the soft-deleted tenant `d45782b9`.
- Soft-deleted tenants `IND0001` (`f2ea7f96`, slug `in-test-lab-p4`) and `IND0002` (`d45782b9`, slug `in-test-lab-p4b`) — both rolled back by the failed provisions.
- The seeded `signup_otps` rows were deleted.

## Consequence for Phase 4 WP-S2

WP-S2's **code is complete and reviewed** (S2.1–S2.7 + review fixes). The **S2.9 live dry-run acceptance is deferred** — it needs a working IN test tenant, which these regressions prevent. Once the owner applies the Regression-2 + Regression-3 fixes (Regression-1 is done), `provision-tenant` works and S2.9 can run unchanged (env-gated probe already authored).
