-- Normalize cases.recovery_outcome onto the canonical checkout vocabulary
-- (full | partial | unrecoverable | declined). Live data carried a third
-- legacy label set ('Recovered', 'Partially Recovered', 'Not Recovered') and
-- blank strings, which the lifecycle remap's COALESCE correctly preserved —
-- this pass translates them and then fills outcomes implied by legacy status.

UPDATE cases SET recovery_outcome = 'full'     WHERE recovery_outcome = 'Recovered';
UPDATE cases SET recovery_outcome = 'partial'  WHERE recovery_outcome = 'Partially Recovered';
-- Verified live: every 'Not Recovered' row is Cancelled — Customer Declined.
UPDATE cases SET recovery_outcome = 'declined' WHERE recovery_outcome = 'Not Recovered';
UPDATE cases SET recovery_outcome = NULL       WHERE btrim(COALESCE(recovery_outcome, '')) = '';

-- Outcomes implied by the pre-standardization status, where still unset.
UPDATE cases SET recovery_outcome = 'unrecoverable'
WHERE recovery_outcome IS NULL AND legacy_status IN ('Unrecoverable', 'Cancelled - Not Recoverable');
UPDATE cases SET recovery_outcome = 'partial'
WHERE recovery_outcome IS NULL AND legacy_status IN ('Delivered Partially', 'Completed Partially');
UPDATE cases SET recovery_outcome = 'full'
WHERE recovery_outcome IS NULL AND legacy_status = 'Completed Successfully';
