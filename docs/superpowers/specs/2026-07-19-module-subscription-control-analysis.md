# Plan-Driven Module-Level Subscription Control — Analysis & Implementation Roadmap

**Date:** 2026-07-19
**Status:** Analysis + roadmap (no code changes). For review before any development.
**Scope:** Make the SaaS Super Admin (platform admin) the sole authority over which **modules** (HRMS, Payroll, and every other module) a tenant can use, via the Subscription & Plans module, such that an excluded module leaves **no trace** anywhere in the tenant application — "as if it was never installed."

> This document is the design/architecture stage. Each phase below can be expanded into a
> bite-sized TDD implementation plan (superpowers:writing-plans) once the direction is approved.

---

## 0. Executive summary

xSuite already has **most of the building blocks**, but they are **three parallel systems that never reference each other**, and none of them is plan-driven or server-enforced for modules. The work is primarily **integration + hardening + a flip to default-deny**, not a greenfield build.

The three existing systems:

| # | System | Storage | Purpose today | Enforcement |
|---|--------|---------|---------------|-------------|
| **A** | Tenant **feature flags** | `tenants.feature_flags` (jsonb) + `src/lib/features/registry.ts` (30 dotted keys incl. `nav.hr`) | Tenant *self-service* workflow/visibility toggles | Client-only, **default-ON**; 1 server call site (`workflow.stage.qa`) |
| **B** | Role→**Module** RBAC | `master_modules` (16-row global catalog, slugs) + `role_module_permissions` | Which *roles* may reach which modules | Client nav only; RLS never consults it |
| **C** | **Subscription plans** | `subscription_plans` / `plan_features` / `tenant_subscriptions` | What a tenant *paid for* | Client-only; effectively **dead code** |

**The central defects:**

1. **Plans drive nothing.** `tenant_subscriptions` and `plan_features` have **0 rows**; nothing maps a plan to a module set; `provision-tenant` sets `plan_id` but never writes `feature_flags` or an entitlement.
2. **Three disjoint "module" vocabularies** (`master_modules.slug` kebab-case vs registry `nav.*` dotted vs plan capability keys flat_snake) with **no shared join key**.
3. **Default-ON, client-only.** `tenant_feature_enabled` and the registry both **fail open** (missing key ⇒ enabled). Module gating lives in the browser; the DB/API has no plan/feature dimension.
4. **RLS on HR/payroll is `tenant_id`+role only** — and the SELECT policies are a bare `true` (even a `viewer` reads payroll). PostgREST returns every HR row on any plan. This is the single most important gap: **"no trace" is impossible without RLS enforcement.**
5. **Route gap:** HR/Payroll routes (`App.tsx:226-248`) are role-gated only — **no `FeatureRoute`** — so any owner/admin/hr user can deep-link to `/hr`, `/payroll`, `/leave` even when the sidebar hides them.
6. **Tenant can self-re-enable** a module via Settings → Features (`FeaturesSettings.tsx`) — there is no platform-level lock.

**The proposed architecture:** one canonical module vocabulary (`master_modules.slug`), a plan→module mapping the Super Admin edits, a **server-materialized per-tenant entitlement table** that is **default-DENY**, enforced **RLS-first** (the real boundary) with route/nav/event/job/search layers all deriving from the same server truth, and a **declarative module manifest** so adding the 17th…200th module needs no architectural change.

---

## 1. Current architecture assessment

### 1.1 System A — Tenant feature flags (workflow/visibility)
- **Column:** `tenants.feature_flags jsonb NOT NULL DEFAULT '{}'` (`database.types.ts:17429`). Stores **overrides only**; empty `{}` ⇒ every registry key at its default.
- **Registry:** `src/lib/features/registry.ts` — `FEATURE_REGISTRY` (30 keys): `case.tab.*` (14, 3 `core`), `workflow.stage.*` + `workflow.stage_banner` (4), `nav.financial|business|resources|hr` (4), `dashboard.*` (3), `portal.customer`, `automation.case_follow_ups`. `FeatureDef` carries `defaultEnabled`, `core`, `dependsOn`, and surface bindings (`caseTabId`, `stagePhase`, `routes`). `CASE_TAB_FEATURE`/`STAGE_FEATURE_BY_PHASE` derive maps from it.
- **Resolver:** `src/lib/features/resolveFeatures.ts` — `override ?? defaultEnabled`; `core` forced true; dependency cascade; **unknown key ⇒ `true`** (`:28`, fail-open).
- **Load/cache:** `src/lib/tenantConfigService.ts:14-67` (5-min cache) → `TenantConfigContext` → `useTenantFeature` / `useTenantFeatures().isEnabled` (`:154-173`).
- **Server gate:** `tenant_feature_enabled(p_tenant_id, p_key) → COALESCE((feature_flags->>p_key)::boolean, true)` — **default true**. Server call sites: **only** `transition_case_status` (`workflow.stage.qa`). `portal.customer` is checked client-side from `PortalAuthContext.tsx:226` (a client call to the RPC; the `portal-login` edge function does **not** read flags).
- **Writer:** `src/lib/tenantFeaturesService.ts` ← `src/pages/settings/FeaturesSettings.tsx` (tenant admin self-service). **Never set at provisioning; never plan-derived.**
- **Off-registry precedent:** `business_unit_isolation` lives in `feature_flags` and is read **directly in RLS** (dormant; `src/lib/country/session/sessionScope.ts:11-13`) — proof RLS *can* read `feature_flags`.
- `nav.hr` bundles **HR + Payroll + Employee-Management** (single flag).

