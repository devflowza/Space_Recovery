# Schema Discipline Cleanup — Design Spec

**Date**: 2026-05-14
**Status**: Approved for implementation
**Author**: dev@flowza.ai (brainstormed with Claude)
**Context**: xSuite SaaS at 1 tenant today, growth imminent. Cleanup is a prerequisite for onboarding tenant #2.

---

## 1. Goals, Non-Goals, Scope

### 1.1 Goals

1. Drive `tsc --noEmit -p tsconfig.app.json` to **zero errors** and keep it there permanently.
2. Make generated `src/types/database.types.ts` the **single source of truth** for the frontend ↔ DB contract.
3. Eliminate every stale schema reference (tables, columns, functions, enums) from `src/`.
4. **Codify and machine-enforce** the naming standards — not just document them.
5. Every future migration ships atomically: SQL + regenerated types + all caller updates in one PR.

### 1.2 Non-goals (YAGNI)

- Not redesigning the schema. v1.0.0 naming conventions stay as-is.
- Not introducing repository-pattern or other abstractions over Supabase.
- Not adding new features, domains, permission tiers, or tenant configs.
- Not touching PDFs, charts, or theme system.
- Not changing the multi-tenancy model. RLS + RESTRICTIVE tenant isolation stays.
- Not adding broad test coverage; only verification tests for the new CI gates.

### 1.3 Scope

| In-scope | Out-of-scope |
|---|---|
| Fix every `tsc` error reachable from `tsconfig.app.json` | Errors from server-only / edge function code (separate tsconfig) |
| Delete `CloneDriveModal.tsx` and other dead-code drift | Refactoring living modules touched incidentally |
| Update every PostgREST `from()`/embed/column reference | Schema changes |
| Add CI guardrails: tsc gate, schema-drift detector, ESLint rule, tenant-table requirements, migration manifest, `.from()` allowlist | Migrating to another ORM |
| Codify naming standard in CLAUDE.md + `.eslintrc` | Writing a separate developer handbook |
| Migration discipline doc (PR template + checklist) | Reorganizing folder structure |

### 1.4 Definition of done

- `npm run typecheck` exits 0 on `main`.
- Six required-status CI checks active: `tsc-zero`, `schema-drift`, `lint`, `tenant-table-requirements`, `migration-manifest`, `from-table-names`.
- Migration PR template exists, referenced from CLAUDE.md.
- No `src/` file contains a bare-legacy-name `.from(...)` or imports from `src/types/database.ts`.
- Tag `v1.1.0-schema-discipline` on the merge commit.

### 1.5 Business prerequisite

**Tenant #2 onboarding is gated on Phase 6 completion.** This work is load-bearing for SaaS scale, not optional cleanup.

---

## 2. Naming Standards & Banned Names

### 2.1 Table naming convention

Every table follows one of two forms:

| Form | Pattern | Examples |
|---|---|---|
| Domain-root (singular concept, one per domain) | `<domain>s` | `cases`, `customers_enhanced`, `companies`, `invoices`, `quotes`, `payments`, `suppliers`, `employees`, `assets`, `branches`, `templates`, `tenants`, `profiles` |
| Domain-scoped (subordinate) | `<domain>_<thing>` | `case_devices`, `invoice_line_items`, `payment_allocations`, `employee_loans` |

Six **global namespaces** prepend an additional prefix:

| Prefix | Meaning | Tenant-scoped? | Write access |
|---|---|---|---|
| `geo_*` | Geography reference data | No | platform admin only |
| `catalog_*` | Product/service catalogs | No | platform admin only |
| `master_*` | Lookup/reference data | No | platform admin only |
| `system_*` | System configuration | No | platform admin only |
| `platform_*` | Platform admin tables | No | platform admin only |
| `tenant_*` | Tenant management | No | platform admin only |

All other tables are tenant-scoped: must have `tenant_id NOT NULL`, RESTRICTIVE RLS isolation, and `set_<table>_tenant_and_audit` trigger.

### 2.2 Banned legacy names (must not appear in `src/`)

**Catalog drift** (add `catalog_` prefix): `device_types`, `device_brands`, `brands`, `device_capacities`, `capacities`, `device_conditions`, `device_encryption`, `device_form_factors`, `device_made_in`, `device_head_counts`, `device_platter_counts`, `device_roles`, `device_component_statuses`, `interfaces`, `accessories`, `service_types`, `service_locations`, `service_problems`, `service_categories`, `service_line_items`, `donor_compatibility_matrix`

**Master drift** (add `master_` prefix): `industries`, `currency_codes`, `case_priorities`, `case_statuses`, `case_report_templates`, `invoice_statuses`, `quote_statuses`, `purchase_order_statuses`, `payment_methods`, `expense_categories`, `transaction_categories`, `leave_types`, `payroll_components`, `inventory_categories`, `inventory_condition_types`, `inventory_item_categories`, `inventory_status_types`, `supplier_categories`, `supplier_payment_terms`, `template_categories`, `template_types`, `template_variables`, `modules`

