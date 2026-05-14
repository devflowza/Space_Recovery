# Schema Drift Audit — Sprint Playbook

> Status: **OPEN — partial fixes landed, full sweep pending**. Created 2026-05-14 after browser QA of the theme migration surfaced widespread column-name mismatches across ~10 tables and dozens of files.

## The problem

A previous schema rebuild (per `CLAUDE.md`, "Version 1.0.0 — Complete SaaS Architecture Rebuild" on 2026-03-19, dropped 200 legacy tables) renamed many columns and tables. Approximately half of the downstream callers in `src/` were updated; the other half were not. The mismatches stayed hidden because:

1. **TypeScript baseline is ~3230 errors across ~279 files** (see memory `xsuite-typecheck-baseline`). Real schema-vs-code drift errors are buried in the noise.
2. **Vite/esbuild doesn't gate builds on type errors**, so the app ships despite the drift.
3. **PostgREST returns 400 (not 500)** for unknown columns — looks like generic bad-request, not a "the schema changed" signal.

The theme migration itself was clean. But every flow that exercises a stale query in the browser hits a 400. Tonight we fixed ~15 instances; **dozens more remain**.

## What's been fixed (this session)

| Commit | Class | Files |
|---|---|---|
| `25d1b81` | `get_next_number` RPC param name (`sequence_scope`→`p_scope`) | 10 |
| `9efc60a` | `customer_company_relationships.is_primary_contact`→`is_primary` + `cases.case_no` insert | 11 |
| `daf2128` | `cases.title`→`subject`, `cases.assigned_engineer_id`→`assigned_to` on writes | 2 |
| `1d02d35` | Missing `tenant_id` in case insert payload (403 RLS) | 1 |
| `0afd735` | `case_devices` insert: `serial_no`/`device_password`/`device_problem`/`recovery_requirements`/`encryption_type_id`/`parent_device_id` + missing tenant_id | 1 |
| `7b6163d` | onboardingService demo case `title`→`subject` | 1 |
| *pending* | `useCaseQueries.ts` — 9 queries rewritten (~30 column mismatches) | 1 |

## What's still broken

Anywhere the app does `.from('TABLE').select(...)` or `.insert/update(...)` with a column that doesn't exist in the schema. Tonight we touched ~5% of the affected surface area. The other 95% will silently 400 the moment a user navigates to a feature that hasn't been QA'd yet.

### Top tables by caller count (grep across `src/`)

```
45  cases             43  invoices          36  profiles
30  customers_enhanced 29 company_settings  25  stock_items
24  expenses          23  quotes            22  bank_accounts
19  accounting_locales 17 inventory_items   17  case_devices
15  document_templates 15 companies         15  case_reports
13  timesheets        13  tenants           13  support_tickets
13  payments          13  geo_countries     13  catalog_device_capacities
12  stock_serial_numbers 12 leave_requests  12  employees
12  customer_company_relationships
12  catalog_device_types 12 catalog_device_brands
...
```

~600 total Supabase queries across ~150 tables.

### Known classes of mismatch (apply across all callers)

**Column renames** (DB renamed; callers still use old name):
- `case_devices.serial_no` → `serial_number`
- `case_devices.device_password` → `password`
- `case_devices.encryption_type_id` → `encryption_id`
- `case_devices.device_problem` → no equivalent (use `symptoms`)
- `case_devices.recovery_requirements` → no equivalent (use `notes`)
- `case_devices.parent_device_id` → dropped
- `customer_company_relationships.is_primary_contact` → `is_primary`
- `case_attachments.file_path` → `file_url`
- `case_attachments.mime_type` → `file_type`
- `case_internal_notes.note_text` → `content`
- `case_internal_notes.private` → dropped
- `case_job_history.details_json` → `details`

**Columns the client uses that no longer exist**:
- `cases.due_date / summary / important_data / accessories / checkout_date / checkout_collector_name / recovery_outcome` — all dropped
- `clone_drives.*` — entire feature schema was restructured. Old client fields (`patient_device_id`, `physical_drive_*`, `storage_*`, `image_*`, `clone_date`, `cloned_by`, `extracted_*`, `backup_device_id`, `extraction_notes`, `retention_days`) all dropped. New schema: `id, tenant_id, case_id, device_id, drive_label, serial_number, capacity, status, assigned_to, notes, ...`. Feature is essentially broken until either UI is rewritten or columns are added back.
- `case_reports.report_type / visible_to_customer / version_number / is_latest_version / approved_at / sent_to_customer_at` — all dropped