### 1.2 System B — Role→Module RBAC
- **Catalog:** `master_modules` (global, 16 rows, columns `id, name, slug, description, icon, parent_id, sort_order, is_active, category, order_index`). Slugs incl. `cases, customers, invoices, quotes, inventory, stock, suppliers, banking, expenses, hr, payroll, reports, knowledge-base, dashboard, settings`. Route/permission slugs are finer-grained (`src/lib/moduleMapping.ts`: `hr-dashboard, employees, recruitment, onboarding, performance, payroll-dashboard, process-payroll, salary-components, payroll-history, attendance, leave, timesheets`, …).
- **Grants:** `role_module_permissions (tenant_id, role, module_id, can_access)` unique `(tenant_id, role, module_id)`. **Currently 0 rows.**
- **Resolution:** `PermissionsContext.hasModuleAccess` (owner/admin ⇒ `true` short-circuit; else `accessibleModules.has(slug)`); RPCs `get_accessible_modules` / `check_module_access` (SECURITY DEFINER, **role-only**). `src/lib/rolePermissionsService.ts` (5-min cache keyed `${tenantId}:${role}`).
- **Enforcement:** client nav (`ProtectedSidebarNavItem`) + command palette only. **No RLS policy references `role_module_permissions`.**
- Admin UI: `src/pages/admin/RolePermissions.tsx`. Role `hr` is a first-class role (`src/types/roles.ts`), with `is_hr_or_admin()` used in HR-table RLS, but `hr` is **not** auto-granted HR modules.

### 1.3 System C — Subscription plans (billing)
- **Tables:** `subscription_plans` (global; `features jsonb`, `limits jsonb`, rate-limit scalars, PayPal ids; 3 rows: Starter/Professional/Enterprise). `plan_features (plan_id, feature_key, is_enabled, limit_type, limit_value, …)` — the structured per-feature map, **0 rows**. `tenant_subscriptions (tenant_id 1:1, plan_id, status, billing…)` — **0 rows**. `tenant_payment_methods`.
- **Plan `features` jsonb** stores `{modules:[…], features:[…]}` (e.g. Starter modules `[cases, customers, quotes, invoices, basic_reports]`; Enterprise `["all"]`) — **edited via raw JSON textarea in the admin UI but read by no gate.**
- **Runtime:** `src/lib/featureGateService.ts` (client-only; reads `tenant_id` from **localStorage**; `tenant_subscriptions`→`plan_features`; hardcoded `PLAN_HIERARCHY` + `FEATURE_REQUIREMENTS`; capability key space `advanced_reports, api_access, sso, multi_branch, white_labeling, …` — **no module keys**). `useFeature`/`useFeatures` (`src/hooks/useFeatureGate.ts`). Live consumers: `Dashboard.tsx:25` (unused `_hasAdvancedReports`), `UserManagement.tsx` (`max_users`), `CasesList.tsx` (`max_cases_per_month`). **Otherwise dead.**
- **Server-authoritative variant** exists but unused: `billingService.hasFeatureAccess()` (requires `status ∈ {active,trialing}`).
- Admin UI: `src/pages/platform-admin/PlansManagementPage.tsx`, `PlanDetailPage.tsx`, `src/components/platform-admin/plans/PlanFeatureFormModal.tsx` (feature keys from a fixed list + free text; **no module catalog binding**).

### 1.4 Enforcement surfaces (server)
- **RLS (HR example — `employees`, `payroll_records`, and siblings):** RESTRICTIVE tenant isolation + PERMISSIVE `SELECT USING (true)` (⚠ no role gate) + `INSERT/UPDATE WITH CHECK has_role('hr')` + `DELETE has_role('admin')`. **No plan/feature predicate anywhere.**
- **Cron (`cron.job`, 5 jobs):** `process-time-based-events` (*/15), `sync-exchange-rates-daily`, `process-case-follow-ups` (*/15), `financial-base-integrity-hourly`, `pack-staleness-daily`. None HR; none plan-aware. `process_time_based_events` iterates all tenants with no feature check (the template a future payroll/leave job would copy).
- **Events:** `emit_notification_event` + AFTER INSERT triggers `dispatch_notification_event_in_app` / `_email` (pg_net → `notification-dispatch-email`). Direct emitters on `payments`, `stock_alerts`. Event types are case/inventory/invoice/payment/quote; **no HR events yet**; dispatch is **subscription-blind**.
- **Reports/analytics:** server stat RPCs are **financial-only** (`get_*_stats_base`). HR/payroll dashboards aggregate **client-side** off base tables (`payrollService.ts`, `leaveService.ts`, `timesheetService.ts`) — so any RPC-only gate is bypassable; the gate must be in RLS.
- **Edge functions (11):** `provision-tenant` sets `plan_id`, not `feature_flags`/entitlement; none read plan/feature to gate a module.
- **Search:** no server index; `CommandPalette.tsx` runs client per-table queries (`cases`, `customers_enhanced`, `invoices`) bounded only by RLS.