**Geo drift** (add `geo_` prefix): `countries`, `cities`

### 2.3 Banned column drift (partial; full list in Phase 0 triage)

| Old → New | Tables |
|---|---|
| `serial_no` → `serial_number` | `case_devices`, `resource_clone_drives`, `clone_drives`, inventory items |
| `case_number` → `case_no` | `cases` |
| `task_description` → `description` | `onboarding_tasks` |
| `installments_count` → `installment_amount` | `employee_loans` |
| `installments_paid` → `installments` | `employee_loans` |
| `payment_date` → `repayment_date` | `loan_repayments` |
| `percentage_of` → `percentage` | `salary_components` |
| `review_period_start/end` → `review_period` | `performance_reviews` |
| `condition_type_id` → `condition_id` | `inventory_items` |

### 2.4 Type-import rules

- Import `Database` from `src/types/database.types.ts` only.
- `src/types/database.ts` is banned. Delete in Phase 6 once no callers remain.

### 2.5 Query-shape rules

| Rule | Rationale |
|---|---|
| `.maybeSingle()` not `.single()` for zero-or-one | Already in CLAUDE.md |
| PostgREST embeds use full target table names; use `<table>!<fk>` hint only when the source has multiple FKs to that target | Hint syntax fragile to drift |
| Write to `customers_enhanced` directly; `customers` is a read view | Already in CLAUDE.md |
| `select('*')` allowed but discouraged; explicit column lists preferred for precise typing | Pins the contract; surfaces TS2339 on drift |
| Tenant-scoped inserts may omit `tenant_id` — the trigger populates it. New tenant-scoped tables MUST have the trigger | Fixes the `customer_company_relationships` failure mode |

---

## 3. Triage Approach

### 3.1 Bucket classification

Every error gets exactly one bucket.

| Bucket | Signal | Fix pattern | Risk |
|---|---|---|---|
| **B1** — Single-root-cause cluster | Many errors in one file or pattern, one upstream cause | Fix root, errors evaporate | Low |
| **B2** — Stale embed/query string | `SelectQueryError<"column 'X' does not exist...">` in type | Update query string; verify against live DB | Medium |
| **B3** — Stale column read | TS2339 or TS2551 on a row object | Rename consumer reads OR update query | Low |
| **B4** — Stale insert/update keys | TS2353 on `.insert({...})` / `.update({...})` | Rename keys; check for dropped columns | Medium |
| **B5** — Real type bug | TS18047 (null), TS2322 (incompatible), etc. — actual bugs not drift | Fix properly with null check / narrow / contract change | Variable |
| **B6** — Unused declarations | TS6133 | Delete unused import/var | Low |
| **B7** — Dead code | Whole file refs non-existent tables, no live consumers | Delete file | Low |
| **B8** — Long tail | Anything else | Triage individually | Variable |

### 3.2 Triage worksheet

Committed to `docs/superpowers/specs/2026-05-14-triage.md` after Phase 0:

| Column | Source |
|---|---|
| `file` | Files emitting errors |
| `error_count` | `grep -c "^<file>(" tsc.out` |
| `bucket` | Manual classification |
| `root_cause_note` | One sentence |
| `estimated_minutes` | Per-bucket heuristic |
| `status` | `todo` / `wip` / `done` |
| `pr` | Filled when in-flight |

### 3.3 Bucket assignment heuristic

For each top-30 file (~54% of errors), spend 2-3 min reading first 5 errors. Match the signal column above. Files outside top-30 use error-code distribution.

### 3.4 Predicted bucket distribution

| Bucket | Predicted count | % of total |
|---|---|---|
| B1 | ~500-700 | ~20% |
| B2 | ~600-800 | ~22% |
| B3 | ~700-900 | ~26% |
| B4 | ~50-100 | ~3% |
| B5 | ~200-400 | ~10% |
| B6 | 303 | 10% |
| B7 | ~50-150 | ~3% |
| B8 | ~200-400 | ~6% |

### 3.5 Parallelization

Most fixes are file-local and independent — natural fit for `superpowers:dispatching-parallel-agents`. Coordinator process tracks PR queue, re-runs `tsc` after each merge, rejects PRs that don't drop the baseline.

B1 root-cause clusters (where one fix affects many files) are serial.

### 3.6 Per-bucket verification

| Bucket | Verification |
|---|---|
| B1 | tsc count drops as expected; build passes |
| B2 | Run actual query against live DB via MCP; confirm shape |
| B3 | Same as B2 + visual smoke test if UI |
| B4 | Insert via form, confirm 200 not 403/400 |
| B5 | Manual test of relevant path |
| B6 | tsc drops by exact count of unused decls |
| B7 | App builds; no broken imports |

