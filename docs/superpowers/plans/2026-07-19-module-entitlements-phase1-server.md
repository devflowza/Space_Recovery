# Module Entitlements — Phase 1 (Server Foundation + HR/Payroll Enforcement) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Super Admin's subscription plan the server-authoritative, default-deny control over whether a tenant can use the **HR** and **Payroll** modules, enforced in RLS so an excluded tenant gets zero rows / rejected writes over the API — with existing tenants grandfathered to full access (no behavior change until a plan is tightened).

**Architecture:** One canonical module vocabulary (`master_modules.slug`). A Super-Admin-editable `plan_modules` map. A server-materialized, per-tenant `tenant_module_entitlements` table (default-deny), refreshed by triggers on subscription/plan change. A `tenant_module_enabled(slug)` SECURITY DEFINER helper is ANDed (InitPlan-wrapped) into RLS on every HR/Payroll table. Existing tenants are grandfathered to all modules so enabling enforcement is a no-op until a plan is deliberately changed.

**Tech Stack:** Supabase Postgres (RLS, SECURITY DEFINER SQL functions, triggers, pg_cron unaffected), migrations via `mcp__supabase__apply_migration` (project `ssmbegiyjivrcwgcqutu`), generated `src/types/database.types.ts`, Deno edge functions, Vitest + a SQL assertion harness.

**Scope (Phase 1 only):** Server side. Frontend `EntitlementsContext`, route/nav guards, and the Plans→Modules admin UI are **Phase 2/3** (separate plans). This phase is fully testable via SQL + REST.

**Module→table map (the Phase-1 manifest slice):**
- `payroll`: `payroll_settings, payroll_periods, payroll_records, payroll_record_items, payroll_adjustments, payroll_bank_files, salary_components, employee_salary_components, employee_salary_config, employee_salary_structures, employee_loans, loan_repayments, master_payroll_components`
- `hr`: `employees, employee_documents, departments, positions, attendance_records, timesheets, leave_balances, leave_requests, performance_reviews, recruitment_jobs, recruitment_candidates, onboarding_checklists, onboarding_checklist_items, onboarding_tasks, master_leave_types`
- **Dependency:** `payroll ⇒ hr` (payroll reads employee data). Enforced at plan-seed + a CHECK in the refresh function (a tenant with payroll but not hr is coerced to also get hr, or flagged).
- **Do NOT touch:** `onboarding_progress` (product onboarding), `case_engineers`/`case_devices` (they may reference employees, but those are Cases-module tables — see Task 12 cross-module audit).

---

## File / object structure

**Migrations (applied via MCP; also written to `supabase/migrations/` + `migrations.manifest.md` per repo discipline):**
- `module_entitlements_catalog` — `master_modules` columns + gateable flags + seed parity.
- `module_entitlements_tables` — `plan_modules`, `tenant_module_entitlements` (+ RLS/trigger/index).
- `module_entitlements_functions` — `tenant_module_enabled`, `get_tenant_module_entitlements`, `refresh_tenant_module_entitlements`, extend `get_accessible_modules`.
- `module_entitlements_triggers` — refresh on `tenant_subscriptions` + `plan_modules`.
- `module_entitlements_seed_grandfather` — seed `plan_modules` for the 3 plans; backfill subscriptions + entitlements for existing tenants (grandfather = all).
- `module_entitlements_rls_hr_payroll` — AND the entitlement predicate into HR/Payroll table policies (and fix the `USING(true)` SELECT hole).

**Code:**
- `src/types/database.types.ts` — regenerated.
- `supabase/functions/provision-tenant/index.ts` — call refresh after setting `plan_id`.
- `supabase/functions/paypal-webhook/index.ts` (+ create/cancel) — refresh on status change (triggers also cover this; edge call is belt-and-suspenders).
- `scripts/check-module-rls.sql` — CI gate: every manifest HR/Payroll table carries the predicate.
- `src/lib/modules/manifest.ts` — the module→tables/routes/nav/events map (Phase-1 populates hr + payroll; consumed fully in later phases).

**Tests:**
- `scripts/module-entitlements.test.sql` (or an execute_sql harness) — RLS behavior as different tenants/roles.
- `src/lib/modules/manifest.test.ts` — manifest ↔ `master_modules` parity + every gateable table mapped.

