# Session Handoff — 2026-07-05 — Localization P3 SHIPPED → next is Phase 4 (India Pack)

## STATUS: Localization Phases 0/1/2/3 are ALL on `main`
- **P3 (Returns / Numbering value / Publish Governance) is COMPLETE and PUSHED to `origin/main` @ `7157cf1`**
  (27 commits: WP-4→7 + carry-forwards, owner-authorized push; rebased onto main over #374/#375, only conflict
  was the manifest append). Full P3 evidence + findings: `docs/superpowers/specs/2026-07-02-p3-exit-evidence.md`.
- What shipped: the **Country Authoring Studio** + `publish_country_pack` 4-part gate + 11 authoring RPCs +
  pg_cron staleness + CLDR import + `zatca_ph1` transport (`einvoiceRouting.ts` retired). **AE + OM published
  `statutory_ready`, SA `formatting_ready`** (honest — SA needs Phase-5 `zatca_ph2`), all via LIVE dual-control publish.
- Reviews: WP-4 → 8 findings fixed; WP-5 → 12 findings fixed; **live runbook execution → 7 more findings** (6 fixed,
  1 owner decision) that the static reviews could not reach. CF review CLEAN.
- The 5 `feat/p3-*` branches are superseded by the rebase (stale SHAs) — deletable.

## NEXT PHASE: Phase 4 — India Pack
**Plan:** `docs/superpowers/plans/2026-07-02-localization-phase4-india-pack.md` (execute via
superpowers:subagent-driven-development / executing-plans, task-by-task). **All entry criteria (Phase 0/1/2/3)
are met and on `main`.**

**Goal:** India → `statutory_ready` as a MULTI-COMPONENT proof that the fiscal kernel *parameterizes, not forks*:
`in_gst` = a one-line delegation to `computeDocumentTax` in `split_by_place_of_supply` mode (CGST+SGST intra-state
vs IGST inter-state decided by kernel from `geo_country_tax_rates` rows, NO India-specific math); GSTIN
multi-registration; HSN/UQC block requirements; FY numbering `INV/{FY}/{SEQ:4}` (04-01 anchor, 16-cap); inclusive
B2C 18/118 back-out + whole-rupee `cash_increment:1`; `gstr` ReturnComposer (GSTR-3B/GSTR-1); TDS withholding on
`record_payment`; `in_irn` IRN artifact (sandbox IRP behind `INDIA_IRP_ENABLED`); '3;2' lakh grouping + indian words.
**HARD GATE:** every statutory fixture must be externally validated by a qualified Indian CA before the machine gate
flips `statutory_ready` (a CA sign-off workflow is part of the plan). India's `geo_countries` row is already
`formatting_ready` (INR ₹ 2dp, GST 18%, GSTIN regex seeded, `digit_grouping '3;2'`, FY 04-01, Asia/Kolkata, en-IN).

**The governed pipeline I just shipped IS the tool** to flip India: author the IN pack via the Studio RPCs
(`create_country_pack_draft` → `upsert_country_tax_rate`/`upsert_document_requirement`/`upsert_country_einvoice_regime`/
`upsert_country_numbering_policy`/`update_country_pack_facts`/`upsert_country_pack_test` → `submit_country_pack_for_review`)
then `publish_country_pack` (dual-control). Plus genuinely-new engine surfaces: GSTR composers, IRN builder, TDS in `record_payment`.

## KEY OPERATIONAL FACTS (verified this session — the next session needs these)
- **Canonical DB `ssmbegiyjivrcwgcqutu`** — pass `project_id` on EVERY Supabase MCP call.
- **Two platform admins for dual-control publish** (both `super_admin` in `platform_admins`, `owner`/tenant NULL in `profiles`):
  A/author `d1139ac6-526c-4805-bbea-790985233725` (support@xsuite.space); B/approver `4db807ae-09f7-4db9-89b4-b7a68cf67fc0` (dev@flowza.ai).
- **Impersonation for governed-RPC testing via MCP** — `SELECT set_config('request.jwt.claims',
  json_build_object('sub',<uid>,'role','authenticated')::text, true);` is transaction-local AND persists across
  statements in ONE `execute_sql` call → resolves `auth.uid()` + `is_platform_admin()` inside SECURITY DEFINER fns.
  Run authoring as A in one DO-block transaction (draft→upserts→record_pack_test_result→submit), then publish as B.
- **`platform_audit_logs.admin_id` FKs `platform_admins.id`** (NOT `auth.uid()` = `.user_id`). `_pack_touch` resolves
  it via `_pack_admin_id()`. Any actor authoring packs must have a `platform_admins` row.
- **Fixture format** = a full `TaxContext` object (seller/buyer/lines/rates/roundingPolicy/rateContext/scaleSystem);
  `runPublishGate(mode:'kernel')` treats `input_document` as a `TaxContext`. One fixture serves both homes (repo
  `src/lib/regimes/simple_vat/fixtures/*.json` wired into `simpleVat.test.ts` + `master_country_pack_tests`).
  Record `pass=true` only when the repo fixture is kernel-green (honest bridge). India needs a NEW `in_gst`
  strategy + its own fixtures + likely a new fixtures test file + CA-validated expecteds.
- GCC live status: **AE + OM `statutory_ready`, SA `formatting_ready`**.

## METHOD (proven; keep using it)
1. **Own every LIVE migration personally** — reconcile-against-live FIRST (`pg_get_functiondef` / column defaults /
   index defs), edit only intended lines, apply, then rolled-back DO-block probes. The plan drifts vs live.
2. **Fan UI/TS/tests out via `Workflow`** (parallel build → integrate → adversarial review per WP). But…
3. **…RUN THE PIPELINE END-TO-END LIVE — do not stop at static review.** This session's single biggest lesson:
   the WP-4 governance RPCs passed a 12-agent adversarial review yet had NEVER been executed; running the AE/SA/OM
   publish runbooks live surfaced a `22P02` blocker crash, an audit-FK `23503`, a QR-suppressing resolver, and a
   non-idempotent upsert — all invisible to static review. For any RPC/gate work, execute it end-to-end.
4. **tsc re-verified UN-PIPED by you each task** (subagents have falsely reported tsc 0). Per-task TDD (RED→GREEN).
5. **Adversarial review per WP** (Workflow: N lenses → verify each finding against live defs).

## STANDING RULES
- Additive migrations only (no DROP/DELETE; soft-delete). Regen types after every migration (`npm run db:types`,
  project `ssmbegiyjivrcwgcqutu`). Append a manifest row per migration. tsc must stay 0.
- Semantic theme tokens + lucide only; read `DESIGN.md` before visual changes. No `if (countryCode===…)` outside
  `src/lib/regimes/`; no ad-hoc money splits (use `allocateLargestRemainder`).
- **Fresh branch from `main` per the plan** (`feat/localization-phase4-india-pack`); PRs squash-merge; never reuse a
  merged branch. `.superpowers/sdd/progress.md` is gitignored — this file + git log + the plan are the map.
- **Local-first (`dev-workflow-local-first`): commit locally, push only when the owner asks in the moment.** The P3
  push this turn was explicitly authorized; that authorization does NOT carry forward.

## OPEN OWNER DECISION (belongs to Phase 5, not Phase 4)
**SA `statutory_ready`** is blocked only by `zatca_ph2` (ZATCA Phase-2 clearance), which is unimplemented and honestly
degraded to `formatting_ready`. Phase 5 (`…-phase5-us-uk-zatca-p2.md`) implements the clearance transport. Decision:
implement Phase-2 clearance, or scope the Phase-2 capability to the tenants it legally binds. SA's Phase-1 QR already emits (CF-5).
