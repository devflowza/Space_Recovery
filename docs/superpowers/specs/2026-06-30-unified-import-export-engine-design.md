# Unified Import / Export Engine — Design

**Date:** 2026-06-30
**Status:** Approved (design); pending implementation plan
**Owner decisions captured:** server-side writes; preserve legacy numbers + advance sequences; preserve original dates + suppress fabricating triggers + single provenance trail; Excel workbook (one tab per entity); **retire and rebuild BOTH import and export from scratch**.

---

## 1. Purpose & Goals

Retire the legacy CSV import/export entirely and build a single **unified import/export engine** that migrates the full relational graph of a data-recovery lab between systems (or backs it up and restores it) without losing relationships, integrity, or history.

**Must support, end-to-end, with relationships intact:**
Customers · Companies · Customer↔Company relationships · Cases · Case devices · Original case registration dates · Case statuses **with status history + timestamps** · Quotes (+ items) per case · Invoices (+ line items) per case · Internal notes · related metadata & historical records.

**Hard requirements:**
- Preserve the **complete relational structure** — every imported entity keeps its original links.
- Preserve **original timestamps** (registration dates, status-history timestamps, document dates).
- Preserve **original record numbers** (case/invoice/quote/customer numbers).
- Scale to **10,000+ customer records** (and the proportionally larger child volume) efficiently; designed to scale beyond.
- **Validation**, **duplicate detection**, **detailed error reporting**, **transactional processing** where appropriate, and **resumable** imports that never create duplicate or inconsistent data.

**Non-goals (this program):**
- GDPR data-subject export (separate `gdpr` page) — unaffected.
- Payments/expenses/HR/stock/asset migration — **out of scope for v1** (engine is extensible to them later via the same contract; v1 covers the entities listed above).
- Live two-system sync — this is batch migration/backup, not continuous replication.

---

## 2. Source / target format — the shared workbook contract

A single **`.xlsx` workbook, one sheet per entity**. The **same** schema is produced by the export engine and consumed by the import engine, so an export round-trips through an import.

**Sheets (import tolerates missing optional sheets):**