---

## Task 1: Extend the module catalog (`master_modules`) + canonical seed

**Objects:** migration `module_entitlements_catalog`; `master_modules`.

- [ ] **Step 1: Assertion (pre)** — run and confirm the columns are absent:
```sql
SELECT count(*) FROM information_schema.columns
WHERE table_name='master_modules' AND column_name IN ('is_gateable','feature_flag_key');
-- expect 0
```
- [ ] **Step 2: Apply migration** (`mcp__supabase__apply_migration` name `module_entitlements_catalog`):
```sql
ALTER TABLE public.master_modules
  ADD COLUMN IF NOT EXISTS is_gateable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_flag_key text;
-- Non-gateable core areas (always available):
UPDATE public.master_modules SET is_gateable = false WHERE slug IN ('dashboard','settings');
-- Bridge to the existing registry nav keys (back-compat / Phase-2 nav):
UPDATE public.master_modules SET feature_flag_key = 'nav.hr'        WHERE slug = 'hr';
UPDATE public.master_modules SET feature_flag_key = 'nav.hr'        WHERE slug = 'payroll'; -- shares today; Phase 2 splits nav
UPDATE public.master_modules SET feature_flag_key = 'nav.financial' WHERE slug IN ('invoices','expenses','banking','reports');
UPDATE public.master_modules SET feature_flag_key = 'nav.business'  WHERE slug IN ('customers','quotes');
UPDATE public.master_modules SET feature_flag_key = 'nav.resources' WHERE slug IN ('inventory','stock','suppliers');
```
- [ ] **Step 3: Assertion (post)**:
```sql
SELECT slug, is_gateable, feature_flag_key FROM master_modules WHERE slug IN ('hr','payroll','dashboard','settings') ORDER BY slug;
-- expect hr/payroll is_gateable=true feature_flag_key='nav.hr'; dashboard/settings is_gateable=false
```
- [ ] **Step 4: Write the canonical seed migration** capturing all 16 `master_modules` rows + new columns as an idempotent `INSERT ... ON CONFLICT (slug) DO UPDATE` so fresh tenants/CI get the catalog (today the rows live only in the live DB). Add to `src/config/seedData.ts` module seed if that path provisions modules.
- [ ] **Step 5: Regenerate types** (Task 7 batches this) and **commit** the SQL file + manifest row.

---

## Task 2: `plan_modules` table (plan → module map)

**Objects:** migration `module_entitlements_tables` (part A); `plan_modules`.

- [ ] **Step 1: Assertion (pre)** — `SELECT to_regclass('public.plan_modules');` → expect NULL.
- [ ] **Step 2: Apply migration** (part of `module_entitlements_tables`):
```sql
CREATE TABLE public.plan_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.master_modules(id) ON DELETE CASCADE,
  is_included boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, module_id)
);
CREATE INDEX idx_plan_modules_plan_id ON public.plan_modules(plan_id);
ALTER TABLE public.plan_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_modules FORCE ROW LEVEL SECURITY;
-- Global-ish (platform-owned) like subscription_plans: authenticated read, platform-admin write.
CREATE POLICY plan_modules_select ON public.plan_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY plan_modules_write  ON public.plan_modules FOR ALL   TO authenticated
  USING ((SELECT is_platform_admin())) WITH CHECK ((SELECT is_platform_admin()));
```
- [ ] **Step 3: Assertion (post)** — `SELECT to_regclass('public.plan_modules');` → non-NULL; RLS enabled.
- [ ] **Step 4: Commit** SQL + manifest row.

---

## Task 3: `tenant_module_entitlements` table (materialized effective set)

**Objects:** migration `module_entitlements_tables` (part B); tenant-scoped, follows CLAUDE.md tenant-table requirements.

