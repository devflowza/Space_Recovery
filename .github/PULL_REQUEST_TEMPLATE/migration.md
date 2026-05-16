## Migration summary
One sentence describing the schema change and motivation.

## Classification
- [ ] Additive (new tables/columns/indexes/policies)
- [ ] Conditional rename (justify why expand-contract is not needed)
- [ ] Expand-Contract PR 1 (writes both, callers read new)
- [ ] Expand-Contract PR 2 (drops old)
- [ ] RLS-only change

## Migration filename
`<timestamp>_<description>.sql` — applied via `mcp__supabase__apply_migration`

## Blast radius
Files changed:
- src/...

## Tenant-scoped table checklist (if new table)
- [ ] `tenant_id uuid NOT NULL REFERENCES tenants(id)`
- [ ] `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`
- [ ] RESTRICTIVE tenant isolation policy
- [ ] `set_<table>_tenant_and_audit` trigger
- [ ] `idx_<table>_tenant_id` partial index
- [ ] CRUD policies appropriate
- [ ] `deleted_at` column

## Verification (paste actual output)
1. `mcp__supabase__list_tables` for affected tables (post-migration)
2. Representative query returning the new shape
3. Tenant isolation test (query as tenant B for tenant A data — must be 0 rows)
4. Soak window confirmation (PR 2 of expand-contract only)

## Rollback plan
SQL to revert destructive elements, or "additive — no rollback needed".

## Backwards-compat notes
In-flight requests during deploy? External consumers (edge functions, integrations)?
