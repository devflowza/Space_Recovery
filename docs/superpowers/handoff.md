# Session Handoff — 2026-07-03 (Localization Phase 1 MERGED)

## What I was doing
Executed **Global Tenant Localization — Phase 1 (Fiscal Kernel + Oman Parity)** end-to-end from `docs/superpowers/plans/2026-07-02-localization-phase1-fiscal-kernel-oman-parity.md` — all **33 tasks + the deferred WP-3 Part-3 backstop**, via subagent-driven-development. Shipped as PR #361, now **MERGED to `main`**.

## Current status
- **PR #361 — MERGED** → `main` @ **9a7f24c** ("Localization Phase 1 … (#361)"). The work branch `claude/handoff-continuation-hbytbe` is squash-merged — **do NOT reuse it**; start each new piece of work on a fresh branch cut from `main`.
- **13 additive migrations applied live** to the canonical DB `ssmbegiyjivrcwgcqutu` (all recorded in `supabase/migrations.manifest.md`): `pack_governance_tables`, `geo_country_tax_rates`, `document_tax_lines`, `registrations_einvoice`, `document_header_columns`, `statutory_keys_regime_sync`, `issue_tax_document`, `integrity_immutability_triggers`, `numbering_v2`, `oman_pack_v1`, `tax_line_backfill`, `validate_integrity`, `vat_record_backstop`.
- **The kernel is canonical** for invoice/quote totals. Legacy `calculateInvoiceTotals`/`calculateQuoteTotals` are **deleted** (the `*Base` helpers retained). Invoices/quotes compute via `src/lib/tax/kernel` through `src/lib/taxDocumentService.ts`; tax invoices no longer pre-mint numbers — they issue via the `issue_tax_document` RPC (number minted in-transaction at issuance; the `post_invoice_vat_record` backstop rejects any raw draft→sent flip that bypasses the RPC).
- **Verified pre-merge (local):** full vitest **2325 pass / 0 fail** (exit 0, 0 unhandled rejections); `tsc` 0; no legacy runtime callers; `lint` = the 2 pre-existing `PortalDocuments` errors only (0 new).
- **Parity exit gate proven:** kernel ≡ legacy on **993/993 invoices + 1137/1138 quotes**. The lone quote (`b2d6ccec`) differs by 1 mil due to a legacy quote-fn float operation-ordering artifact (`X*(r/100)` vs the kernel/invoice `(X*r)/100`) — owner-approved + allowlisted. `check:parity-replay` carries a documented **106-doc historical allowlist** (`scripts/localization/parity-replay-allowlist.json`: 65 old-2dp precision drift + 40 bad-data + 1 float quote).

## Next step (pick up here — priority order; start each on a FRESH branch from `main`)
1. **Confirm PR #361's CI went green on merge.** The CI-only gates (`check:parity-replay`, `check:bypass-suite`, `check:statutory-fixtures`, `schema-drift`) only do real work when CI has `SUPABASE_DB_URL` / the `supabase` CLI. If any failed post-merge, address on a follow-up branch.
2. **Fix `resync_tenant_country_config()`** — a **pre-existing** bug found this session: it INSERTs non-existent `audit_trails` columns (`entity_type`/`entity_id`/`metadata`; the live schema uses `record_type`/`new_values`) and errors on every call. Small `CREATE OR REPLACE` fix mirroring the Phase-0 `anonymize_customer_data`/`export_customer_data` rewrites. (It blocked the M-J resync no-op verification; no-drift still holds by design since `regime.*` keys resolve via the TS registry codedDefault, not the DB mapper.)
3. **Localization Phase 2 (document compliance)** — plan ready: `docs/superpowers/plans/2026-07-02-localization-phase2-document-compliance.md`. Consumes Phase-1 columns/RPC (item/unit-code persistence, buyer/seller snapshots, `DocumentComplianceProfile` in pdfService, `master_document_requirements` evaluated in-RPC — the RPC returns `requirement_failures: []` today as a stable contract).

## Key decisions / deviations (Phase 1)
- **Part-3 (`post_invoice_vat_record`) backstop deferred** from WP-3 to WP-6 and applied WITH the cutover — applying it at WP-3 would have broken the live pre-cutover `issueInvoice` draft→sent flow.
- **Parity gate reframe:** the plan's kernel-vs-STORED replay went RED (247 divergences) on historical realities (old-2dp OMR figures + bad data + 2 harness bugs), NOT a kernel bug. Reframed to kernel-vs-LEGACY on identical inputs (the real cutover-safety question) → clean (the 1 float quote). Owner approved the cutover + deletion on that basis. The committed harness is kernel-vs-stored + the 106-doc allowlist (literal kernel-vs-legacy is impossible post-deletion).
- **Single branch** (not the plan's per-WP branches) per the owner's single-push directive.
- **In-migration obstacles handled:** `SET LOCAL app.bypass_tenant_guard='true'` for tenant-guarded seeds (registrations, M-C backfill — the tenant/audit trigger rejects an explicit `tenant_id` in no-session migration context); `statutory_keys` synced into `validate_country_config_overrides()` (WP-2 security completion — else tenants could forge the new country-locked `regime.*` keys); M-C also sets `app.tax_line_backfill='true'`.
- Several plan-verbatim snippets adapted for this repo's strict tsc (`rule_trace`→`Json` cast, `|| null`→`|| undefined` on optional RPC args, `discount_percent`→`discount` column, kind-aware `documentType`/date columns in the harness) — all behavior-preserving, disclosed in commit bodies.

## Plan progress
- `2026-07-02-localization-phase1-fiscal-kernel-oman-parity.md`: **33/33 COMPLETE** (merged via PR #361).
- Localization Phases 2–6: plans exist (`…-phase{2..6}-*.md`), NOT started.

## ⚠️ HARD RULE (standing)
**Local-first: NO push / `gh pr create` / remote git change until the owner explicitly asks in the moment.** This session's pushes (PR #361 + this handoff PR) were explicitly authorized; that does NOT carry forward. Applying **additive** migrations to the canonical DB via `mcp__supabase__apply_migration` is the established project workflow (Phase 0 + Phase 1) and is in-scope when executing an owner-authorized migration plan; git push/PR is separately gated.

## Open questions / blockers
- CI-only gates need `SUPABASE_DB_URL` / the `supabase` CLI (absent in the web/dev container) — Phase-1 parity was verified out-of-band via an MCP `float8` SQL replay proven IEEE-754-identical to the JS kernel, cross-checked against the real `computeDocumentTax` on all boundary docs.
- 2 pre-existing `PortalDocuments` lint errors + 2 Dependabot high vulns on `main` (both pre-existing, unrelated to this work).
- The `resync_tenant_country_config` bug (Next step #2).