- [ ] **Step 1: Assertion (pre)** — `SELECT to_regclass('public.tenant_module_entitlements');` → NULL.
- [ ] **Step 2: Apply migration:**
```sql
CREATE TABLE public.tenant_module_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_slug text NOT NULL,
  enabled boolean NOT NULL,
  source text NOT NULL DEFAULT 'plan' CHECK (source IN ('plan','override','trial','grandfather')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, module_slug)
);
CREATE INDEX idx_tenant_module_entitlements_tenant_id
  ON public.tenant_module_entitlements(tenant_id) WHERE deleted_at IS NULL;
ALTER TABLE public.tenant_module_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_module_entitlements FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_module_entitlements_tenant_isolation ON public.tenant_module_entitlements
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = (SELECT get_current_tenant_id()) OR (SELECT is_platform_admin()));
CREATE POLICY tenant_module_entitlements_select ON public.tenant_module_entitlements
  FOR SELECT TO authenticated USING (true);
-- Writes only via SECURITY DEFINER refresh fn / platform admin (no direct tenant writes):
CREATE POLICY tenant_module_entitlements_write ON public.tenant_module_entitlements
  FOR ALL TO authenticated USING ((SELECT is_platform_admin())) WITH CHECK ((SELECT is_platform_admin()));
-- Reuse the standard tenant/audit trigger:
CREATE TRIGGER set_tenant_module_entitlements_tenant_and_audit
  BEFORE INSERT OR UPDATE ON public.tenant_module_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_and_audit_fields();
```
- [ ] **Step 3: Assertion (post)** — table exists; `check-tenant-table-requirements.sql` passes for it (RLS+FORCE, RESTRICTIVE isolation, trigger, tenant index).
- [ ] **Step 4: Commit** SQL + manifest row.

---

## Task 4: Server helpers

**Objects:** migration `module_entitlements_functions`.

- [ ] **Step 1: Apply migration** — the default-deny gate + loaders:
```sql
-- Default-DENY module gate for the CURRENT tenant. Platform admins bypass so they
-- can administer/impersonate. STABLE + SECURITY DEFINER + pinned search_path; call
-- ONLY as a scalar sub-select in RLS so it InitPlans once per query, not per row.
CREATE OR REPLACE FUNCTION public.tenant_module_enabled(p_module_slug text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN (SELECT is_platform_admin()) THEN true
    ELSE COALESCE((
      SELECT e.enabled FROM tenant_module_entitlements e
      WHERE e.tenant_id = (SELECT get_current_tenant_id())
        AND e.module_slug = p_module_slug AND e.deleted_at IS NULL
    ), false)   -- default DENY
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_module_entitlements()
RETURNS TABLE(module_slug text, enabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT m.slug,
         CASE WHEN NOT m.is_gateable THEN true
              WHEN (SELECT is_platform_admin()) THEN true
              ELSE COALESCE(e.enabled, false) END
  FROM master_modules m
  LEFT JOIN tenant_module_entitlements e
    ON e.module_slug = m.slug AND e.tenant_id = (SELECT get_current_tenant_id()) AND e.deleted_at IS NULL
  WHERE m.is_active;
$$;

-- Recompute a tenant's entitlements from its ACTIVE subscription's plan_modules.
CREATE OR REPLACE FUNCTION public.refresh_tenant_module_entitlements(p_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_plan uuid;
BEGIN
  SELECT plan_id INTO v_plan FROM tenant_subscriptions
   WHERE tenant_id = p_tenant_id AND deleted_at IS NULL
     AND status IN ('active','trialing')
   ORDER BY updated_at DESC LIMIT 1;

  -- Upsert one row per gateable module = included in the plan (default false if no plan).
  INSERT INTO tenant_module_entitlements (tenant_id, module_slug, enabled, source)
  SELECT p_tenant_id, m.slug,
         COALESCE(bool_or(pm.is_included), false),
         'plan'
  FROM master_modules m
  LEFT JOIN plan_modules pm ON pm.module_id = m.id AND pm.plan_id = v_plan
  WHERE m.is_gateable AND m.is_active
  GROUP BY m.slug
  ON CONFLICT (tenant_id, module_slug) DO UPDATE
    SET enabled = EXCLUDED.enabled,
        source = CASE WHEN tenant_module_entitlements.source = 'override'
                      THEN tenant_module_entitlements.source ELSE 'plan' END,
        updated_at = now(), deleted_at = NULL;

  -- Dependency coercion: payroll ⇒ hr.
  UPDATE tenant_module_entitlements SET enabled = true, updated_at = now()
   WHERE tenant_id = p_tenant_id AND module_slug = 'hr'
     AND EXISTS (SELECT 1 FROM tenant_module_entitlements p
                 WHERE p.tenant_id = p_tenant_id AND p.module_slug='payroll' AND p.enabled);
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_module_enabled(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_module_enabled(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_module_entitlements() TO authenticated;
REVOKE ALL ON FUNCTION public.refresh_tenant_module_entitlements(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_tenant_module_entitlements(uuid) TO service_role;
```
- [ ] **Step 2: Assertion** — as a tenant with no entitlement rows, `SELECT tenant_module_enabled('hr')` → false (default-deny) in a JWT-claims-set `DO` block; as platform admin → true.
- [ ] **Step 3: Extend `get_accessible_modules()`** to intersect role grants with entitlements (fetch its current definition with `pg_get_functiondef`, add a `WHERE (SELECT tenant_module_enabled(slug))` filter for gateable modules, keep owner/admin role-bypass but NOT entitlement-bypass). Apply as `CREATE OR REPLACE` in the same migration.
- [ ] **Step 4: Commit** SQL + manifest row.