---

## 4. Phased Execution

### Phase 0 — Triage (1-2 days)

1. Snapshot baseline: `npx tsc --noEmit -p tsconfig.app.json 2>&1 > docs/superpowers/specs/2026-05-14-tsc-baseline.txt`; record line count.
2. Generate triage worksheet covering 100% of error-emitting files.
3. Classify top-30 files manually.
4. Spot-check 10 random files outside top-30 to validate predictions.

**Exit**: worksheet committed; top-30 each have bucket + root cause; total predicted effort summed.

**Risk**: B5 materially worse than predicted (>25%). **Response**: pause; downgrade target to "ratchet at end-of-cleanup count" (Approach A end-state).

### Phase 1 — Install ratchet gate (0.5 day)

Critical to install early so codebase can't slide upward during cleanup.

1. Create `.github/workflows/ci.yml` with `typecheck` job.
2. Script `scripts/check-tsc.sh` (ratchet form — see §6.2).
3. Wire to PR required checks.
4. Downward-only: every `main`-branch merge that reduces count updates baseline.

**Exit**: deliberate test PR that adds a TS error fails CI.

### Phase 2 — Dead code (B7, 1 day)

1. Delete `CloneDriveModal.tsx` (already confirmed broken end-to-end — queries non-existent columns on `resource_clone_drives`; no live FK relationships).
2. Delete other B7 files from triage. Verify no live imports via grep including route configs.
3. Single atomic PR; re-run tsc, count drops as predicted.

### Phase 3 — Single-root-cause clusters (B1, 2-3 days)

Sequential — these touch shared types.

1. **`App.tsx` lazy-import pattern** (85 errors): fix the lazy wrapper once.
2. **Document component shared type** (~200 errors across `InvoiceDocument`, `ReportDocument`, `QuoteDocument`, `PaymentReceiptDocument`, plus `pdf/documents/*` counterparts): fix shared type.
3. **`stockService.ts`** (222 errors): time-box at one day. If not resolved: isolate working parts, reclassify dead parts to B7, defer remainder to B8.

**Exit**: each cluster a separate PR; baseline drops as predicted; affected screens smoke-tested.

### Phase 4 — Schema-drift sweep (B2/B3/B4, 3-5 days, max parallelization)

Use `superpowers:dispatching-parallel-agents`. One agent per top-30 file, dispatched in batches of 8-12 concurrent agents (adjust based on environment capacity and rate limits — 8 is the recommended floor for a small environment). Each agent receives: file path, bucket, errors, root cause, live schema (via MCP), instructions to fix bucket pattern + verify query against live DB + open PR.

Coordinator: tracks queue, validates each merge drops baseline, rejects non-conforming PRs, re-dispatches on failure.

**Order within sweep**:
1. B4 first (likely runtime bugs hitting users today).
2. B2 next (each fix unblocks many downstream B3 errors).
3. B3 last (mechanical rename sweeps).

**Exit**: all top-30 (minus B1/B7 already done) processed; baseline below ~500; live-DB verification recorded in every PR.

### Phase 5 — Long tail (B5/B6/B8, 2-3 days)

1. B6 unused decls (303): `eslint --fix` if possible, manual otherwise. Single PR.
2. B5 real bugs: case-by-case via `systematic-debugging`. No `// @ts-ignore`, no `any` casts, no `!` dodges. Product-decision bugs carve out to follow-up issues; cleanup commits only to typing fixes.
3. B8 remaining: 1-3 line fixes per file.

**Exit**: `tsc --noEmit` exits 0. Baseline file deleted.

### Phase 6 — Final lock-in (0.5 day)

1. Flip tsc CI from ratchet to "must equal 0."
2. Install schema-drift detector (§6.3).
3. Install ESLint banned-names rule (§6.4).
4. Install tenant-table-requirements assertion (§6.5).
5. Install migration-manifest check (§6.6).
6. Install `.from()` allowlist check (§6.7).
7. Delete `src/types/database.ts`.
8. Update CLAUDE.md to reference new standards and gates.
9. Commit migration PR template.
10. Tag commit `v1.1.0-schema-discipline`.

**Exit**: six required-status checks active; deliberate test PR violating each fails CI (fire drills, §7.2).

### Phase tally

| Phase | Solo dev | With parallel agents |
|---|---|---|
| 0 | 1-2 days | 1 day |
| 1 | 0.5 day | 0.5 day |
| 2 | 1 day | 0.5 day |
| 3 | 2-3 days | 2-3 days |
| 4 | 3-5 days | 1-2 days |
| 5 | 2-3 days | 1-2 days |
| 6 | 0.5 day | 0.5 day |
| **Total** | **10-15 days** | **6-9 days** |