### 1.5 Client surfaces that expose modules
- **Nav:** `src/components/layout/navConfig.ts` (`NAV_SECTIONS`, section `gate(ctx)` + per-item `hasModuleAccess`), rendered by `Sidebar.tsx` / `ProtectedSidebarNavItem.tsx` / `MobileNavDrawer.tsx`. HR/Payroll/Employee sections gate on `(hasModuleAccess('hr-dashboard')||hasModuleAccess('employees')) && isEnabled('nav.hr')`.
- **Routes:** `src/App.tsx` (lazy `createBrowserRouter`). HR/payroll block `App.tsx:226-248` under `ProtectedRoute allowedRoles={HR_ROLES}` — **no FeatureRoute**. `FeatureRoute` (`src/components/FeatureRoute.tsx`) used **once** (`nav.financial`, and only 4 of the financial routes).
- **Dashboard:** `src/pages/dashboard/Dashboard.tsx` — inline widgets gated by `isEnabled('dashboard.*')`; **no HR widgets today**.
- **Command palette / quick actions:** `src/components/shared/commandPaletteRegistry.ts` (`buildCommands({isAdmin, hasModuleAccess, isEnabled})`); "recents" query is **unfiltered by module**; no HR entries today.
- **Breadcrumbs:** `AppLayout.tsx` `routeLabels`/`sectionLabels` hardcode HR/payroll labels (leak if a route is reached).
- **Data migration:** `src/lib/dataMigration/workbookContract.ts` defines an **`hr` WorkbookDomain** (departments, positions, employees, leaveBalances, employeeLoans), surfaced in `ImportExportCenter.tsx`.

### 1.6 Multi-tenant / scale baseline
2 active tenants; `tenant_subscriptions`/`plan_features`/`role_module_permissions` all empty; 1 tenant has a populated `feature_flags` (with a `nav.hr` key). Early-stage data volume — migration is low-risk — but the target is **hundreds of modules × tens of thousands of tenants**.

---

## 2. Gaps and risks in the existing implementation

| # | Gap | Consequence | Evidence |
|---|-----|-------------|----------|
| G1 | No plan→module mapping exists | "Plan excludes HRMS" is inexpressible | `plan_features` capability keys; `PlanFeatureFormModal.tsx` |
| G2 | Module gate reads tenant self-service flags, not the plan | Tenant can re-enable an excluded module | `FeaturesSettings.tsx` → `tenants.feature_flags` |
| G3 | Plan-entitlement system is dead/unenforced | Building on System C = building on nothing wired | `featureGateService.ts` consumers |
| G4 | **No server-side module enforcement; RLS is tenant+role only** | API/DB return excluded-module rows | `pg_policies` on `employees`/`payroll_records` |
| G5 | HR/payroll SELECT policy is `USING (true)` | Even a `viewer` reads payroll (pre-existing correctness bug) | RLS audit |
| G6 | Routes not module-gated (HR/payroll) | Deep-link reaches page even when nav hides it | `App.tsx:226-248` (no FeatureRoute) |
| G7 | Provisioning doesn't derive flags/entitlement from plan | New tenants default **all modules on** | `provision-tenant/index.ts:336-351` |
| G8 | Default-ON everywhere (`tenant_feature_enabled`, resolver) | Missing entitlement = access granted (backwards) | `tenant_feature_enabled`; `resolveFeatures.ts:28` |
| G9 | Three vocabularies, no shared key | No clean join for a plan→module→routes/RLS chain | §1.1–1.3 |
| G10 | owner/admin bypass module checks client-side | A plan downgrade wouldn't hide modules from owners | `PermissionsContext.tsx:59` |
| G11 | `nav.hr` bundles HR+Payroll+Employee | Can't sell/gate Payroll independently of HR | `navConfig.ts:156,170,186` |
| G12 | Three independent 5-min caches; localStorage tenant_id | Plan change won't refresh module visibility coherently | `featureGateService.ts`, `rolePermissionsService.ts`, `tenantConfigService.ts` |
| G13 | Events/jobs/search subscription-blind | Future module-scoped events/jobs would leak; search is not module-aware | §1.4 |
| G14 | Breadcrumb/label maps and command-palette recents not module-aware | Residual "trace" of excluded modules | `AppLayout.tsx`, `CommandPalette.tsx` |
| G15 | Data-migration `hr` domain always offered | Excluded tenants can still import/export HR entities | `workbookContract.ts` |

**Top risk:** G4/G5 — without RLS enforcement, "no trace in API responses / DB queries / reports" is unachievable, because the client dashboards read base tables directly.

---

## 3. Proposed architecture for module-level subscription control

**Design principles:** (1) one canonical module vocabulary; (2) plans are the source of authority; (3) **RLS is the real boundary**, everything else is derived UX; (4) **default-DENY** for gateable modules; (5) **declarative manifest** so scale is a data operation, not an architectural one.