---

## Task 5: Refresh triggers

**Objects:** migration `module_entitlements_triggers`.

- [ ] **Step 1: Apply migration:**
```sql
CREATE OR REPLACE FUNCTION public.trg_refresh_entitlements_on_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN PERFORM refresh_tenant_module_entitlements(NEW.tenant_id); RETURN NEW; END; $$;
CREATE TRIGGER trg_tenant_subscriptions_refresh_entitlements
  AFTER INSERT OR UPDATE OF plan_id, status ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_entitlements_on_subscription();

CREATE OR REPLACE FUNCTION public.trg_refresh_entitlements_on_plan_modules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT ts.tenant_id FROM tenant_subscriptions ts
           WHERE ts.plan_id = COALESCE(NEW.plan_id, OLD.plan_id) AND ts.deleted_at IS NULL
  LOOP PERFORM refresh_tenant_module_entitlements(r.tenant_id); END LOOP;
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER trg_plan_modules_refresh_entitlements
  AFTER INSERT OR UPDATE OR DELETE ON public.plan_modules
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_entitlements_on_plan_modules();
```
- [ ] **Step 2: Assertion** — insert a `plan_modules` row for a test plan → entitlements for that plan's tenants refresh (verify in Task 6 seed test).
- [ ] **Step 3: Commit** SQL + manifest row.

---

## Task 6: Seed plan_modules + grandfather existing tenants

**Objects:** migration `module_entitlements_seed_grandfather`.

