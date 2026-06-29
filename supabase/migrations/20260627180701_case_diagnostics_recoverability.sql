-- Document Studio (2026-06-27): recoverability assessment on the diagnosis record.
-- The evaluation report's headline indicator (engineer-set % + category). Additive,
-- nullable, table empty -> zero data risk. Activates case_diagnostics writes via the
-- new diagnosis capture UI (the table was already RLS/trigger-ready, just unwritten).

ALTER TABLE case_diagnostics
  ADD COLUMN recoverability_pct integer
    CHECK (recoverability_pct IS NULL OR (recoverability_pct >= 0 AND recoverability_pct <= 100)),
  ADD COLUMN recoverability_assessment text
    CHECK (recoverability_assessment IS NULL OR recoverability_assessment IN
      ('fully_recoverable','partially_recoverable','unrecoverable','requires_donor','pending'));

COMMENT ON COLUMN case_diagnostics.recoverability_pct IS 'Engineer-assessed recoverability percentage (0-100); drives the evaluation report recoverability bar.';
COMMENT ON COLUMN case_diagnostics.recoverability_assessment IS 'Recoverability category: fully_recoverable | partially_recoverable | unrecoverable | requires_donor | pending.';