### Branch strategy

- Each PR is small (~50 lines median), single-file or single-cluster, short-lived.
- No long-lived "cleanup branch."
- Cleanup PRs branch prefix `cleanup/<bucket>-<file>`; title `[cleanup B<n>]`.
- Phase boundaries are merge boundaries — don't start Phase 4 until Phase 3 merged.
- **Tenant #2 onboarding paused until Phase 6 tagged.**

---

## 5. Migration Discipline

### 5.1 Atomicity rule (the hard contract)

Every migration PR must contain in a single commit-set:

1. Migration SQL (applied via `mcp__supabase__apply_migration`).
2. Regenerated `src/types/database.types.ts`.
3. Every caller updated.
4. `npm run typecheck` exits 0.
5. Schema-drift CI detector passes.
6. PR description following template (§5.7).

Missing any = invalid PR.

### 5.2 Migration patterns

| Pattern | Allowed? |
|---|---|
| Additive (`ADD COLUMN`, `CREATE TABLE`, indexes, policies) | Yes |
| Direct rename (`ALTER TABLE ... RENAME`) | Conditional — instantaneous deploy + no in-flight writes + all callers in same PR. During the cleanup window at 1 tenant, this is the default. After Phase 6 ships and tenants grow, expand-contract becomes default. |
| `DROP COLUMN` / `DROP TABLE` | Conditional — must follow expand-contract |
| Hard delete (`DELETE FROM`) | **Forbidden**. Use `deleted_at`. |
| Add `NOT NULL` column to populated table | Conditional — add nullable + default + backfill, then enforce in second migration |
| Incompatible type change | Conditional — data migration plan + expand-contract |
| New tenant-scoped table | Yes, with all 7 elements (§5.4) |
| Modify function/trigger | Yes — include smoke test output in PR |
| Touch RLS policies | Yes — include isolation test |

### 5.3 Expand-Contract pattern

Default for renames/drops on tables with existing data after Phase 6:

1. **Expand PR 1**: Add new + keep old. Trigger or generated column mirrors writes. Callers updated to read new. Writes hit both. Soak 24-48h.
2. **Contract PR 2**: Remove trigger. Drop old. Authored same day as PR 1, scheduled for after soak.

**During cleanup at 1 tenant**: direct rename allowed with explicit "this is safe at 1 tenant during maintenance window" justification in PR description.

### 5.4 New tenant-scoped table — 7 required elements

1. `tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
2. `created_at`, `updated_at`, `deleted_at` columns with correct defaults
3. `CREATE INDEX idx_<table>_tenant_id ON <table>(tenant_id) WHERE deleted_at IS NULL`
4. `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`
5. RESTRICTIVE tenant isolation policy
6. CRUD permissive policies appropriate to the table
7. `set_<table>_tenant_and_audit` trigger

CI assertion (G4 in §6.5) verifies elements 4-7 on every PR.

### 5.5 Pre-flight checklist

1. **Blast radius**: `grep -rn "<table_or_column>" src/` — every hit needs review.
2. **Classify**: additive / conditional / destructive.
3. **Active feature PRs**: scan open PRs for collisions.
4. **RLS implications**: write isolation test plan now.
5. **Number-sequence check**: `get_next_number` aware of new table?

### 5.6 Verification protocol

Every migration PR description must include actual output of:

1. `mcp__supabase__list_tables` for affected tables post-migration.
2. Sample query returning the new shape.
3. Tenant isolation test (query as tenant B for tenant A data → 0 rows).
4. Contract phase: soak window confirmation.

### 5.7 Migration PR template

Lives at `.github/PULL_REQUEST_TEMPLATE/migration.md` (selectable via PR template chooser). Template body:

```markdown
## Migration summary
One sentence.

## Classification
- [ ] Additive
- [ ] Conditional rename (justify why not expand-contract)
- [ ] Expand-Contract PR 1
- [ ] Expand-Contract PR 2
- [ ] RLS-only change

## Migration filename
`<timestamp>_<description>.sql`

## Blast radius
- src/...
- src/...

## Tenant-scoped table checklist (if new table)
- [ ] tenant_id NOT NULL REFERENCES tenants
- [ ] RLS enabled + forced
- [ ] RESTRICTIVE tenant isolation policy
- [ ] set_<table>_tenant_and_audit trigger
- [ ] idx_<table>_tenant_id index
- [ ] CRUD policies appropriate
- [ ] deleted_at column

## Verification
Paste output of:
1. `mcp__supabase__list_tables` for affected tables
2. Representative query
3. Tenant isolation test
4. Soak confirmation (PR 2 only)

## Rollback plan
SQL to revert destructive elements.