| Sheet | Key columns (final columns confirmed against the owner's sample workbook) |
|---|---|
| `_meta` | source_tenant, exported_at, schema_version, row counts (export writes; import validates) |
| `Companies` | `legacy_id`, name, email, phone, address fields, registration/created_at |
| `Customers` | `legacy_id`, name, email, phone, address fields, created_at |
| `Relationships` | `customer_legacy_id`, `company_legacy_id`, is_primary, role, start/end |
| `Cases` | `legacy_id`, case_number, `customer_legacy_id`, `company_legacy_id`, status, **registered_at / original created_at**, ... |
| `Devices` | `legacy_id`, `case_legacy_id`, device_type, brand, model, serial, capacity, interface (catalog names → resolved to UUIDs), received_at, ... |
| `Quotes` | `legacy_id`, quote_number, `case_legacy_id`, status, totals, dates |
| `QuoteItems` | `legacy_id`, `quote_legacy_id`, description, qty, unit_price, total, sort_order |
| `Invoices` | `legacy_id`, invoice_number, `case_legacy_id`, status, totals, dates |
| `InvoiceLineItems` | `legacy_id`, `invoice_legacy_id`, description, qty, unit_price, tax, total |
| `Notes` | `legacy_id`, `case_legacy_id`, content, created_at, author |
| `StatusHistory` | `case_legacy_id`, action, old_value, new_value, performed_at (timestamp), performed_by |

**Rule:** every row carries its own `legacy_id` and foreign `*_legacy_id`s. On **export**, `legacy_id` = the row's real UUID. On **import**, the engine maps `legacy_id` → a fresh new UUID and resolves all foreign refs through that map. The exact column set is finalized against a real sample workbook the owner provides (dropped in the repo); a downloadable **template** + JSON column spec ships with the feature.

---

## 3. Architecture (three layers)

```
Browser (parse / build / validate / orchestrate)
  ├─ Import:  SheetJS read → client dry-run validation → batched calls → progress/resume
  └─ Export:  paged read RPCs → SheetJS build → .xlsx download
          │  (both sides share ONE workbook-contract module — no drift)
          ▼
Postgres SECURITY DEFINER RPCs (all writes + authoritative reads)
  ├─ import_batch(run_id, entity_type, rows)   — remap, insert, map, idempotent, per-batch txn
  ├─ import_finalize(run_id)                    — advance sequences, write provenance, complete
  └─ export_page(entity_type, cursor, filters)  — tenant-scoped paged reads
          ▼
Schema (run ledger + remap map + trigger guards)
```

The **legacy→new map** (`import_entity_map`) is the heart: children resolve parents through it, never trusting a raw file UUID. This is what preserves the relational graph.

---

## 4. Schema additions (migration)

All tenant-scoped, RLS enabled + forced, RESTRICTIVE isolation, `set_<table>_tenant_and_audit` trigger, `idx_<table>_tenant_id` partial index (per project schema-discipline CI gates).

- **`import_runs`** — `id`, `tenant_id`, `kind` ('import'|'export'), `status` ('pending'|'validating'|'running'|'paused'|'completed'|'failed'), `source_filename`, `file_hash`, `schema_version`, `totals jsonb` (per-entity expected), `counts jsonb` (created/skipped/error per entity), `error_summary jsonb`, `started_at`, `finished_at`, `created_by`, soft delete.
- **`import_entity_map`** — `id`, `run_id` (FK), `tenant_id`, `entity_type`, `legacy_id`, `new_id`, `status` ('inserted'|'skipped_duplicate'|'error'), `error text`. **Unique `(run_id, entity_type, legacy_id)`.** Indexed on `(run_id, entity_type)` and `(tenant_id, entity_type, legacy_id)`.
- **`app.importing` trigger guard** — add a one-line skip to the three *fabricating* AFTER-INSERT triggers so they don't manufacture import-time events:
  - `trg_log_device_received_custody` (case_devices)
  - `trg_post_invoice_vat_record` (invoices)
  - `trg_seed_portal_customer_subscriptions` (customers_enhanced)

  Each guarded with `IF COALESCE(current_setting('app.importing', true), 'false') = 'true' THEN RETURN ...; END IF;`. The BEFORE `set_tenant_and_audit_fields` / `set_audit_actor_fields` triggers are **left intact** — they already `COALESCE(created_at, now())` / `COALESCE(created_by, auth.uid())`, so they preserve provided historical values.
- **Legacy ID retention** — store the source system's original id in each entity's existing `metadata jsonb` (`metadata.legacy_id`, `metadata.import_run_id`). No per-table column churn.
- **Drop legacy tables** — `import_export_templates`, `import_export_jobs`, `import_export_logs`, `import_field_mappings` (all 0 rows; consistent with the owner's prior hard-DROP preference for empty legacy tables).
- Regenerate `database.types.ts` after the migration.

---

## 5. Server RPCs

### `import_batch(p_run_id uuid, p_entity_type text, p_rows jsonb) → jsonb`
SECURITY DEFINER. For each row:
1. **Idempotency:** if `(run_id, entity_type, legacy_id)` already in `import_entity_map`, skip (return existing new_id). This is what makes resume safe.
2. **Resolve parents** from `import_entity_map` (e.g. `case_legacy_id` → case UUID). Missing parent → row error (reported, not fatal to the batch's other rows… see error model).
3. **Resolve catalog names** → UUIDs via existing `lookup_*` functions; unknown → report.
4. **Insert** with `tenant_id`, preserved `created_at`/number, `metadata.legacy_id`. `created_by` is left **NULL** — migrated records predate any xSuite user; the human who ran the import is recorded once in `import_runs.created_by` and the provenance entry, not stamped onto every historical row.
5. **Record** `(legacy_id → new_id)` in `import_entity_map` **in the same transaction** as the insert.

**Atomicity model — atomic per row, batched per call.** The batch executes in one transaction, but **each row is wrapped in a `SAVEPOINT`**: a row that fails (missing parent, unique clash, type error) is rolled back to its savepoint and recorded as an error in `import_entity_map`, while every valid row in the same batch commits. This reconciles "one bad row must not block the other 99" with "no partial/duplicate state" — the insert and its map entry always commit or roll back together, per row. Sets `SET LOCAL app.importing = 'true'` and (where the tenant context isn't the row's tenant) `SET LOCAL app.bypass_tenant_guard = 'true'` so the fabricating triggers skip and the tenant guard accepts the explicit, validated tenant_id. Returns per-row results (inserted / skipped / error + messages).

### `import_finalize(p_run_id uuid) → jsonb`
Advances each touched `number_sequences` scope to `max(imported numeric suffix)` so subsequent app-generated numbers never collide. Writes the **single provenance trail**: one `audit_trails` row for the run + one `MIGRATED` `case_job_history` note per imported case (dated to the migration, clearly labelled — not fabricated history). Marks `import_runs.status='completed'`.

### `export_page(p_entity_type text, p_cursor, p_filters jsonb) → jsonb`
Tenant-scoped, RLS-safe paged read (keyset pagination on `(created_at,id)`), returns rows shaped to the workbook contract (UUIDs as `legacy_id`, parent UUIDs as foreign refs). Filters: date range, entity selection, optional id sets.

---

## 6. Data flow (strict dependency order)

**Import:** Companies → Customers → Relationships → Cases → Devices → Quotes → QuoteItems → Invoices → InvoiceLineItems → Notes → StatusHistory → **Finalize**.
**Export:** same entity order; each entity paged independently; workbook assembled client-side.

The browser drives stage order; the server enforces FK resolution + idempotency, so even out-of-order/retried batches stay consistent.

---

## 7. Cross-cutting behaviors

- **Relationship preservation:** the `import_entity_map` is the single source of truth. A child's parent is always resolved through the map. Guarantees case→customer/company, device→case, quote/invoice→case, items→quote/invoice, notes/status→case after import.
- **Numbering:** preserve legacy numbers; validate uniqueness (within file + against DB); `import_finalize` advances sequences past the max imported.
- **Forensic fidelity:** original dates preserved on the records; the three fabricating triggers suppressed during import via `app.importing`; one honest migration-provenance entry instead of thousands of import-dated custody/VAT/portal events. Append-only `case_job_history` is INSERT-only here (its mutation guard is unaffected).
- **Validation:** (1) client dry-run — required fields, types/dates, enum coercion, in-file FK presence, uniqueness, relationship sanity; full preview + downloadable error report; **writes nothing**. (2) server per-batch re-validation — authoritative FK + unique + type.
- **Duplicate detection:** within-file (dup legacy_ids / case# / invoice#); against DB (customer email/phone, company name/email, case#, invoice#); idempotent resume via the map. Policy: **skip + report** (default).
- **Error reporting:** per-row errors in `import_runs.error_summary` + `import_entity_map.error`; downloadable **error workbook** (same tabs, only failed rows + a reason column) for fix-and-reimport.
- **Resumability + transactions:** no monolithic transaction. Many batched calls, each atomic **per row** via savepoints (§5), plus the idempotent map. Re-uploading the same file (matched by `file_hash`) resumes the run, skipping already-mapped legacy_ids; a crash never leaves partial/duplicate rows.

---

## 8. Export engine (symmetric)

Export produces exactly the import workbook. `legacy_id` = real UUID; foreign refs = parent UUIDs; `_meta` sheet stamps source tenant + timestamp + schema_version + counts. Scope: full-tenant by default; optional entity selection + date-range filter. The full export is a complete, re-importable backup of the relational graph — and the canonical test fixture for import (build export first).

---

## 9. UI

A new **Import/Export center** (replaces `ImportExport.tsx`'s legacy wizards), using the existing top-bar `SettingsPageHeader` pattern, tokens-only, per `ui-ux-pro-max` + `frontend-design`:
- **Import wizard:** Upload → Validate/Preview (per-entity counts, relationship summary, errors + downloadable error report) → Import (live per-stage progress bar, resumable) → Summary (created/skipped/error counts + provenance link).
- **Export wizard:** Scope (entities + optional date range) → Generate (progress) → Download `.xlsx`.

---

## 10. Retirement of the legacy system

Remove `ImportWizard`, `ExportWizard`, `BulkInventoryImportModal`, `importExportService.ts`, `bulkImportService.ts`, and the legacy entry points; fold inventory bulk-import into the new engine. Drop the 4 empty `import_export_*` tables. Reuse only the generic DB `lookup_*` catalog-resolver functions.

---

## 11. Modules (isolation & boundaries)

- `src/lib/importExport/workbookContract.ts` — the single entity/column schema (sheets, columns, types, FK refs). Both parser and builder import this.
- `src/lib/importExport/workbookParser.ts` — `.xlsx` → typed per-entity row arrays (SheetJS read).
- `src/lib/importExport/workbookBuilder.ts` — row arrays → `.xlsx` (SheetJS write).
- `src/lib/importExport/importValidator.ts` — client dry-run validation.
- `src/lib/importExport/importClient.ts` — orchestrates stage order, batching, progress, resume (calls `import_batch`/`import_finalize`).
- `src/lib/importExport/exportClient.ts` — paged reads (`export_page`) → builder.
- `src/lib/importExport/catalogResolver.ts` — name→UUID (wraps `lookup_*`).
- DB: migration(s) for ledger + map + trigger guards + RPCs + drop legacy.
- UI: `src/pages/settings/ImportExportCenter.tsx` + wizard components under `src/components/importExport/`.

Each unit has one purpose, a typed interface, and is independently testable.

---

## 12. Testing strategy

- **Unit:** parser, builder, validator (per entity), catalog resolver, sequence-advance math, the remap resolution.
- **Round-trip integration:** build a fixture tenant's data → export → import into a clean target → assert: every relationship (case→customer/company, device→case, quote/invoice→case, items→parent, notes/status→case), preserved `created_at`, preserved numbers, status-history order + timestamps, sequences advanced, **idempotent re-run creates 0 new rows**, fabricating triggers did not fire (custody/VAT/portal counts unchanged), one provenance entry written.
- **Scale:** generated 10k-customer (+ proportional children) workbook → measure throughput, verify batched memory profile + resume after a forced mid-run abort.
- Gates: `tsc` 0 (un-piped), lint, vitest, schema-drift after migrations.

---

## 13. Build phases

- **P0 — Schema:** `import_runs` + `import_entity_map`; `app.importing` guards on the 3 fabricating triggers; drop the 4 legacy tables; regen types.
- **P1 — Workbook contract:** the shared schema module + template + JSON spec (+ tests).
- **P2 — Export:** `export_page` RPC + `exportClient` + `workbookBuilder` + tests (yields a real workbook).
- **P3 — Import core:** `import_batch` + `import_finalize` RPCs + `workbookParser` + `importValidator` + `importClient` + round-trip tests against P2 output.
- **P4 — UI:** Import/Export center + wizards.
- **P5 — Retire legacy:** delete old code/wizards; fold inventory bulk-import in.
- **P6 — Scale & resume:** 10k round-trip, forced-abort resume, throughput tuning.

---

## 14. Locked defaults

1. Build **both** import and export from scratch (export retired + rebuilt).
2. Unknown catalog values → **report-only** (no silent auto-create).
3. Legacy IDs stored in **`metadata jsonb`** (`metadata.legacy_id`).
4. Dedup against existing rows → **skip + report**.

## 15. Risks & mitigations

- **Trigger guard correctness** — a missed fabricating trigger pollutes the ledger. Mitigation: enumerate all AFTER-INSERT triggers on imported tables in P0; round-trip test asserts custody/VAT/portal counts are unchanged by import.
- **`app.importing` leaking outside import** — `SET LOCAL` (transaction-scoped) only, inside the RPC. Never set session-wide.
- **Tenant guard vs explicit tenant_id** — use `app.bypass_tenant_guard` only within the import RPC, with tenant_id always explicit + validated against the run's tenant.
- **Number collisions** — validate uniqueness pre-insert + advance sequences in finalize; report any clash rather than silently overwrite.
- **Large-file browser memory** — stream/paginate; never hold the whole 10k workbook materialized longer than needed; batch sizes tuned in P6.
- **Append-only audit/custody integrity** — engine only INSERTs (never UPDATE/DELETE on audit/history); provenance is additive.
