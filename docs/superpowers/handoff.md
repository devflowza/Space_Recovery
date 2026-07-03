# Session Handoff — 2026-07-04 (Localization Phase 2 — in progress, 8/28)

## What I was doing
Executing **Global Tenant Localization — Phase 2 (Document Compliance)** from `docs/superpowers/plans/2026-07-02-localization-phase2-document-compliance.md` (28 tasks, 9 work packages), via subagent-driven-development (per-task TDD + spec/quality review with independent live-DB probes). Paused mid-phase at a clean, fully-reviewed boundary because the next step is destructive (Task 10 deletes legacy PDF builders) and the user was AFK — do NOT run an irreversible step unattended.

## Current status
- **Branch:** `feat/localization-phase2-document-compliance` (base = `main` 9fbde50; Phases 0+1 merged). **HEAD = 5330b2c.** LOCAL ONLY — **nothing pushed** (local-first; push only when the owner asks in the moment).
- **8 of 28 tasks COMPLETE + reviewed clean. tsc 0, suites green throughout.**
  - **WP-1 (COMPLETE)** — 3 migrations live on canonical DB `ssmbegiyjivrcwgcqutu`: `master_unit_codes`+FK (`20260703204512`, Task 1); `master_document_requirements`+16 GCC seeds (`20260703205658`, Task 2); structured addresses on customers_enhanced/companies/suppliers +11 Oman governorates (`20260703210554`, Task 3).
  - **WP-2 (COMPLETE)** — pure TS: Task 4 gcc_tax_invoice profile (c68d357), Task 5 resolveComplianceRenderInputs (1e14831), Task 6 countryTemplateOverride choke point (5f69a6e), Task 7 formatters (be4a6a4).
  - **WP-3 (in progress)** — Task 8 R4 engine wiring done (5330b2c). **NEXT = Task 9.**

## Next step (resume here — the SDD ledger `.superpowers/sdd/progress.md` is the authoritative map; trust it + `git log` over recollection)
1. **Task 9** (credit-note engine adapter + built-in config + unconditional route) — base 5330b2c. Reuses `resolveCountryLayer` (Task 8) + `countryTemplateOverride` (Task 6) + formatters (Task 7). Non-destructive.
2. **Task 10 — DESTRUCTIVE, needs care:** invoice/quote engine cutover + DELETE `src/lib/pdf/documents/{InvoiceDocument,QuoteDocument,CreditNoteDocument}.ts` + remove VITE_PDF_ENGINE_* flags. ONLY after Tasks 8+9 done AND the FINAL legacy↔engine parity pass is green (Step 1) + grep-0 gate. This is the point-of-no-return (AD-4 ceremony compression).
3. Then WP-4 (Tasks 11–16), WP-5 (17–19, migration #4 = the issue_tax_document/issue_credit_note gate), WP-6 (20–22), WP-7 (23–24), WP-8 (25–26, migration #5), WP-9 (27–28), then whole-branch review + finishing-a-development-branch.

## Owner rulings (2026-07-04 — apply these; recorded in the ledger)
1. **Issuance-RPC duplication = FOLLOW PLAN + ADD DRIFT TESTS.** Task 18: re-paste the fact-assembly SQL into issue_credit_note + hardcode notation text in both TS profile and migration SQL AS THE PLAN SAYS, but ADD regression tests asserting (a) the two SQL blocks stay equivalent, (b) TS-vs-SQL notation strings match. The notation constants are exported as `GCC_TAX_INVOICE_NOTATIONS` in `src/lib/regimes/gcc_tax_invoice/index.ts` for the drift test to import.
2. **AD-2 preview dual-path = UNIFY ONTO THE CHOKE POINT.** Task 14: rework so the React preview hook consumes `countryTemplateOverride`'s output (one implementation of title/band), NOT a separate profile.documentTitle re-derivation. DEVIATES from the plan's Task-14 text — implement unified, note for reviewer.

## Key carry-forward items (in the ledger, for the relevant task or final review)
- **Task 12 directive:** define the profile `forcedColumns→visible` column mapping ONCE as a shared helper (real itemCode/unit keys); Task 13 + Task 9 REUSE it (preserves AD-2). `countryTemplateOverride` does NOT thread forcedColumns into its return.
- **Task 27 live fact:** geo_countries.tax_number_label = OM:TRN, AE/SA/BH:"VAT Number"; KW/QA tax_system=NONE. Matrix must assert these ACTUAL values.
- **Reusable probe fact:** set_tenant_and_audit_fields() BEFORE-INSERT trigger blocks no-session MCP inserts before FK/statement checks — insert-probes on tenant tables (esp. Task 25 record_stock_sale) need `SET LOCAL app.bypass_tenant_guard='true'` in a rolled-back tx.
- **RECONCILE-AGAINST-LIVE (mandatory, Phase 0/1 lesson):** Task 18 (issue_tax_document + issue_credit_note) + Task 25 (record_stock_sale) MUST capture live pg_get_functiondef first, edit by anchored insertion, verify byte-identical except intended edits.
- **Controller test-rigor rules** (ledger §CONTROLLER-ENFORCED): use `??` not `||` for monetary fallbacks (Task 12/13 3e); real assertions not tautologies (Task 28 g3); automated rolled-back RAISE-path tests for Task 18 P0403 + Task 26 throws; probe live schema before writing (Task 25 vat_records/document_tax_lines cols, Task 18 credit_notes cols, dataFetcher reads customers_enhanced NOT the customers view).
- **CARRY→final review:** Task 5/6 single-global-slot caches (clearComplianceRenderCache/clearTenantTodayCache) not cleared on tenant impersonation — latent stale-render risk; Task 6 untested LTR-bilingual branch; Task 2 buyer_is_business vs VAT-registered modeling note.

## Plan progress
- Phase 0 (PR #359) + Phase 1 (PR #361) MERGED. resync fix = PR #363 (open). Phase 2 = this branch, 8/28.
- Phases 3–6 plans exist, not started.

## ⚠️ HARD RULE (standing)
Local-first: NO push / gh pr create / remote change until the owner explicitly asks in the moment. Applying **additive** migrations to the canonical DB via mcp__supabase__apply_migration is the established in-scope workflow when executing an owner-authorized migration plan; git push/PR is separately gated. Do NOT run the destructive Task 10 (legacy-builder deletion) unattended.

## Open questions / blockers
- None blocking. Resume at Task 9. The 2 owner rulings above are already decided.
- 2 pre-existing Dependabot high vulns on main (unrelated).
