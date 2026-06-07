# Tenant Feature Management

Per-tenant enable/disable of UI features (case tabs, navigation, dashboard widgets,
workflow-stage pipeline, customer portal, automation) controlled by tenant admins
from **Settings → Features & Modules**.

This is a **workflow/visibility** layer, NOT a security boundary. Tenant isolation
(RESTRICTIVE RLS) and role permissions remain authoritative. It is also distinct from
**subscription/plan entitlements** (`src/lib/featureGateService.ts` + `useFeature` in
`src/hooks/useFeatureGate.ts`), which gate by what a tenant has *paid for*.

## How it works

- **Registry** (`src/lib/features/registry.ts`) — the single source of truth: every
  toggleable feature with its `key`, `label`, `category`, `defaultEnabled`, `dependsOn`,
  and surface binding (`caseTabId` / `stagePhase` / `routes`). Add a feature = add one entry.
- **Resolver** (`src/lib/features/resolveFeatures.ts`) — pure `override ?? default`, with
  core-forced-on and a dependency cascade. Unknown keys resolve **enabled** (never hide a
  surface for an unrecognised key).
- **Storage** — `tenants.feature_flags jsonb` holds only the *overrides*. Empty `{}` ⇒ every
  feature at its registry default (on) ⇒ existing tenants are unaffected (backward compatible).
- **Runtime** — flags load with the existing tenant config (`tenantConfigService` → 5-min cache
  → `TenantConfigContext`). Consume via `useTenantFeature(key)` / `useTenantFeatures()`.
- **Mutation** — `src/lib/tenantFeaturesService.ts` `updateTenantFeatureFlags(tenantId, flags)`
  then `refreshConfig()` (mirrors the theme system).

## ⚠️ Pending migration (apply when ready — "build code now, migrate later")

The code is written against `tenants.feature_flags`, but the migration is **not yet applied**
(to avoid re-breaking the `schema-drift` check on the other open PRs against the shared DB).
Until it is applied, reads degrade gracefully to `{}` (all features on) and saves from the
Settings page will error.

Apply via `mcp__supabase__apply_migration` (name e.g. `add_tenants_feature_flags`):

```sql
-- 1) Per-tenant feature overrides (override-only; default '{}' = all registry defaults)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Server-side check for the one real access surface (Customer Portal).
--    Defaults to TRUE when a key is absent (backward compatible).
CREATE OR REPLACE FUNCTION tenant_feature_enabled(p_tenant_id uuid, p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((feature_flags ->> p_key)::boolean, true)
  FROM tenants
  WHERE id = p_tenant_id;
$$;
```

### After applying
1. Regenerate types: `mcp__supabase__generate_typescript_types` → `src/types/database.types.ts`.
2. Update `supabase/migrations.manifest.md`.
3. Remove the temporary casts (search for `feature_flags` in `tenantConfigService.ts` and
   `tenantFeaturesService.ts`) and use the typed column.
4. Verify `schema-drift` is clean and run the end-to-end checks in the plan's Verification section.

No `DROP`/`DELETE`; additive and reversible.