**Generated columns the client writes to** (DB has `GENERATED ALWAYS AS (other_column)`, can SELECT from but cannot INSERT/UPDATE):
- `cases.case_no` (generated from `case_number`)
- `cases.title` (generated from `subject`)
- `cases.assigned_engineer_id` (generated from `assigned_to`)

**Missing required fields on inserts**:
- `tenant_id` is `NOT NULL` on every tenant-scoped table, with a RESTRICTIVE RLS policy `tenant_id = get_current_tenant_id() OR is_platform_admin()`. There is NO `set_tenant_and_audit_fields` trigger on most tables (despite `CLAUDE.md` mentioning it as a guideline). Every insert path must explicitly pass `tenant_id: profile.tenant_id`.

**PostgREST FK relationship hints**:
- Queries like `author:profiles(full_name)` need an explicit FK hint when the table has multiple FKs to `profiles`: `author:profiles!created_by(full_name)`. Most ambiguous joins are broken.

**Wrong PostgREST table alias**:
- Schema has `catalog_device_types` but some queries use `device_types(...)` without the `catalog_` prefix.

## Methodology for the sprint

### Phase 1: Audit (1 day)
1. Dump every column in every public table via `SELECT json_object_agg(table_name, columns) FROM (SELECT table_name, json_agg(column_name ORDER BY ordinal_position) AS columns FROM information_schema.columns WHERE table_schema='public' GROUP BY table_name) t;`
2. Grep every `.from('TABLE').select(...)` shape from `src/`.
3. For each query: parse the SELECT clause, check each column against the schema, output a mismatch report grouped by file.
4. Same audit for `.insert({...})` and `.update({...})` payloads — flag any field not in the schema, any field that's a `GENERATED ALWAYS` column, any payload missing `tenant_id` on a tenant-scoped table.
5. Output a per-file fix manifest.

This is a job for a dispatched audit agent (subagent with Read + Glob + Grep + the schema reference).

### Phase 2: Apply (2-3 days)
Per-domain agents:
- Agent A: cases/* (45 callers) + case_devices/case_reports/etc.
- Agent B: financial (invoices/expenses/quotes/payments)
- Agent C: HR/payroll/employees/timesheets/leave
- Agent D: inventory/stock/suppliers/POs
- Agent E: customers/companies + customer_company_relationships
- Agent F: platform-admin + settings + tenant + subscriptions
- Agent G: catalog_* and master_* tables (mostly read-only, lower priority)

Each agent gets the schema reference + the audit manifest for its scope + the instruction to fix queries to ONLY use columns that exist in the schema, OR flag back to the human if there's no semantic equivalent.

### Phase 3: Verify (0.5 day)
- For each fixed file: run `tsc --noEmit` scoped to that file, expect zero "Property X does not exist on type" errors
- Then `npm run build`
- Then browser smoke test: navigate to one page per domain, click create/edit/delete

### Cross-cutting concerns

1. **Apply `set_tenant_and_audit_fields` trigger to every tenant-scoped table that lacks it** — one DB migration. Eliminates the entire class of "missing tenant_id → 403" bug. Audit query: `SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='tenant_id' AND table_name NOT IN (SELECT event_object_table FROM information_schema.triggers WHERE event_manipulation='INSERT' AND trigger_name LIKE 'set_tenant%');`
2. **Decide fate of broken features**: `clone_drives` and `case_reports` versioning were refactored at the DB level without updating UI. Either rewrite the UI to match the new schema OR add back the missing columns. Multi-day decision.
3. **Drop the typecheck baseline**: after the sweep, the ~3230 pre-existing errors should drop dramatically because most are this exact mismatch. Aim for <200 typecheck errors. Lock that as the new gate.
4. **PDF popup blocker** (unrelated): `src/lib/pdf/pdfService.ts` opens PDF via `window.open()` which Chrome blocks outside direct-click handlers. Switch to Blob URL download.

## Acceptance criteria for sprint completion

1. Every `.from('TABLE').select(...)` in `src/` uses only columns that exist in the schema.
2. Every `.insert/update({...})` payload uses only writable columns (no GENERATED ALWAYS targets) and includes `tenant_id` for tenant-scoped tables.
3. `npm run build` clean.
4. `npm run typecheck` error count drops from ~3230 to under 200.
5. Browser smoke test: case create + case view + invoice create + quote create + employee create + customer create + supplier create — all succeed without 400/403 in the network tab.
6. CLAUDE.md updated with a note: "If you rename a DB column, run `grep -rn 'old_column_name' src/` and update every caller. PostgREST returns 400 for unknown columns, which looks like a generic bad-request error."
