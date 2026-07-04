# Recovery Workflow Scenarios — Design (2026-07-04)

Extends the standardized case lifecycle (v1.3.0) with three real-world data-recovery
scenarios. Owner-approved decisions in brackets.

## 1. Partial Recovery  [outcome badge, no new statuses]
Not all recoveries are complete. Outcome is DATA (`cases.recovery_outcome`:
`full | partial | unrecoverable | declined`), deliberately separate from the
pipeline status. Surfaced via `OutcomeBadge` on the case header (and reusable on
checkout/reports). Recording a `case_recovery_attempts` row rolls its result up to
`cases.recovery_outcome` (`success→full`, `partial→partial`, `failed/no_data→unrecoverable`)
in `caseQualityService`; staff can still confirm/adjust at delivery.

## 2. Re-Recovery  [linked new case + keep reopen]
A device returns for another attempt (declined first result, or a new method exists).
- Schema: `cases.parent_case_id` (self-FK) + `case_origin` CHECK(`new`,`re_recovery`) + partial index.
- `createReRecoveryCase()` (reuses `duplicateCase`) creates a NEW case at intake with
  fresh custody, copies the device(s), sets `parent_case_id`+`case_origin`, and cross-links
  both cases in `case_job_history` (`rerecovery_created`/`rerecovery_of`). The original is
  untouched — full history preserved.
- "Start Re-Recovery" action shows on terminal cases (delivered/closed/cancelled/no_solution);
  a "Re-recovery" chip on the child links back to the parent. Existing admin reopen edges keep
  same-case continuation.

## 3. No Solution — Future Follow-up  [dedicated phase + structured reason + review queue]
Unrecoverable *today* (unsupported firmware/controller, no method, media damage, tool
unavailable). Device returned, case parked (NOT permanently closed) so no recoverable device
is forgotten when tools improve.
- New phase `no_solution` (phase CHECKs widened to 13) + status "No Solution — Future Follow-up"
  (customer-visible). Distinct from "Cancelled — Unrecoverable" (permanent).
- `master_case_no_solution_reasons` global catalog (6 seeds) + `cases.no_solution_reason_id` +
  `no_solution_notes`.
- Edges: `recovery/diagnosis→no_solution` (gate `no_solution_reason`, enforced in
  `transition_case_status` v4), `no_solution→recovery/diagnosis` (admin reopen),
  `no_solution→closed` (permanent give-up). Device return via normal checkout does NOT
  auto-close a parked case.
- "Mark No Solution" flow captures reason+notes, transitions, and schedules a
  `case_follow_ups` review (default +6 months) surfacing in the follow-up widget. A
  `no_solution` bucket joins the Cases command center; the type is in `TERMINAL_TYPES`
  (excluded from "active"). Structured reason lays groundwork for future capability→reason
  auto-matching (not built now).

## Enforcement / safety
All gates live in the DB (`transition_case_status`, guard trigger, CHECKs, RLS). The
free-form `set_case_status` override can still set `no_solution` freely (staff manual path).
No backfill of existing cases (forward-looking).

## Verification
typecheck 0 · lifecycle/service tests green · SQL: 6 reasons + RLS forced, no_solution status +
5 edges, no_solution_reason gate (23514) · UI smoke of all three flows. See CLAUDE.md v1.4.0.