## Backwards-compat notes
In-flight requests? External consumers (edge functions, integrations)?
```

### 5.8 Migration manifest

`supabase/migrations.manifest.md` — committed audit trail: timestamp, filename, PR, summary, classification. CI assertion (G5) verifies every applied migration appears.

### 5.9 Rollback strategy

For destructive elements, rollback SQL must be in PR description. In practice, prefer forward-fix: revert code PR, leave schema additive, fix forward.

Acceptable destructive-rollback triggers: site down >5 min directly due to migration; data integrity violation; constraint violation blocking >1% of legitimate writes.

### 5.10 Author ownership

The migrating developer owns:
- Blast-radius check
- Verification block
- First 24h post-deploy
- Contract PR if expand-contract (opened same day as Expand, scheduled to merge after soak)

If unavailable for Contract PR, explicit named handoff in Expand PR description.

### 5.11 Apply NOW (not just at Phase 6)

Any migration during the cleanup window follows these rules effective immediately. Don't add fresh drift while cleaning old drift.

---

## 6. CI/Lint Guardrails

### 6.1 Catalog

| ID | Name | Catches | Path | Required after |
|---|---|---|---|---|
| G1 | tsc gate | TS errors incl. stale schema refs the generated types see | `scripts/check-tsc.sh` + CI | Phase 1 (ratchet), Phase 6 (zero) |
| G2 | Schema-drift detector | Live DB diverging from committed `database.types.ts` | `scripts/check-schema-drift.sh` | Phase 6 |
| G3 | ESLint banned-names | `.from('<legacy>')` and embed names in `.select(\`...\`)` | `eslint.config.js` + custom rule | Phase 6 |
| G4 | Tenant-table requirements | New tenant-scoped table missing RLS, trigger, or index | `scripts/check-tenant-table-requirements.sql` + wrapper | Phase 6 |
| G5 | Migration manifest | Applied migration missing from manifest | `scripts/check-migration-manifest.sh` | Phase 6 |
| G6 | `.from()` allowlist | `.from('<X>')` where X isn't a real table or compat view | `scripts/check-from-table-names.sh` | Phase 6 |

### 6.2 G1 — tsc gate

**Phase 1 (ratchet)** `scripts/check-tsc.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
BASELINE_FILE="docs/superpowers/specs/tsc-baseline.count"
CURRENT=$(npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "^src/" || true)
BASELINE=$(cat "$BASELINE_FILE")
if [ "$CURRENT" -gt "$BASELINE" ]; then
  echo "FAIL: tsc errors increased ($BASELINE → $CURRENT)"
  exit 1
elif [ "$CURRENT" -lt "$BASELINE" ]; then
  echo "OK: $BASELINE → $CURRENT"
  [ "${GITHUB_REF:-}" = "refs/heads/main" ] && echo "$CURRENT" > "$BASELINE_FILE"
else
  echo "OK: unchanged at $CURRENT"
fi
```

**Phase 6 (zero)**: collapses to `npx tsc --noEmit -p tsconfig.app.json` requiring exit 0. Baseline file deleted.

### 6.3 G2 — Schema-drift detector

`scripts/check-schema-drift.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
PROJECT_ID="ssmbegiyjivrcwgcqutu"
TYPES="src/types/database.types.ts"
TMP=$(mktemp)
npx supabase gen types typescript --project-id "$PROJECT_ID" > "$TMP"
if ! diff -q "$TYPES" "$TMP" > /dev/null; then
  echo "FAIL: $TYPES is stale relative to live schema."
  diff -u "$TYPES" "$TMP" | head -50
  echo "Fix: npx supabase gen types typescript --project-id $PROJECT_ID > $TYPES"
  exit 1
fi
echo "OK: types match live schema"
```

Needs `SUPABASE_ACCESS_TOKEN` in CI.

### 6.4 G3 — ESLint banned-names

`eslint.config.js`:
```js
const BANNED_TABLES = [/* full list from §2.2 */];
module.exports = {
  rules: {
    'no-restricted-syntax': ['error', {
      selector: `CallExpression[callee.property.name='from'][arguments.0.value=/^(${BANNED_TABLES.join('|')})$/]`,
      message: 'Legacy table name. Use catalog_/master_/geo_ prefix. See CLAUDE.md.',
    }],
    'no-restricted-imports': ['error', {
      paths: [
        { name: 'src/types/database', message: 'Use src/types/database.types instead.' },
        { name: '../types/database', message: 'Use ../types/database.types instead.' },
      ],
    }],
    'xsuite/no-banned-embeds-in-select': 'error',
  },
};
```

Custom rule `eslint-rules/no-banned-embeds-in-select.js` (~30 lines) scans `.select(\`...\`)` template literals for banned names.

### 6.5 G4 — Tenant-table requirements

`scripts/check-tenant-table-requirements.sql`:

```sql
WITH tenant_tables AS (
  SELECT DISTINCT t.table_name
  FROM information_schema.tables t
  JOIN information_schema.columns c
    ON c.table_schema = t.table_schema AND c.table_name = t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.column_name = 'tenant_id'
    -- Allowlist: tables where tenant_id is subject, not isolation key
    AND t.table_name NOT IN ('tenant_subscriptions', 'tenant_payment_methods',
                              'tenant_activity_log', 'tenant_health_metrics',
                              'tenant_impersonation_sessions', 'tenant_rate_limits')
),
violations AS (
  SELECT
    tt.table_name,
    CASE WHEN (SELECT is_nullable FROM information_schema.columns
               WHERE table_schema='public' AND table_name=tt.table_name AND column_name='tenant_id') = 'NO'
         THEN NULL ELSE 'tenant_id is nullable' END AS issue_1,
    CASE WHEN (SELECT relrowsecurity FROM pg_class
               WHERE oid = format('public.%I', tt.table_name)::regclass) = true
         THEN NULL ELSE 'RLS not enabled' END AS issue_2,
    CASE WHEN (SELECT relforcerowsecurity FROM pg_class
               WHERE oid = format('public.%I', tt.table_name)::regclass) = true
         THEN NULL ELSE 'RLS not forced' END AS issue_3,
    CASE WHEN EXISTS (SELECT 1 FROM pg_policy
                      WHERE polrelid = format('public.%I', tt.table_name)::regclass
                        AND NOT polpermissive)
         THEN NULL ELSE 'No RESTRICTIVE policy' END AS issue_4,
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger
                      WHERE tgrelid = format('public.%I', tt.table_name)::regclass
                        AND tgname LIKE 'set_%_tenant_and_audit'
                        AND NOT tgisinternal)
         THEN NULL ELSE 'Missing set_<table>_tenant_and_audit trigger' END AS issue_5,
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes
                      WHERE schemaname='public' AND tablename=tt.table_name
                        AND indexdef ILIKE '%(tenant_id)%')
         THEN NULL ELSE 'Missing tenant_id index' END AS issue_6
  FROM tenant_tables tt
)
SELECT table_name, issue_1, issue_2, issue_3, issue_4, issue_5, issue_6
FROM violations
WHERE issue_1 IS NOT NULL OR issue_2 IS NOT NULL OR issue_3 IS NOT NULL
   OR issue_4 IS NOT NULL OR issue_5 IS NOT NULL OR issue_6 IS NOT NULL;
```

Wrapper script `scripts/check-tenant-table-requirements.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
RESULT=$(psql "$SUPABASE_DB_URL" -A -t -f scripts/check-tenant-table-requirements.sql)
if [ -n "$RESULT" ]; then
  echo "FAIL: Tenant-scoped tables missing required elements:"
  echo "$RESULT"
  exit 1
fi
echo "OK: all tenant-scoped tables conform"
```

Catches the `customer_company_relationships` failure mode before merge. The allowlist (in-SQL comment) is maintained as exempt tables are added.

### 6.6 G5 — Migration manifest

`scripts/check-migration-manifest.sh` compares applied migrations against `supabase/migrations.manifest.md`. Fails if any applied migration is missing from manifest.

### 6.7 G6 — `.from()` allowlist

`scripts/check-from-table-names.sh` parses valid table names from `database.types.ts`, scans `src/` for `.from('X')` calls, fails on unknown names. Belt-and-suspenders to G3.

### 6.8 CI workflow

`.github/workflows/ci.yml` runs all six jobs in parallel. All required for merge.

### 6.9 Pre-commit hooks (optional)

Husky runs G1 (Phase 6 form) + G3 on staged files. Saves the CI round-trip.

### 6.10 Secrets

| Secret | Used by |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | G2 |
| `SUPABASE_DB_URL` | G4, G5 |

Pure repo-local: G1, G3, G6.

### 6.11 Deliberately NOT a guardrail

Test coverage threshold, bundle size, performance benchmarking, RLS runtime isolation test (deferred to follow-up).

---

## 7. Testing & Verification

### 7.1 Per-phase verification

| Phase | Command | Pass criteria |
|---|---|---|
| 0 | Visual spot-check of triage worksheet | Covers every error-emitting file; top-30 classified |
| 1 | Test PR adding a TS error | CI rejects |
| 2 | tsc count after each B7 delete | Drops by predicted amount |
| 3 | Same as 2 + browser smoke test | Count drops; UI works |
| 4 | Same + PR includes MCP `execute_sql` output of fixed query | Count drops; live query returns expected shape |
| 5 | Same | Count reaches 0 |
| 6 | Run all six fire drills (§7.2) | All six guardrails reject target failure |

### 7.2 Guardrail fire drills

One-time validation. Each fire drill logged at `docs/superpowers/specs/2026-05-14-firedrill-log.md`.

| Guardrail | Fire drill | Expected |
|---|---|---|
| G1 (Phase 6) | Push branch with `const x: number = "string"` | `typecheck` job fails |
| G2 | Apply no-op migration without regenerating types | `schema-drift` job fails with diff |
| G3 | Push `supabase.from('device_types').select('*')` | `lint` job fails with configured message |
| G3b | Push `.select(\`id, device_types(name)\`)` | `lint` job fails (template literal scan) |
| G4 | Create test tenant-scoped table missing trigger | Assertion script names missing trigger + index |
| G5 | Apply migration without updating manifest | Manifest script lists orphan migration |
| G6 | Push `.from('this_table_does_not_exist')` | Allowlist script fails |

### 7.3 Cleanup-done audit

Phase 6 acceptance includes re-running the original audit greps; every must return zero:

```bash
grep -rE "\.from\('(device_types|brands|capacities|service_types|countries|cities|industries|supplier_categories|purchase_order_statuses|inventory_status_types)'\)" src/
grep -rE "\b(device_types|brands|capacities|service_types|supplier_categories|purchase_order_statuses|inventory_status_types)\s*!\w+_id\s*\(" src/
grep -rE "from '.*types/database'" src/
npx tsc --noEmit -p tsconfig.app.json
```

### 7.4 Browser smoke test (per CLAUDE.md)

Any UI-touching PR:
1. `npm run dev`
2. Walk golden path for affected screen.
3. Look for adjacent-screen regressions.
4. PR description records: route, action, observed result.
5. If can't be exercised locally (PayPal sandbox, email send), say so explicitly.

### 7.5 Ongoing verification post-Phase 6

- Guardrails ARE the verification — run on every PR.
- **Quarterly fire-drill replay** (30 min): re-run §7.2 to confirm gates still work. Catches "someone removed the required-status check" or "Postgres minor version broke the assertion SQL."
- **Monthly branch-protection audit**: GitHub Action calls API, alerts on drift.

### 7.6 Not tested

Existing feature behavior beyond touched scope; performance; RLS runtime isolation (deferred); cross-browser.

### 7.7 Acceptance ceremony

Phase 6 done when, in one sitting:
1. tsc exits 0.
2. Audit greps return zero.
3. Every fire drill logged passing.
4. Six CI jobs required on default branch.
5. `src/types/database.ts` deleted.
6. CLAUDE.md updated.
7. Migration PR template in place.

Tag `v1.1.0-schema-discipline` on merge commit.

---

## 8. Rollout & Risk

### 8.1 Merge strategy

- Small fast PRs (~50 lines median).
- No long-lived cleanup branch.
- Branch prefix `cleanup/<bucket>-<file>`; PR title `[cleanup B<n>]`.
- Phase boundaries are merge boundaries.

### 8.2 Coordination with feature work

Solo dev (single tenant) — minimal coordination. The ratchet (Phase 1+) ensures feature PRs can't add drift. Decision rule for collisions:
- Cleanup item in top-10 high-error files → cleanup-first.
- Otherwise → whoever opened PR first.

### 8.3 Hot-fix protocol

At 1 tenant, fix-forward is always the answer. No ratchet-override mechanism. Hot-fix PRs follow same gates; ratchet allows non-increasing counts, so any legitimate bug fix passes.

### 8.4 Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | `stockService.ts` rabbit hole | High | Phase 3 +1-2 days | Time-box 1 day; isolate; defer remainder to B8 |
| R2 | B5 materially larger than predicted | Medium | Phase 5 +3-5 days | After Phase 0, reassess; carve product-decisions to follow-up |
| R3 | Cleanup fix introduces runtime regression | Medium | Screen broken in production for hours-to-days | (a) Browser smoke test mandatory for UI; (b) MCP query verification in PRs; (c) small PRs = easy rollback |
| R4 | Can't add Supabase creds to CI | Low | G2/G4/G5 downgrade to manual checklist | Document downgrade in CLAUDE.md; re-attempt later |
| R5 | Schema-drift detector reveals live DB diverged from committed types | Low | Phase 6 blocked until reconciled | Treat as incident via `systematic-debugging` |
| R6 | Primary developer unavailable mid-cleanup | Medium | Schedule slip | Ratchet stays; codebase doesn't regress; resume on return |
| R7 | Migration during cleanup adds fresh drift | Low | Phase 5 longer | Migration discipline (§5) applies from Day 1, not Phase 6 |
| R8 | Tenant #2 onboarding pressure during cleanup | **Hard rule** | n/a | **Onboarding paused until Phase 6 tagged** |

### 8.5 Communication

Solo dev: running tsc count maintained in this spec's "Progress Log" section (§8.7), updated after each merge. PR history is the audit trail.

### 8.6 Adaptive checkpoints

- **End of Phase 0**: if B5 >25%, downgrade to "ratchet at end-of-cleanup count" (Approach A end-state).
- **End of Phase 3**: if `stockService.ts` ate 2 days, isolate it and continue.
- **Day 10**: if >1000 errors with trajectory >5 more days, choose: push through / switch to Approach A end-state / ship partial cleanup + active guardrails.

None are failure. Win condition is "schema discipline enforced by CI." Exact tsc count is a means.

### 8.7 Progress log

Updated after each merge:

```
| Date | Phase | Files merged | tsc count |
|------|-------|--------------|-----------|
| 2026-05-14 | 0 baseline | - | 3138 |
| ... | ... | ... | ... |
```

### 8.8 Post-Phase 6 steady state

1. Migration discipline (§5) is the steady-state process.
2. Zero gate replaces ratchet.
3. Guardrails autopilot.
4. Follow-up brainstorms (not in this spec):
   - Runtime RLS isolation testing.
   - Per-tenant performance benchmarks.
   - Edge function type-safety (separate tsconfig).

### 8.9 Business gate (restate)

**Tenant #2 onboarding does not begin until Phase 6 tagged.** This work is load-bearing for SaaS scale.

---

## Appendix A — Initial audit findings (pre-Phase 0 reference)

Surfaced during the brainstorming session. Phase 0 triage validates and extends.

### Schema-drift call sites (incomplete; full list comes from Phase 0)

| File | Lines | Drift type |
|---|---|---|
| `src/lib/reportPDFService.ts` | 327 | `service_types!...` → `catalog_service_types!...` |
| `src/lib/diagnosticsService.ts` | 151-152 | `device_types`, `brands` → `catalog_*` |
| `src/lib/inventoryCaseAssignmentService.ts` | 178, 215, 251, 296-298 | `brands`, `capacities`, `inventory_status_types` → catalog_/master_ |
| `src/components/cases/DeviceFormModal.tsx` | 182, 211-213 | `device_types`, `brands`, `capacities` → catalog_* |
| `src/pages/suppliers/SupplierProfilePage.tsx` | 54-55 | `supplier_categories`, `supplier_payment_terms` → master_* |
| `src/pages/suppliers/PurchaseOrdersListPage.tsx` | 51 | `purchase_order_statuses` → master_* |
| `src/pages/suppliers/PurchaseOrderDetailPage.tsx` | 39 | same |
| `src/components/cases/CloneDriveModal.tsx` | 82-107 | Whole file broken (B7 — delete in Phase 2) |
| Multiple files | (see §2.3) | `serial_no` column drift |

### Already-fixed during the conversation

| File | Fix |
|---|---|
| `src/pages/cases/CasesList.tsx` | `serial_no`/`device_types` → `serial_number`/`catalog_device_types` |
| `src/lib/reportPDFService.ts:351-390` | catalog_/brands renames + consumer mapping |
| `src/components/customers/CustomerFormModal.tsx` | Added `tenant_id` to `customer_company_relationships` insert |
| Migration `add_tenant_audit_trigger_to_customer_company_relationships` | Added missing `set_*_tenant_and_audit` trigger |

### Initial tsc baseline (captured 2026-05-14)

3138 errors. Top files:

| Errors | File |
|---|---|
| 222 | `src/lib/stockService.ts` |
| 85 | `src/App.tsx` |
| 79 | `src/pages/suppliers/SupplierProfilePage.tsx` |
| 75 | `src/pages/settings/GeneralSettings.tsx` |
| 71 | `src/components/cases/DeviceFormModal.tsx` |
| 55 | `src/components/documents/InvoiceDocument.tsx` |
| 54 | `src/components/documents/ReportDocument.tsx` |
| 51 | `src/components/inventory/InventoryDetailModal.tsx` |
| 51 | `src/components/cases/CloneDriveModal.tsx` (B7 — delete) |
| 49 | `src/components/documents/QuoteDocument.tsx` |

Top 30 files = ~54% of errors. Concentration confirms B1 leverage opportunity.

By error code (top 5):
- TS2322 (968) — type mismatch
- TS2339 (792) — property not exist (schema drift)
- TS2345 (395) — argument mismatch
- TS6133 (303) — unused declarations
- TS2769 (199) — no overload matches

---

## Appendix B — Reference: existing CLAUDE.md sections that interact

This spec extends but does not replace:
- §"Multi-Tenant Architecture" — RESTRICTIVE RLS + tenant isolation pattern stays
- §"Database Architecture" — table prefixes (this spec enforces them)
- §"Source of Truth Rules" — `database.types.ts` as canonical types
- §"Migration Workflow" — extended by §5 of this spec
- §"Theming" — untouched
- §"Country-Based Tenant Configuration" — untouched

Phase 6 updates CLAUDE.md to reference this spec for naming rules, guardrails, and migration discipline.