### 3.1 Canonical module vocabulary
Adopt **`master_modules.slug`** as the single key across all layers. Extend `master_modules` with:
- `is_gateable boolean NOT NULL DEFAULT true` — `dashboard`, `settings`, and case-core stay non-gateable (always on).
- `feature_flag_key text NULL` — optional bridge to the existing registry `nav.*` key for backward-compat.
- (Optional) `parent_id` already exists — use it to model sub-modules (e.g. `payroll` under `hr`, or keep them siblings for independent sale).

### 3.2 Plan → Module mapping (Super Admin authority)
New table **`plan_modules`**:
```
plan_modules(id, plan_id → subscription_plans, module_id → master_modules,
             is_included boolean NOT NULL DEFAULT false, created_at, updated_at)
UNIQUE (plan_id, module_id)
```
The Plans admin UI renders a checkbox grid of `master_modules` per plan (replacing the free-text feature keys for module selection). This is literally "each plan defines exactly which modules are available."

### 3.3 Per-tenant effective entitlement (server-materialized, default-deny)
New tenant-scoped table **`tenant_module_entitlements`** (the O(1) server read surface):
```
tenant_module_entitlements(id, tenant_id → tenants, module_slug text,
                           enabled boolean NOT NULL, source text
                           CHECK (source IN ('plan','override','trial','grandfather')),
                           updated_at)
UNIQUE (tenant_id, module_slug);  INDEX (tenant_id) WHERE enabled;  RESTRICTIVE tenant isolation.
```
- Derived from the tenant's **active** `tenant_subscriptions.plan_id` → `plan_modules` (status ∈ {active, trialing}), plus optional platform-admin per-tenant overrides.
- **`refresh_tenant_module_entitlements(p_tenant_id)`** recomputes it. Triggers fire it on: `tenant_subscriptions` insert/update (plan/status change), `plan_modules` change (batch-refresh all tenants on that plan), and provisioning.
- **Default-DENY:** a module with no `enabled=true` row is **off**.