- [ ] **Step 1: Seed `plan_modules`** for the 3 plans from their `features.modules` JSON, mapping to `master_modules` (Enterprise `["all"]` ⇒ every gateable module; map `basic_reports`/`reports`→`reports`). Include `hr`/`payroll` only where the tier sells them (per business rules — default: Enterprise only, matching today's plan JSON). Idempotent upserts.
- [ ] **Step 2: Grandfather existing tenants** (2 today, `tenant_subscriptions` empty):
```sql
-- (a) ensure every active tenant has an active subscription (link to a chosen plan or an internal 'grandfather-all' plan)
-- (b) backfill entitlements = ALL gateable modules enabled, source='grandfather' (so RLS enforcement is a no-op until tightened)
INSERT INTO tenant_module_entitlements (tenant_id, module_slug, enabled, source)
SELECT t.id, m.slug, true, 'grandfather'
FROM tenants t CROSS JOIN master_modules m
WHERE t.deleted_at IS NULL AND m.is_gateable AND m.is_active
ON CONFLICT (tenant_id, module_slug) DO UPDATE SET enabled = true, source='grandfather', updated_at=now(), deleted_at=NULL;
```
- [ ] **Step 3: Assertion** — every active tenant has an `enabled=true` row per gateable module; `tenant_module_enabled('hr')`/`('payroll')` → true for both existing tenants.
- [ ] **Step 4: Commit** SQL + manifest row.

---

## Task 7: Regenerate types

- [ ] **Step 1:** `mcp__supabase__generate_typescript_types` → write `src/types/database.types.ts` (decode the JSON wrapper; verify `git diff` shows only the new tables/columns/functions — additive).
- [ ] **Step 2:** `npm ci && npm run check:tsc` → 0 errors.
- [ ] **Step 3: Commit** the regenerated types.

---

## Task 8: RLS enforcement on HR/Payroll tables (the crux) + fix the `USING(true)` hole

**Objects:** migration `module_entitlements_rls_hr_payroll`. Grandfathering (Task 6) makes this safe for existing tenants.

- [ ] **Step 1: Failing test** — `scripts/module-entitlements.test.sql`: as a NON-entitled test tenant (set `request.jwt.claims`, disable `hr` via a temp entitlement flip inside a rolled-back `DO` block), `SELECT count(*) FROM employees` currently returns >0 → assert it SHOULD be 0. Run → FAILS (no predicate yet).
- [ ] **Step 2: Apply migration** — for EACH table in the `hr` and `payroll` manifest slices, add the ANDed predicate to every policy and fix bare-`true` SELECTs. Pattern (per table, slug per manifest):
```sql
-- Example: employees (module 'hr'). Repeat per table with its module slug.
DROP POLICY IF EXISTS employees_select ON public.employees;
CREATE POLICY employees_select ON public.employees FOR SELECT TO authenticated
  USING ((SELECT is_staff_user()) AND (SELECT public.tenant_module_enabled('hr')));
ALTER POLICY employees_insert ON public.employees
  WITH CHECK ((SELECT public.has_role('hr')) AND (SELECT public.tenant_module_enabled('hr')));
ALTER POLICY employees_update ON public.employees
  USING ((SELECT public.has_role('hr')) AND (SELECT public.tenant_module_enabled('hr')));
ALTER POLICY employees_delete ON public.employees
  USING ((SELECT public.has_role('admin')) AND (SELECT public.tenant_module_enabled('hr')));
```
  Generate these programmatically from the manifest (a `DO $$` loop over `(table, slug)` pairs reading `pg_policies`, or emit explicit statements). RESTRICTIVE tenant isolation policies stay untouched (predicate is ANDed via the PERMISSIVE policies). Keep OR-chains cheapest-first.
- [ ] **Step 3: Passing test** — re-run: non-entitled tenant → `employees`/`payroll_records` return 0 and writes rejected; entitled/grandfathered tenant → unchanged; platform admin → unaffected. All via rolled-back `DO` blocks (no persisted test data).
- [ ] **Step 4: InitPlan check** — `EXPLAIN` a policy-bound query confirms the helper is an InitPlan (once), not per-row; extend `scripts/check-rls-initplan.sql` coverage.
- [ ] **Step 5: CI gate** — add `scripts/check-module-rls.sql`: assert every manifest hr/payroll table's SELECT/INSERT/UPDATE/DELETE policy body contains `tenant_module_enabled(`. Wire into CI.
- [ ] **Step 6: Commit** SQL + script + manifest row.

---

## Task 9: Provisioning + plan-change refresh (edge functions)

**Files:** `supabase/functions/provision-tenant/index.ts`, `paypal-webhook/index.ts` (+ create/cancel).

- [ ] **Step 1:** After `provision-tenant` sets `plan_id` (index.ts ~341), also insert/ensure a `tenant_subscriptions` row (so the trigger fires) OR call `supabase.rpc('refresh_tenant_module_entitlements', { p_tenant_id })` with the service-role client. (Triggers already cover the subscription path; this guarantees entitlements exist immediately post-provision.)
- [ ] **Step 2:** In `paypal-webhook` subscription create/activate/cancel handlers, the `tenant_subscriptions` UPDATE already triggers refresh — add an explicit `refresh_tenant_module_entitlements` call as belt-and-suspenders and log it.
- [ ] **Step 3: Test** — a provisioning integration check: new tenant on the Starter plan gets `hr`/`payroll` entitlement = false (Starter excludes them), `cases` = true. (Run against a scratch tenant in a rolled-back transaction or a test project.)
- [ ] **Step 4: Deploy** edge functions (`mcp__supabase__deploy_edge_function`); **commit**.

---

## Task 10: Module manifest (Phase-1 slice) + parity test

**Files:** `src/lib/modules/manifest.ts`, `src/lib/modules/manifest.test.ts`.

- [ ] **Step 1: Failing test** — `manifest.test.ts`: every gateable `master_modules` slug has a manifest entry; every manifest `tables[]` entry is a real table; `hr`/`payroll` map to the exact table lists above. Run → FAILS (file absent).
- [ ] **Step 2: Implement** `manifest.ts` exporting `MODULE_MANIFEST: ModuleManifest[]` with `{ slug, label, gateable, dependsOn, tables, routes, navSectionKeys, eventTypePrefixes }` populated for `hr` and `payroll` (routes/nav/events used by Phase 2+; tables used by the Task-8 generator + Task-11 CI gate).
- [ ] **Step 3: Passing test** — run → PASS. **Commit.**

---

## Task 11: Cross-module leakage audit (read-only, produces follow-ups)

- [ ] **Step 1:** Grep for PostgREST embeds/joins from Cases/other modules into HR tables (e.g. `case_engineers` → `employees`, any `.select('...employees(...)')`). Document each in the plan's follow-up list; confirm that under the new RLS the embedded HR side returns null/empty for non-entitled tenants (no error), and that UI degrades gracefully.
- [ ] **Step 2:** Verify no SECURITY DEFINER RPC returns HR data without a `tenant_module_enabled` check (grep functions touching HR tables). Add gates where found.
- [ ] **Step 3:** Record findings in `docs/superpowers/plans/` follow-ups; no code change unless a leak is found.

---

## Task 12: Phase-1 acceptance (multi-tenant, SQL/REST)

- [ ] **Step 1:** Create/choose two test tenants: A (entitled hr+payroll), B (entitled hr, NOT payroll) via `plan_modules` + refresh.
- [ ] **Step 2:** As B (JWT claims set), assert: `payroll_records`/`payroll_periods` return 0 and INSERT rejected; `employees`/`leave_requests` work (hr entitled). As A: both work. As platform admin: both work. All in rolled-back `DO` blocks.
- [ ] **Step 3:** Toggle B's plan to include payroll → trigger refresh → `payroll_records` now accessible. Toggle off → inaccessible again. Assert idempotency.
- [ ] **Step 4:** Confirm existing (grandfathered) tenants are unaffected end-to-end.
- [ ] **Step 5: Commit** the acceptance SQL harness.

---

## Self-review notes
- **Spec coverage:** foundation (Tasks 1-4), refresh automation (5,9), authority mapping (2,6), default-deny (4), grandfather/migration (6), RLS "no trace" (8), scalability manifest + CI gate (10, 8.5), cross-module safety (11), multi-tenant acceptance (12). Frontend/nav/route "no trace" and the Super-Admin Plans→Modules UI are **explicitly deferred to Phase 2/3** — Phase 1 delivers the server/API/DB boundary only.
- **Type consistency:** `tenant_module_enabled(text)`, `refresh_tenant_module_entitlements(uuid)`, `get_tenant_module_entitlements()`, `tenant_module_entitlements(tenant_id, module_slug, enabled, source)`, `plan_modules(plan_id, module_id, is_included)` used consistently across tasks.
- **Watch-outs:** payroll⇒hr dependency (Task 4 coercion); `USING(true)` SELECT hole fixed in Task 8; InitPlan wrapping mandatory (Task 8.4); do not gate `onboarding_progress`; grandfather BEFORE enabling predicates (Task 6 before Task 8).

---

## Follow-on plans (separate documents)
- **Phase 2 — Frontend "no trace":** `EntitlementsContext`, manifest-filtered route tree + `RequireModule`, nav/palette/breadcrumb/dashboard gating, `FeaturesSettings` constrained to entitled modules, split `nav.hr`→`nav.payroll`. Delivers the client-side "as if never installed."
- **Phase 3 — Super-Admin Plans→Modules UI:** `PlanModulesTab` checkbox grid bound to `master_modules` writing `plan_modules`; plan validation (payroll⇒hr).
- **Phase 4 — Generalize to all modules + events/jobs:** extend the manifest + RLS predicates to Financial/Business/Resources/etc.; gate module-scoped event emission/dispatch and per-tenant cron work; import/export `hr` domain gating.
