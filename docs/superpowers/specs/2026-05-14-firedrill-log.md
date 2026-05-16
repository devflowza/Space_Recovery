# Schema Discipline — Fire Drill Log

Each row records a deliberate failure injected into the codebase to verify a CI guardrail catches the target failure mode. Logged once per guardrail. See spec §7.2 for the complete drill protocol.

| Date | Guardrail | Result | Notes |
|------|-----------|--------|-------|
| 2026-05-14 | G1 ratchet | PASS | Deliberate `const __ratchet_test: number = 'oops'` in `src/__ratchet_test.ts` raised tsc count from 3138 to 3140 (TS2322 type-mismatch + TS6133 unused-decl under strict noUnusedLocals); `bash scripts/check-tsc.sh` exited 1 with `FAIL: tsc errors increased (3138 to 3140)`. Cleanup restored baseline to 3138 with `OK: tsc errors unchanged at 3138`. |
| 2026-05-16 | G1 ratchet (re-verify, Task 6.11) | PASS | `export const __fd: number = 'oops'` in `src/__fd.ts` raised count from 3138 to 3139 (TS2322); `bash scripts/check-tsc.sh` exited 1 with `FAIL: tsc errors increased (3138 to 3139)`. Cleanup restored baseline; check reported `OK: tsc errors unchanged at 3138`. |
| 2026-05-16 | G3 banned-names | DEFERRED | Infrastructure not present in this worktree (`eslint-rules/banned-tables.js`, `no-banned-embeds-in-select.js`, and the lint rule wiring in `eslint.config.js` are owned by a parallel agent and have not landed here). Created `src/__fd3.ts` with `.from('device_types')` as planned, but no rule exists to fire. Removed test file. Re-run after the G3 infrastructure PR merges. |
| 2026-05-16 | G6 .from() allowlist | DEFERRED | Infrastructure not present in this worktree (`scripts/check-from-table-names.sh` and its allowlist source-of-truth file have not landed). Created `src/__fd6.ts` with `.from('totally_made_up_table')` as planned, but no checker exists. Removed test file. Re-run after the G6 infrastructure PR merges. |
| 2026-05-16 | G2 schema-drift | NOT RUN LOCALLY | Requires DB credentials + `scripts/check-schema-drift.sh` (not yet landed). Exercise in CI when G2 lands. |
| 2026-05-16 | G4 tenant-table requirements | NOT RUN LOCALLY | Requires DB credentials + `scripts/check-tenant-table-requirements.sh` + `.sql` (not yet landed). Exercise in CI when G4 lands. |
| 2026-05-16 | G5 migration manifest | NOT RUN LOCALLY | Requires `scripts/check-migration-manifest.sh` + `supabase/migrations.manifest.md` (not yet landed). Exercise in CI when G5 lands. |

## Task 6.12 — Final audit re-grep (2026-05-16)

| Check | Result |
|---|---|
| Bare-name `.from('<legacy>')` | CLEAN — zero matches across `src/` for the canonical banned set (`device_types`, `brands`, `capacities`, `service_types`, `countries`, `cities`, `industries`, `supplier_categories`, `purchase_order_statuses`, `inventory_status_types`). |
| Bare-name embeds `<legacy>!fk(...)` in `.select()` | 1 LEFTOVER — `src/lib/reportPDFService.ts:327` still embeds `service_types!service_type_id(name)`. Pre-existing (last touched in `62fc0aa fix(schema): customer-creation 403`); not a regression introduced by Phase 6. Phase-2-5 column-cleanup follow-up — file a tracked todo to swap it for `catalog_service_types`. |
| Legacy types import `from '.../types/database'` | CLEAN — zero matches; `src/types/database.ts` already deleted upstream. |
| `bash scripts/check-tsc.sh` | OK at 3138 (worktree baseline). Final-target ratchet of 762 is tracked in the design spec but not yet locked in `tsc-baseline.count` here; that file is updated by the controller after Phases 2-5 merge. |