### 3.4 Server helpers (SECURITY DEFINER, STABLE, `search_path=public`, InitPlan-safe)
- **`tenant_module_enabled(p_module_slug text) RETURNS boolean`** — reads `tenant_module_entitlements` for `get_current_tenant_id()`, **default FALSE**; returns TRUE for platform admins (so impersonation/plan-admin isn't locked out). This is the **RLS predicate** and must be called as a scalar sub-select `(SELECT tenant_module_enabled('hr'))` (CLAUDE.md InitPlan rule — the `cases` policies went 642 ms → 4 ms when wrapped).
- **`get_tenant_module_entitlements() RETURNS TABLE(module_slug text, enabled boolean)`** — one call the client loads per session.
- Extend **`get_accessible_modules()`** to `INTERSECT` role grants with entitlements (RBAC UI reflects the plan).

### 3.5 Reconciliation of the three systems
- **Module-level gating → entitlements** (System B catalog + new tables; authoritative, server, default-deny).
- **Intra-module workflow toggles stay in `feature_flags`** (System A): case tabs, stages, dashboard widgets — but a tenant may only toggle features **within entitled modules** (the Features settings page filters to entitled modules).
- **`plan_features`** (System C) keeps **capability**-level entitlements (SSO, advanced_reports, API access, limits) — orthogonal to modules. `featureGateService` is refactored to read `tenant_id` from the auth/session (not localStorage) and, ideally, from a server RPC.
- Net: **one authority per concern** — modules (entitlements), workflow (feature_flags), capabilities/limits (plan_features).

### 3.6 Declarative module manifest (scalability keystone)
`src/lib/modules/manifest.ts` (mirrored/validated against `master_modules`): each module declares
```
{ slug, label, gateable, routes: string[], navSectionKeys: string[],
  tables: string[], eventTypePrefixes: string[], cronTags: string[],
  reportTypes: string[], searchSources: string[] }
```
Gating logic (route-tree build, nav build, RLS-policy generator/checklist, event guard, job guard, search filter, import/export domain filter) reads the manifest. **Adding a module = one manifest entry + one `master_modules` row + `plan_modules` entries** — nothing structural changes. A CI check asserts every gateable module's tables carry the RLS entitlement predicate (mirrors the existing `check-rls-initplan.sql` / tenant-table-requirements gates).

### 3.7 Enforcement layers (defense in depth; RLS-first)
1. **RLS** (authoritative): AND `(SELECT tenant_module_enabled('<slug>'))` into SELECT/INSERT/UPDATE/DELETE policies of every gateable module's tables → **zero rows / rejected writes** for excluded tenants. Simultaneously fix G5 (add a role predicate to the `USING (true)` SELECTs).
2. **Route tree**: build routes from the manifest filtered by entitlement (excluded module ⇒ **no route, no lazy chunk, no breadcrumb** — the "never installed" feel), plus a `<RequireModule slug>` guard as defense-in-depth.
3. **Navigation / palette / dashboard / breadcrumbs / search sources**: derive visibility from `isModuleEnabled(slug)` (single client entitlement context). owner/admin do **not** bypass module entitlement.
4. **Events / cron**: gate module-scoped event emission/dispatch and per-tenant job work by `tenant_module_enabled`.
5. **Import/export**: filter the `hr` WorkbookDomain by entitlement.

### 3.8 Client entitlement source of truth
New **`EntitlementsContext`** (or fold into `TenantConfigContext`) loads `get_tenant_module_entitlements()` once per session, exposes `isModuleEnabled(slug)`, and invalidates coherently on plan change (Supabase realtime on `tenant_module_entitlements`, or refetch-on-focus). Replaces reliance on the three independent caches (coordinated invalidation).

### 3.9 Approaches considered (and why this one)
- **Approach 1 — Client-only (wrap routes/nav in existing FeatureRoute, wire plan→feature_flags).** Fast, low-risk, but **cannot** satisfy "no trace in API/DB/reports" (client dashboards read base tables) and is bypassable. **Rejected as the whole solution** — but its route/nav pieces are reused.
- **Approach 2 — RLS-first with materialized entitlements + manifest (recommended).** Achieves true "no trace," server-authoritative, default-deny, and scales via declarative data. Higher effort (touch many RLS policies) mitigated by a manifest-driven generator + CI check.
- **Approach 3 — Per-module Postgres schemas / physical isolation.** Maximum isolation but massive migration, breaks cross-module FKs (engineers ↔ employees), and doesn't fit a shared-schema multi-tenant app. **Rejected.**

**Recommendation: Approach 2**, delivered in phases, grandfathering existing tenants to full entitlement first, then enforcing progressively behind a master rollout flag.

---

## 4. Database changes required

All via `mcp__supabase__apply_migration` (project `ssmbegiyjivrcwgcqutu`); regenerate `database.types.ts`; use the migration PR template; add manifest entries.

1. **`ALTER TABLE master_modules`** add `is_gateable boolean NOT NULL DEFAULT true`, `feature_flag_key text`. Backfill `is_gateable=false` for `dashboard`, `settings`. Ensure a canonical seed migration exists (today the rows live only in the live DB).
2. **`CREATE TABLE plan_modules`** (§3.2) — global-ish (no tenant_id; references global `subscription_plans`), platform-admin write, authenticated read; index `(plan_id)`.
3. **`CREATE TABLE tenant_module_entitlements`** (§3.3) — tenant-scoped: `tenant_id NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`, RLS enabled+forced, RESTRICTIVE tenant isolation, `set_<table>_tenant_and_audit` trigger, `idx_tenant_module_entitlements_tenant_id`. Writes restricted to platform admin / SECURITY DEFINER refresh fn.
4. **Functions:** `refresh_tenant_module_entitlements(uuid)`, `tenant_module_enabled(text)`, `get_tenant_module_entitlements()`; extend `get_accessible_modules()`.
5. **Triggers:** on `tenant_subscriptions` (AFTER INSERT/UPDATE OF plan_id, status) → refresh that tenant; on `plan_modules` (AFTER INSERT/UPDATE/DELETE) → refresh all tenants on that plan.
6. **RLS predicate rollout:** add `(SELECT tenant_module_enabled('<slug>'))` to every gateable module's table policies. **Phase 1 target = HR/Payroll tables** (see Appendix A): `employees, employee_documents, employee_salary_config, employee_salary_components, employee_salary_structures, employee_loans, loan_repayments, departments, positions, attendance_records, timesheets, leave_balances, leave_requests, salary_components, payroll_settings, payroll_periods, payroll_records, payroll_record_items, payroll_adjustments, payroll_bank_files, performance_reviews, onboarding_checklists, onboarding_checklist_items, onboarding_tasks, recruitment_jobs, recruitment_candidates` + master data `master_leave_types, master_payroll_components`. Also **fix the `USING (true)` SELECT policies** to add a role gate. **Do NOT touch** `onboarding_progress` (product onboarding).
7. **Seed data:** `plan_modules` for the 3 existing plans (Starter/Professional/Enterprise), mapping their `features.modules` arrays to `master_modules` (Enterprise ⇒ all gateable). Backfill `tenant_module_entitlements` for existing tenants (grandfather = all modules; see §9).
8. **Optional:** a `platform_module_overrides`/`tenant_module_entitlements.source='override'` path for per-tenant exceptions.

---

## 5. Backend implementation strategy

1. Ship the schema + functions + triggers (Phase 1), all **additive**, entitlements populated but **not yet referenced by RLS** (shadow).
2. Add a **`get_effective_module_denials(tenant_id)`** diagnostic + logging so we can observe what *would* be denied before enforcing (shadow mode).
3. Add the RLS predicate **table-by-table**, HR/payroll first, each behind the master rollout flag (`tenant_module_enabled` returns TRUE for everyone until the plan_modules/entitlements are seeded — so grandfathering is what makes this safe).
4. Keep every helper `STABLE SECURITY DEFINER` with pinned `search_path`, scalar-sub-select call sites, and OR-chains cheapest-first (free column checks before helper InitPlans) per CLAUDE.md.
5. Refactor `featureGateService` to stop reading `tenant_id` from `localStorage` (use the authenticated session/tenant), and to require `status ∈ {active,trialing}` (reuse `isSubscriptionEntitled`).
6. Provisioning: `provision-tenant` calls `refresh_tenant_module_entitlements` after setting `plan_id`; PayPal subscription create/cancel/webhook do the same on status change.

---

## 6. Frontend implementation strategy

1. **`EntitlementsContext`** (§3.8) — load once, expose `isModuleEnabled(slug)`; wire realtime/refetch invalidation.
2. **Route tree from manifest** — filter route definitions by entitlement so excluded modules produce no route/chunk; add `<RequireModule slug>` as defense-in-depth (generalize/retire the single-use `FeatureRoute`). Apply to HR/payroll first, then business/resources/financial groups (closing G6 broadly).
3. **Navigation** — `navConfig` section/item gates call `isModuleEnabled` (server truth) in addition to `hasModuleAccess`; owner/admin no longer bypass module gating. Reuse for `MobileNavDrawer`.
4. **Command palette** — `buildCommands` already takes the gate context; add `isModuleEnabled`; make the "recents" query module-aware.
5. **Breadcrumbs / labels** — drive `routeLabels`/`sectionLabels` from the manifest and skip excluded modules.
6. **Dashboard / quick actions** — gate any module-scoped widget by `isModuleEnabled` (no HR widgets today, but future-proof; the pattern is set).
7. **Settings → Features** (`FeaturesSettings.tsx`) — only show workflow toggles for **entitled** modules; the module-level `nav.*` toggles become read-only/derived (tenant can't self-enable a non-entitled module).
8. **Plans admin UI** (`PlanDetailPage`, new `PlanModulesTab`) — checkbox grid bound to `master_modules` writing `plan_modules`.
9. **Import/Export** — hide the `hr` WorkbookDomain when HR is not entitled.
10. A shared **"Not available on your plan"** surface for any defense-in-depth redirect (worded to avoid revealing module internals — §14).

---

## 7. Event and background job changes

- **Events:** extend `emit_notification_event` (or the two dispatch triggers) to look up the module for an `event_type` (manifest `eventTypePrefixes`) and **skip** emission/dispatch when `tenant_module_enabled` is false. No HR events exist today, so this is future-proofing + a guard so the first `payroll.*`/`leave.*` event can't leak.
- **Cron:** any job that iterates tenants for module-scoped work (template: `process_time_based_events`) filters tenants by entitlement. Register each job's module in the manifest (`cronTags`).
- **Existing financial/stock/quote events** stay as-is unless/until those modules become gateable — but the guard is uniform once added.

---

## 8. API and permission changes

- **RLS is the API gate** (PostgREST): §4.6 predicates make `GET /rest/v1/payroll_records` return `[]` and reject writes for excluded tenants — the "no trace in API responses" requirement.
- **RPCs:** module-scoped RPCs (and any future HR stat RPC) check `tenant_module_enabled`; `get_accessible_modules` intersects with entitlements so the RBAC admin UI and `hasModuleAccess` reflect the plan.
- **Permissions composition:** effective module visibility = **plan entitlement (outer, default-deny)** ∧ **role grant (`role_module_permissions`)** ∧ optional tenant workflow toggle. Plan sits *above* role; owner/admin bypass applies only to the role layer, never to entitlement.
- **RBAC UI** (`RolePermissions.tsx`): show only entitled modules as grantable; a role can never be granted a non-entitled module.

---

## 9. Migration strategy for existing tenants

Data volume is tiny (2 tenants, 0 subscriptions), so risk is low, but the **default-deny flip is a behavior change** and must be grandfathered:

1. **Backfill subscriptions:** create a `tenant_subscriptions` row for each existing tenant (status `active`) pointing at an appropriate plan, or a one-off **`grandfather`/internal plan that includes all modules**.
2. **Seed `plan_modules`** for the 3 real plans (map `features.modules` → `master_modules`; Enterprise ⇒ all gateable).
3. **Backfill `tenant_module_entitlements`** with `source='grandfather'`, all gateable modules `enabled=true`, for every existing tenant — so enabling RLS predicates changes nothing until an admin deliberately tightens a plan.
4. **`role_module_permissions` is empty** — orthogonal; seed sensible per-role defaults (or leave, since RBAC is a separate concern). Note: with 0 rows, non-admin roles currently see nothing — worth addressing as part of the same release.
5. All steps **additive and reversible**; keep the `feature_flags` values intact (they remain the intra-module workflow layer).

---

## 10. Testing strategy (unit, integration, E2E, multi-tenant)

- **Unit (Vitest):** entitlement resolution (plan∩override), **default-deny** when no row, platform-admin bypass, portal-session exemption, manifest↔`master_modules` parity, `isModuleEnabled` composition with role/workflow layers.
- **DB/RLS (SQL harness, like `scripts/check-rls-initplan.sql` / statutory fixtures):** as tenant-without-HR, `SELECT` on `employees`/`payroll_records` returns 0 and INSERT is rejected; as tenant-with-HR it works; platform admin unaffected; InitPlan wrapping verified (no per-row helper eval). Add a CI gate asserting every gateable module table carries the predicate.
- **Integration:** plan edit (`plan_modules`) → trigger → `tenant_module_entitlements` refreshed for all affected tenants; subscription status change → refresh; provisioning seeds entitlements.
- **E2E (Playwright, Chromium preinstalled):** two tenants — A (HR entitled), B (not). For B assert **no trace**: sidebar/mobile-nav, `/hr`+`/payroll`+`/leave` deep-links redirect, command palette, breadcrumbs, dashboard, global search, and a raw `fetch` to `/rest/v1/payroll_records` returns `[]`. Toggle B's plan to include HR → everything appears after refresh. For A assert full function.
- **Multi-tenant isolation:** entitlements never leak across tenants (cache keyed by tenant; RLS RESTRICTIVE); impersonation retains platform-admin access.
- **Migration replay:** grandfather backfill leaves existing tenants fully functional.

---

## 11. Rollout strategy with minimal risk

Behind a master rollout flag (`tenants.feature_flags->>'module_entitlements_enforced'`, default false, or a system setting):
1. **Ship schema + functions + triggers + seed + grandfather backfill** (no behavior change; entitlements = all-on for existing tenants).
2. **Shadow mode:** log intended denials for N days; verify no false denials for grandfathered tenants.
3. **Enforce UI layers first** (routes/nav/palette/breadcrumbs) for opt-in tenants — reversible, no data risk.
4. **Enforce RLS** table group by table group (HR/payroll first), monitoring for regressions; `tenant_module_enabled` returning TRUE for grandfathered/all-entitled tenants means this is safe.
5. **Enable the Super Admin Plans → Modules UI** and let it drive real per-plan tightening.
6. **Retire** the partial `FeatureRoute`/`nav.financial` special-case in favor of the general `RequireModule` + manifest.
Each step is independently revertible (flip the flag / drop a predicate).

---

## 12. Potential edge cases and failure scenarios

- **Platform-admin impersonation / plan editing** — must retain module access (helper returns TRUE for platform admins) or admins lock themselves out.
- **Owner downgraded below their current module** — intended to hide it; surface a clear billing prompt, don't hard-error mid-action.
- **Trial/expired/past-due subscription** — entitlements from `status ∈ {active,trialing}` only; define grace behavior.
- **Plan deleted / tenant with no subscription** — fall back to a defined default (deny gateable, or a base plan); provisioning must always create a subscription.
- **New module added to catalog** — default-deny means nobody gets it until `plan_modules` is updated (safe, intentional).
- **Cross-module references** — a `case_devices`/`case_engineers` row referencing an `employees` engineer when HR is excluded: reads that JOIN/embed HR tables must degrade (the HR side returns nothing under RLS); audit case/engineer queries that embed employee data.
- **Portal customers** — no `profiles.role`; gating keyed on staff role/tenant must short-circuit (portal already separate).
- **Mid-session plan change** — realtime/refetch invalidation, else changes apply next load (document the SLA).
- **In-flight background job / queued event** when a module is disabled — guard at execution time, not just enqueue.
- **Reports/exports that JOIN HR tables** — covered by RLS returning empty, but verify no NULL-explosion or divide-by-zero in aggregates.
- **`feature_flags` self-service** re-enabling `nav.hr` — must be subordinate to entitlement (tenant can't override the plan).

---

## 13. Performance considerations

- **Materialized entitlements + `INDEX (tenant_id)`** → O(1) RLS lookups; avoid per-request plan joins.
- **InitPlan discipline** (CLAUDE.md): every `tenant_module_enabled` call in a policy is a scalar sub-select so it InitPlans once per query, not per row (the documented 642 ms → 4 ms, ~156× lesson). OR-chains cheapest-first.
- **One client fetch** of entitlements per session (with tenant config); one cache, coordinated invalidation — removes today's three-cache incoherence.
- **Manifest-filtered route tree** avoids loading excluded modules' JS chunks (smaller effective bundle for restricted tenants).
- At 10k+ tenants, `refresh_tenant_module_entitlements` on a `plan_modules` edit is a batched UPDATE over that plan's tenants — bounded and indexable; consider async/queued refresh if a plan has very many tenants.
- Measure RLS overhead per policy add; if hot HR tables show cost, cache the entitlement in a transaction-local GUC set once per request.

---

## 14. Security considerations

- **Default-DENY** for gateable modules — the inverse of today's fail-open. Missing entitlement = no access.
- **RLS is the authoritative boundary**, not the client — satisfies "no trace in API responses / DB queries / reports."
- **Least-disclosure:** excluded module routes 404/redirect and API returns empty — avoid 403s that confirm a hidden module exists ("as if never installed").
- **Tenant cannot self-grant** beyond the plan (Features settings constrained to entitled modules; `feature_flags` subordinate to entitlement).
- **Platform-admin bypass tightly scoped** (only `is_platform_admin()`), audited.
- **Audit** entitlement and `plan_modules` changes (`log_audit_trail`); entitlements table append-friendly/audited.
- **No leakage via cross-module joins/embeds** — verify PostgREST embeds and RPCs that touch HR tables respect the new predicates.
- Keep RLS RESTRICTIVE tenant isolation intact; the new predicate is **ANDed**, never replaces tenant isolation.

---

## 15. Future scalability (hundreds of modules, tens of thousands of tenants)

- **Data-defined modules:** a module is a `master_modules` row + a manifest entry + `plan_modules` inclusions — **no code/architecture change** to add the 200th module. The manifest is the single declaration that all gating layers consume.
- **Materialized, indexed entitlements** scale horizontally with tenants; reads are O(1); refreshes are bounded batch writes.
- **CI enforcement** (a `check-module-rls.sql` gate, analogous to the existing schema-discipline gates) guarantees every new gateable module's tables carry the predicate — so coverage can't rot as modules multiply.
- **Uniform patterns** for RLS, routes, nav, events, jobs, search, import/export mean each new module is gated everywhere by construction.
- **Plan authoring** stays a Super-Admin data task (checkbox grid), independent of tenant count.
- Optional later: entitlement snapshots/rollups, per-region sharding, and async refresh queues if a single plan spans tens of thousands of tenants — all additive, none required for the core design.

---

## Appendix A — HRMS/Payroll affected-areas checklist (the concrete "no trace" surface)

**Routes** (`App.tsx:226-248`, +`HR_ROLES` L44): `/hr`, `/hr/employees`, `/hr/employees/:id`, `/hr/recruitment`, `/hr/onboarding`, `/hr/performance`, `/payroll`, `/payroll/process`, `/payroll/components`, `/payroll/history`, `/payroll/periods/:id`, `/payroll/adjustments`, `/payroll/loans`, `/payroll/settings`, `/attendance`, `/leave`, `/timesheets`.
**Pages:** `src/pages/hr/*` (6), `src/pages/payroll/*` (8 incl. `currencyOptions.ts`), `src/pages/employee-management/*` (3 incl. `workWeek.ts`).
**Components:** `src/components/payroll/*` (4), `src/components/performance/ReviewFormModal.tsx`, `src/components/recruitment/*` (2), `src/components/onboarding/{AssignChecklistModal,ChecklistFormModal}.tsx` (**only these two** — keep `OnboardingWizard.tsx`).
**Services:** `payrollService.ts`, `payrollBase.ts`, `leaveService.ts`, `timesheetService.ts`, `recruitmentService.ts`, `performanceService.ts`, `employeeOnboardingService.ts`.
**Nav:** `navConfig.ts` sections `hr` (151-164), `payroll` (165-180), `employee` (181-192); `moduleMapping.ts` L24-38.
**Query keys:** `queryKeys.ts` `payrollKeys` (214-243), `leaveKeys` (274-282), `timesheetKeys` (284-291), `recruitmentKeys` (293-302), `employeeOnboardingKeys` (304-312), `performanceKeys` (314-321).
**Tables (26 + 2 master):** `attendance_records, departments, positions, employees, employee_documents, employee_loans, employee_salary_components, employee_salary_config, employee_salary_structures, loan_repayments, leave_balances, leave_requests, salary_components, payroll_settings, payroll_periods, payroll_records, payroll_record_items, payroll_adjustments, payroll_bank_files, performance_reviews, onboarding_checklists, onboarding_checklist_items, onboarding_tasks, recruitment_jobs, recruitment_candidates, timesheets` + `master_leave_types, master_payroll_components`. **Keep `onboarding_progress`.**
**Permissions:** role `hr` (`src/types/roles.ts`), module slugs `hr-dashboard, employees, recruitment, onboarding, performance, payroll-dashboard, process-payroll, salary-components, payroll-history, attendance, leave, timesheets`.
**Import/Export:** `hr` WorkbookDomain in `workbookContract.ts` (+ `importValidator.ts`, `ImportExportCenter.tsx`).
**Reports/events/jobs:** none HR today (net-new guards are future-proofing).
**Fastest chokepoints:** (1) the RLS predicate on the tables above (the only true "no trace" lever); (2) manifest-filtered route tree; (3) `nav.hr`/entitlement nav gate; (4) `hr` WorkbookDomain filter.

---

## Appendix B — Key files index
`src/lib/features/registry.ts`, `resolveFeatures.ts`, `src/lib/tenantConfigService.ts`, `src/contexts/TenantConfigContext.tsx`, `src/lib/tenantFeaturesService.ts`, `src/pages/settings/FeaturesSettings.tsx`, `src/components/FeatureRoute.tsx`, `src/components/layout/{navConfig.ts,Sidebar.tsx,ProtectedSidebarNavItem.tsx,MobileNavDrawer.tsx}`, `src/lib/moduleMapping.ts`, `src/contexts/PermissionsContext.tsx`, `src/lib/rolePermissionsService.ts`, `src/pages/admin/RolePermissions.tsx`, `src/lib/featureGateService.ts`, `src/hooks/useFeatureGate.ts`, `src/lib/billingService.ts`, `src/pages/platform-admin/{PlansManagementPage.tsx,PlanDetailPage.tsx}`, `src/components/platform-admin/plans/PlanFeatureFormModal.tsx`, `src/components/shared/{CommandPalette.tsx,commandPaletteRegistry.ts}`, `src/components/layout/AppLayout.tsx`, `src/App.tsx`, `src/lib/dataMigration/workbookContract.ts`, `supabase/functions/provision-tenant/index.ts`, `supabase/migrations/20260409000000_baseline_schema.sql` (tables ~2079/2923, RPCs 5271/5482, role helpers 5702-5810), `docs/tenant-feature-management.md`.
