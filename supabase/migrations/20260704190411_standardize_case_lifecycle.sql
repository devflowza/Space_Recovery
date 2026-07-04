-- ═══════════════════════════════════════════════════════════════════════════
-- Standardize the case lifecycle: canonical statuses, closed phase, QA-optional
-- per tenant, full legacy remap.
--   0. Widen phase CHECK constraints with 'closed' ('completed' stays legal for
--      the deactivated legacy rows that still carry it)
--   1. Reshape master_case_statuses (rename/retype in place, insert, deactivate)
--   2. Rebuild case_status_transitions to the 22-edge matrix
--   3. cases.legacy_status archival column + backfill
--   4. Remap all legacy-status cases (status, status_id, phase_entered_at,
--      derived recovery_outcome) + one case_job_history row per changed case
--   5. transition_case_status v3 (QA tenant gate, reason + device_returned
--      enforcement, recovery evidence token simplified)
--   6. guard_cases_status_changes → BEFORE INSERT OR UPDATE
--   7. Prune legacy keys from company_settings.metadata.case_status_types
--   8. log_case_checkout tail targets closed (device return ends the case)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT set_config('app.bypass_status_guard', 'true', true);
SELECT set_config('app.bypass_tenant_guard', 'true', true);

-- ── 0. Phase vocabulary CHECK constraints ───────────────────────────────────
ALTER TABLE master_case_statuses DROP CONSTRAINT IF EXISTS master_case_statuses_type_check;
ALTER TABLE master_case_statuses ADD CONSTRAINT master_case_statuses_type_check
  CHECK (type = ANY (ARRAY['intake','diagnosis','quoting','awaiting_approval','approved','recovery','qa','ready','completed','delivered','closed','cancelled']));

ALTER TABLE case_status_transitions DROP CONSTRAINT IF EXISTS case_status_transitions_from_check;
ALTER TABLE case_status_transitions ADD CONSTRAINT case_status_transitions_from_check
  CHECK (from_phase = ANY (ARRAY['intake','diagnosis','quoting','awaiting_approval','approved','recovery','qa','ready','completed','delivered','closed','cancelled']));

ALTER TABLE case_status_transitions DROP CONSTRAINT IF EXISTS case_status_transitions_to_check;
ALTER TABLE case_status_transitions ADD CONSTRAINT case_status_transitions_to_check
  CHECK (to_phase = ANY (ARRAY['intake','diagnosis','quoting','awaiting_approval','approved','recovery','qa','ready','completed','delivered','closed','cancelled']));

-- ── 1. master_case_statuses ─────────────────────────────────────────────────
UPDATE master_case_statuses SET type='intake',            color='#3b82f6', sort_order=10,  is_default=true,  customer_visible=true,  is_active=true, updated_at=now() WHERE name='Registered';
UPDATE master_case_statuses SET name='Device Received',   type='intake',            color='#0ea5e9', sort_order=20,  is_default=false, customer_visible=true,  is_active=true, updated_at=now() WHERE name='Received';
UPDATE master_case_statuses SET name='In Diagnosis',      type='diagnosis',         color='#06b6d4', sort_order=30,  is_default=false, customer_visible=true,  is_active=true, updated_at=now() WHERE name='Diagnosis in Progress';
UPDATE master_case_statuses SET name='Preparing Quote',   type='quoting',           color='#f59e0b', sort_order=40,  is_default=false, customer_visible=true,  is_active=true, updated_at=now() WHERE name='Quote Prepared';
UPDATE master_case_statuses SET name='Awaiting Customer Approval', type='awaiting_approval', color='#f97316', sort_order=50, is_default=false, customer_visible=true, is_active=true, updated_at=now() WHERE name='Awaiting Client Approval';
UPDATE master_case_statuses SET name='Approved — In Queue', type='approved',        color='#14b8a6', sort_order=60,  is_default=false, customer_visible=true,  is_active=true, updated_at=now() WHERE name='Approved - In Queue';
UPDATE master_case_statuses SET type='recovery',          color='#0d9488', sort_order=70,  is_default=false, customer_visible=true,  is_active=true, updated_at=now() WHERE name='Recovery in Progress';
UPDATE master_case_statuses SET name='Verification (QA)', type='qa',                color='#0891b2', sort_order=80,  is_default=false, customer_visible=false, is_active=true, updated_at=now() WHERE name='Verification & QC';
UPDATE master_case_statuses SET name='Ready for Delivery', type='ready',            color='#10b981', sort_order=90,  is_default=false, customer_visible=true,  is_active=true, updated_at=now() WHERE name='Ready for Pickup';
UPDATE master_case_statuses SET name='Data Delivered',    type='delivered',         color='#22c55e', sort_order=100, is_default=false, customer_visible=true,  is_active=true, updated_at=now() WHERE name='Delivered';
UPDATE master_case_statuses SET name='Cancelled — Customer Declined', type='cancelled', color='#6b7280', sort_order=120, is_default=false, customer_visible=true, is_active=true, updated_at=now() WHERE name='Cancelled by Client';
UPDATE master_case_statuses SET name='Cancelled — Unrecoverable', type='cancelled',  color='#ef4444', sort_order=125, is_default=false, customer_visible=true,  is_active=true, updated_at=now() WHERE name='Cancelled - Not Recoverable';

INSERT INTO master_case_statuses (name, type, color, sort_order, is_default, is_active, customer_visible)
VALUES
  ('On Hold — Awaiting Parts',  'recovery', '#d97706', 75,  false, true, false),
  ('Closed — Device Returned',  'closed',   '#64748b', 110, false, true, true),
  ('Closed — Media Disposed',   'closed',   '#475569', 115, false, true, false)
ON CONFLICT (name) DO UPDATE
  SET type=EXCLUDED.type, color=EXCLUDED.color, sort_order=EXCLUDED.sort_order,
      is_active=true, customer_visible=EXCLUDED.customer_visible, updated_at=now();

UPDATE master_case_statuses SET is_active=false, updated_at=now()
WHERE name IN ('Initial Assessment','Data Transfer','Completed - Success','Completed - Partial','Completed - Failed','Cancelled-Currently No Solution');

-- ── 2. case_status_transitions → 22-edge matrix ─────────────────────────────
WITH desired(from_phase, to_phase, allowed_roles, requires, sort_order, description) AS (VALUES
  ('intake','diagnosis',          ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                10, 'Devices received and logged — begin assessment'),
  ('intake','cancelled',          ARRAY['technician','manager','admin','owner'], ARRAY['cancellation_reason'],   15, 'Cancel before assessment'),
  ('diagnosis','quoting',         ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                20, 'Diagnosis complete — prepare the quote'),
  ('diagnosis','cancelled',       ARRAY['technician','manager','admin','owner'], ARRAY['cancellation_reason'],   25, 'Cancel during diagnosis'),
  ('quoting','awaiting_approval', ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                30, 'Quote sent to the customer'),
  ('quoting','cancelled',         ARRAY['technician','manager','admin','owner'], ARRAY['cancellation_reason'],   35, 'Cancel during quoting'),
  ('awaiting_approval','approved',ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                40, 'Customer approved the quote'),
  ('awaiting_approval','quoting', ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                42, 'Revise the quote'),
  ('awaiting_approval','cancelled',ARRAY['technician','manager','admin','owner'],ARRAY['cancellation_reason'],   45, 'Customer declined the quote'),
  ('approved','recovery',         ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                50, 'Begin recovery work'),
  ('approved','cancelled',        ARRAY['technician','manager','admin','owner'], ARRAY['cancellation_reason'],   55, 'Cancel before recovery starts'),
  ('recovery','qa',               ARRAY['technician','manager','admin','owner'], ARRAY['recovery_outcome'],      60, 'Recovery attempt recorded — send to QA verification'),
  ('recovery','ready',            ARRAY['technician','manager','admin','owner'], ARRAY['recovery_outcome'],      65, 'Recovery complete — prepare deliverables (skips QA)'),
  ('recovery','cancelled',        ARRAY['technician','manager','admin','owner'], ARRAY['cancellation_reason'],   68, 'Unrecoverable, or the customer stopped the work'),
  ('qa','ready',                  ARRAY['technician','manager','admin','owner'], ARRAY['qa_passed'],             70, 'QA passed — prepare deliverables'),
  ('qa','recovery',               ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                72, 'QA failed — return to recovery for rework'),
  ('ready','delivered',           ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                80, 'Release recovered data to the customer'),
  ('delivered','closed',          ARRAY['technician','manager','admin','owner'], ARRAY['device_returned'],       85, 'Devices returned — close the case'),
  ('cancelled','closed',          ARRAY['technician','manager','admin','owner'], ARRAY['device_returned'],       88, 'Devices returned — close the cancelled case'),
  ('cancelled','intake',          ARRAY['admin','owner'],                        ARRAY['reopen_reason'],         90, 'Reopen a cancelled case'),
  ('delivered','recovery',        ARRAY['admin','owner'],                        ARRAY['reopen_reason'],         92, 'Reopen after delivery (rework)'),
  ('closed','recovery',           ARRAY['admin','owner'],                        ARRAY['reopen_reason'],         94, 'Reopen a closed case (rework)')
)
UPDATE case_status_transitions t
SET allowed_roles=d.allowed_roles, requires=d.requires, sort_order=d.sort_order,
    description=d.description, is_active=true
FROM desired d
WHERE t.from_phase=d.from_phase AND t.to_phase=d.to_phase;

WITH desired(from_phase, to_phase, allowed_roles, requires, sort_order, description) AS (VALUES
  ('intake','diagnosis',          ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                10, 'Devices received and logged — begin assessment'),
  ('intake','cancelled',          ARRAY['technician','manager','admin','owner'], ARRAY['cancellation_reason'],   15, 'Cancel before assessment'),
  ('diagnosis','quoting',         ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                20, 'Diagnosis complete — prepare the quote'),
  ('diagnosis','cancelled',       ARRAY['technician','manager','admin','owner'], ARRAY['cancellation_reason'],   25, 'Cancel during diagnosis'),
  ('quoting','awaiting_approval', ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                30, 'Quote sent to the customer'),
  ('quoting','cancelled',         ARRAY['technician','manager','admin','owner'], ARRAY['cancellation_reason'],   35, 'Cancel during quoting'),
  ('awaiting_approval','approved',ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                40, 'Customer approved the quote'),
  ('awaiting_approval','quoting', ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                42, 'Revise the quote'),
  ('awaiting_approval','cancelled',ARRAY['technician','manager','admin','owner'],ARRAY['cancellation_reason'],   45, 'Customer declined the quote'),
  ('approved','recovery',         ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                50, 'Begin recovery work'),
  ('approved','cancelled',        ARRAY['technician','manager','admin','owner'], ARRAY['cancellation_reason'],   55, 'Cancel before recovery starts'),
  ('recovery','qa',               ARRAY['technician','manager','admin','owner'], ARRAY['recovery_outcome'],      60, 'Recovery attempt recorded — send to QA verification'),
  ('recovery','ready',            ARRAY['technician','manager','admin','owner'], ARRAY['recovery_outcome'],      65, 'Recovery complete — prepare deliverables (skips QA)'),
  ('recovery','cancelled',        ARRAY['technician','manager','admin','owner'], ARRAY['cancellation_reason'],   68, 'Unrecoverable, or the customer stopped the work'),
  ('qa','ready',                  ARRAY['technician','manager','admin','owner'], ARRAY['qa_passed'],             70, 'QA passed — prepare deliverables'),
  ('qa','recovery',               ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                72, 'QA failed — return to recovery for rework'),
  ('ready','delivered',           ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],                80, 'Release recovered data to the customer'),
  ('delivered','closed',          ARRAY['technician','manager','admin','owner'], ARRAY['device_returned'],       85, 'Devices returned — close the case'),
  ('cancelled','closed',          ARRAY['technician','manager','admin','owner'], ARRAY['device_returned'],       88, 'Devices returned — close the cancelled case'),
  ('cancelled','intake',          ARRAY['admin','owner'],                        ARRAY['reopen_reason'],         90, 'Reopen a cancelled case'),
  ('delivered','recovery',        ARRAY['admin','owner'],                        ARRAY['reopen_reason'],         92, 'Reopen after delivery (rework)'),
  ('closed','recovery',           ARRAY['admin','owner'],                        ARRAY['reopen_reason'],         94, 'Reopen a closed case (rework)')
)
INSERT INTO case_status_transitions (from_phase, to_phase, allowed_roles, requires, sort_order, description, is_active)
SELECT d.from_phase, d.to_phase, d.allowed_roles, d.requires, d.sort_order, d.description, true
FROM desired d
WHERE NOT EXISTS (
  SELECT 1 FROM case_status_transitions t
  WHERE t.from_phase=d.from_phase AND t.to_phase=d.to_phase
);

UPDATE case_status_transitions SET is_active=false
WHERE (from_phase='recovery'  AND to_phase='completed')
   OR (from_phase='qa'        AND to_phase='completed')
   OR (from_phase='completed');

-- ── 3. Archival column ──────────────────────────────────────────────────────
ALTER TABLE cases ADD COLUMN IF NOT EXISTS legacy_status text;
COMMENT ON COLUMN cases.legacy_status IS 'Original pre-standardization status text (2026-07 lifecycle migration); frozen.';
UPDATE cases SET legacy_status = status WHERE legacy_status IS NULL AND status IS NOT NULL;

-- ── 4. Remap all cases ──────────────────────────────────────────────────────
WITH mapping(legacy, new_name, outcome) AS (VALUES
  ('Returned',                      'Closed — Device Returned',    NULL),
  ('Delivered',                     'Data Delivered',              NULL),
  ('Waiting for Approval',          'Awaiting Customer Approval',  NULL),
  ('Cancelled',                     'Cancelled — Customer Declined', NULL),
  ('Under Inspection',              'In Diagnosis',                NULL),
  ('Unrecoverable',                 'Cancelled — Unrecoverable',   'unrecoverable'),
  ('Approved',                      'Approved — In Queue',         NULL),
  ('Received',                      'Device Received',             NULL),
  ('Completed Successfully',        'Ready for Delivery',          'full'),
  ('Delivered Partially',           'Data Delivered',              'partial'),
  ('MOVED TO 3K SERIES 2026',       'Closed — Device Returned',    NULL),
  ('Ready for Delivery',            'Ready for Delivery',          NULL),
  ('Registered',                    'Registered',                  NULL),
  ('Waiting for Data Verification', 'Verification (QA)',           NULL),
  ('Completed Partially',           'Ready for Delivery',          'partial'),
  ('Waiting for Client''s Reply',   'Awaiting Customer Approval',  NULL),
  ('Cancelled - Not Recoverable',   'Cancelled — Unrecoverable',   'unrecoverable'),
  ('Diagnosis in Progress',         'In Diagnosis',                NULL))
UPDATE cases c
SET status = m.new_name,
    status_id = s.id,
    recovery_outcome = COALESCE(c.recovery_outcome, m.outcome),
    phase_entered_at = COALESCE(c.phase_entered_at, c.updated_at)
FROM mapping m
JOIN master_case_statuses s ON s.name = m.new_name AND s.is_active
WHERE c.status = m.legacy;

-- Defensive sweep: link any remaining exact-name matches.
UPDATE cases c
SET status_id = s.id,
    phase_entered_at = COALESCE(c.phase_entered_at, c.updated_at)
FROM master_case_statuses s
WHERE c.status_id IS NULL AND s.is_active AND s.name = c.status;

DO $$
DECLARE v_bad int;
BEGIN
  SELECT count(*) INTO v_bad
  FROM cases c LEFT JOIN master_case_statuses s ON s.id = c.status_id
  WHERE c.deleted_at IS NULL
    AND (c.status_id IS NULL OR s.is_active IS NOT TRUE OR s.name <> c.status);
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'lifecycle remap left % unlinked or mismatched live cases', v_bad;
  END IF;
END $$;

-- 4b. Append-only audit rows for every changed case.
INSERT INTO case_job_history (tenant_id, case_id, action, old_value, new_value, performed_by, details)
SELECT c.tenant_id, c.id, 'status_standardized', c.legacy_status, c.status, NULL,
       jsonb_build_object('migration','standardize_case_lifecycle','from',c.legacy_status,'to',c.status)::text
FROM cases c
WHERE c.legacy_status IS DISTINCT FROM c.status;

-- ── 5. transition_case_status v3 ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.transition_case_status(p_case_id uuid, p_to_status_id uuid, p_reason text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_case          cases%ROWTYPE;
  v_from_status   master_case_statuses%ROWTYPE;
  v_to_status     master_case_statuses%ROWTYPE;
  v_transition    case_status_transitions%ROWTYPE;
  v_caller_role   text;
  v_caller_tenant uuid;
  v_details       text;
  v_payload       jsonb;
BEGIN
  SELECT role, tenant_id INTO v_caller_role, v_caller_tenant FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL THEN RAISE EXCEPTION 'Unauthenticated' USING ERRCODE = '28000'; END IF;

  SELECT * INTO v_case FROM cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id USING ERRCODE = 'P0002'; END IF;
  IF v_case.tenant_id != v_caller_tenant AND NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Case % belongs to a different tenant', p_case_id USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_to_status FROM master_case_statuses WHERE id = p_to_status_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target status % not found', p_to_status_id USING ERRCODE = 'P0002'; END IF;

  IF v_case.status_id IS NOT NULL THEN
    SELECT * INTO v_from_status FROM master_case_statuses WHERE id = v_case.status_id;
  ELSE
    SELECT * INTO v_from_status FROM master_case_statuses WHERE type = 'intake' ORDER BY sort_order LIMIT 1;
  END IF;

  IF v_from_status.id = v_to_status.id THEN
    RETURN jsonb_build_object('ok', true, 'case_id', v_case.id, 'no_op', true,
      'status_id', v_to_status.id, 'phase', v_to_status.type);
  END IF;

  -- Tenant QA gate: entering the qa phase is refused when the tenant has the
  -- QA feature disabled (workflow.stage.qa in tenants.feature_flags; fail-open).
  IF v_to_status.type = 'qa' AND v_from_status.type IS DISTINCT FROM 'qa'
     AND NOT COALESCE(tenant_feature_enabled(v_case.tenant_id, 'workflow.stage.qa'), true) THEN
    RAISE EXCEPTION 'Cannot enter "%": the QA stage is disabled for this workspace (Settings → Features & Modules).',
      v_to_status.name USING ERRCODE = '23514', HINT = 'qa_disabled';
  END IF;

  IF v_from_status.type = v_to_status.type THEN
    -- Intra-phase lateral move (same lifecycle phase, different sub-status).
    -- No phase boundary is crossed, so case_status_transitions has no row for it
    -- and the evidence gates do not apply. Staff-gated; v_transition stays NULL.
    IF NOT (v_caller_role = ANY (ARRAY['technician','manager','admin','owner'])) AND NOT is_platform_admin() THEN
      RAISE EXCEPTION 'Role % is not permitted to change status within the % phase',
        v_caller_role, v_from_status.type USING ERRCODE = '42501';
    END IF;
  ELSE
    SELECT * INTO v_transition FROM case_status_transitions
    WHERE from_phase = v_from_status.type AND to_phase = v_to_status.type AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Transition % → % is not allowed', v_from_status.type, v_to_status.type USING ERRCODE = '23514';
    END IF;

    IF NOT (v_caller_role = ANY(v_transition.allowed_roles)) AND NOT is_platform_admin() THEN
      RAISE EXCEPTION 'Role % is not permitted to perform % → % transition',
        v_caller_role, v_from_status.type, v_to_status.type USING ERRCODE = '42501';
    END IF;

    -- Reason-required edges (cancellations and admin reopens).
    IF 'cancellation_reason' = ANY(v_transition.requires) AND NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Cannot enter "%": a cancellation reason is required.',
        v_to_status.name USING ERRCODE = '23514', HINT = 'cancellation_reason';
    END IF;
    IF 'reopen_reason' = ANY(v_transition.requires) AND NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Cannot enter "%": a reopen reason is required.',
        v_to_status.name USING ERRCODE = '23514', HINT = 'reopen_reason';
    END IF;

    -- Evidence gate: QA sign-off.
    IF 'qa_passed' = ANY(v_transition.requires) THEN
      IF NOT EXISTS (
        SELECT 1 FROM case_qa_checklists
        WHERE case_id = p_case_id AND status = 'passed' AND deleted_at IS NULL
      ) THEN
        RAISE EXCEPTION 'Cannot enter "%": QA has not passed. Record a passed QA checklist for this case first.',
          v_to_status.name USING ERRCODE = '23514', HINT = 'qa_passed';
      END IF;
    END IF;

    -- Evidence gate: a recovery attempt with an outcome must be recorded.
    IF 'recovery_outcome' = ANY(v_transition.requires) THEN
      IF NOT EXISTS (
        SELECT 1 FROM case_recovery_attempts
        WHERE case_id = p_case_id AND result IS NOT NULL AND deleted_at IS NULL
      ) THEN
        RAISE EXCEPTION 'Cannot enter "%": no recovery attempt with an outcome has been recorded for this case.',
          v_to_status.name USING ERRCODE = '23514', HINT = 'recovery_recorded';
      END IF;
    END IF;

    -- Custody gate: closing requires every device to be checked out (returned).
    IF 'device_returned' = ANY(v_transition.requires) THEN
      IF EXISTS (
        SELECT 1 FROM case_devices
        WHERE case_id = p_case_id AND deleted_at IS NULL AND checked_out_at IS NULL
      ) THEN
        RAISE EXCEPTION 'Cannot enter "%": all devices must be checked out to the customer first.',
          v_to_status.name USING ERRCODE = '23514', HINT = 'device_returned';
      END IF;
    END IF;

    -- Payment-before-release gate (tenant opt-in, default OFF). Releasing recovered
    -- data before payment is the lab's most expensive operational mistake. Reads the
    -- flag with an explicit FALSE default so tenants that have not enabled it are
    -- entirely unaffected.
    IF v_to_status.type = 'delivered' THEN
      IF COALESCE(
           (SELECT (feature_flags ->> 'gate.payment_before_release')::boolean
              FROM tenants WHERE id = v_case.tenant_id),
           false) THEN
        IF EXISTS (
          SELECT 1 FROM invoices
          WHERE case_id = p_case_id
            AND deleted_at IS NULL
            AND COALESCE(is_proforma, false) = false
            AND COALESCE(balance_due, 0) > 0
        ) THEN
          RAISE EXCEPTION 'Cannot enter "%": the case has an outstanding invoice balance. Record payment before releasing recovered data.',
            v_to_status.name USING ERRCODE = '23514', HINT = 'payment_outstanding';
        END IF;
      END IF;
    END IF;
  END IF;

  PERFORM set_config('app.bypass_status_guard', 'true', true);
  UPDATE cases
    SET status_id = v_to_status.id, status = v_to_status.name,
        phase_entered_at = now(), updated_at = now(),
        actual_completion = CASE WHEN v_to_status.type = 'delivered' THEN now()
                                 ELSE actual_completion END
    WHERE id = p_case_id;
  PERFORM set_config('app.bypass_status_guard', '', true);

  v_details := jsonb_build_object(
    'from_phase', v_from_status.type, 'to_phase', v_to_status.type,
    'reason', p_reason, 'notes', p_notes, 'transition_id', v_transition.id
  )::text;

  INSERT INTO case_job_history (case_id, action, old_value, new_value, performed_by, details)
  VALUES (p_case_id, 'status_changed', v_from_status.name, v_to_status.name, auth.uid(), v_details);

  v_payload := jsonb_build_object(
    'case_id', p_case_id, 'case_no', v_case.case_no,
    'from_status_id', v_from_status.id, 'from_status_name', v_from_status.name, 'from_phase', v_from_status.type,
    'to_status_id', v_to_status.id, 'to_status_name', v_to_status.name, 'to_phase', v_to_status.type,
    'customer_id', v_case.customer_id, 'assigned_engineer_id', v_case.assigned_engineer_id,
    'reason', p_reason, 'notes', p_notes
  );

  PERFORM emit_notification_event(
    'case.phase_changed', 'case', p_case_id, v_payload,
    'case.phase_changed:' || p_case_id::text || ':' || v_to_status.id::text || ':' || extract(epoch from now())::text
  );

  IF v_to_status.customer_visible AND v_case.customer_id IS NOT NULL THEN
    PERFORM emit_notification_event(
      'case.phase_changed.customer', 'case', p_case_id, v_payload,
      'case.phase_changed.customer:' || p_case_id::text || ':' || v_to_status.id::text || ':' || extract(epoch from now())::text
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'case_id', v_case.id,
    'from_status_id', v_from_status.id, 'from_phase', v_from_status.type,
    'to_status_id', v_to_status.id, 'to_phase', v_to_status.type
  );
END;
$function$;

-- ── 6. Guard trigger → BEFORE INSERT OR UPDATE ──────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_cases_status_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_bypass boolean;
  v_ok     boolean;
BEGIN
  v_bypass := current_setting('app.bypass_status_guard', true) = 'true'
           OR current_setting('app.importing', true) = 'true';

  IF TG_OP = 'INSERT' THEN
    IF v_bypass THEN RETURN NEW; END IF;
    IF NEW.status IS NULL AND NEW.status_id IS NULL THEN RETURN NEW; END IF;

    SELECT EXISTS (
      SELECT 1 FROM master_case_statuses s
      WHERE s.id = NEW.status_id AND s.is_active AND s.type = 'intake' AND s.name = NEW.status
    ) INTO v_ok;
    IF v_ok THEN RETURN NEW; END IF;

    RAISE EXCEPTION USING
      MESSAGE = 'New cases must start at an active intake status with matching status_id and status name. Use the intake status from master_case_statuses (type=''intake'').',
      ERRCODE = '42501',
      HINT = 'Set both status_id and status to an active type=''intake'' row, or leave both NULL.';
  END IF;

  IF (NEW.status IS DISTINCT FROM OLD.status OR NEW.status_id IS DISTINCT FROM OLD.status_id) THEN
    IF v_bypass THEN
      -- Allowed: this UPDATE is inside transition_case_status RPC's
      -- session-local bypass window. No further checks.
      RETURN NEW;
    END IF;

    RAISE EXCEPTION USING
      MESSAGE = 'Direct cases.status / cases.status_id modification is not permitted. Call transition_case_status(case_id, status_id, reason, notes) RPC instead.',
      ERRCODE = '42501',
      HINT = 'The state machine guards transitions for audit + event emission. If this is an emergency repair, run SELECT set_config(''app.bypass_status_guard'', ''true'', true) before the UPDATE in the same transaction.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_cases_status_changes ON cases;
CREATE TRIGGER trg_guard_cases_status_changes
  BEFORE INSERT OR UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION guard_cases_status_changes();

-- ── 7. Prune legacy keys from tenant lifecycle overrides ────────────────────
UPDATE company_settings
SET metadata = jsonb_set(
  metadata, '{case_status_types}',
  COALESCE(
    (SELECT jsonb_object_agg(e.k, e.v)
     FROM jsonb_each(metadata -> 'case_status_types') AS e(k, v)
     WHERE e.k NOT IN (
       'Returned','Delivered','Waiting for Approval','Cancelled','Under Inspection',
       'Unrecoverable','Approved','Received','Completed Successfully','Delivered Partially',
       'MOVED TO 3K SERIES 2026','Ready for Delivery','Registered',
       'Waiting for Data Verification','Completed Partially','Waiting for Client''s Reply',
       'Cancelled - Not Recoverable','Diagnosis in Progress')),
    '{}'::jsonb))
WHERE metadata ? 'case_status_types';

-- ── 8. log_case_checkout: device return drives the case to closed ───────────
CREATE OR REPLACE FUNCTION public.log_case_checkout(p_case_id uuid, p_collector_name text, p_collector_mobile text, p_collector_id text DEFAULT NULL::text, p_recovery_outcome text DEFAULT NULL::text, p_device_ids uuid[] DEFAULT NULL::uuid[], p_collector_relationship text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
  v_details text;
  v_delivered_status_id uuid;
  v_closed_status_id uuid;
  v_phase text;
  v_now timestamptz := now();
  v_from_person text;
  v_actor_role text;
  v_device_id uuid;
  v_checkout_meta jsonb;
  v_batch_id uuid := gen_random_uuid();
  v_remaining int;
BEGIN
  v_tenant_id := get_current_tenant_id();
  SELECT full_name, role INTO v_from_person, v_actor_role FROM profiles WHERE id = auth.uid();
  v_from_person := COALESCE(v_from_person, 'Lab');

  -- Chain-of-custody gate: an agent / company rep / courier collecting on behalf
  -- of the customer must present a National ID. A NULL relationship (legacy
  -- callers / "customer collects") is not gated, keeping this backward-compatible.
  IF p_collector_relationship IS NOT NULL
     AND p_collector_relationship <> 'self'
     AND COALESCE(btrim(p_collector_id), '') = '' THEN
    RAISE EXCEPTION 'A National ID / passport is required when the collector is not the customer (relationship: %)', p_collector_relationship
      USING ERRCODE = 'check_violation';
  END IF;

  v_details := json_build_object(
    'collector_name', p_collector_name,
    'collector_mobile', p_collector_mobile,
    'collector_id', p_collector_id,
    'collector_relationship', p_collector_relationship,
    'recovery_outcome', p_recovery_outcome,
    'device_ids', p_device_ids,
    'batch_id', v_batch_id
  )::text;

  v_checkout_meta := jsonb_strip_nulls(jsonb_build_object(
    'collector_name', p_collector_name,
    'collector_mobile', p_collector_mobile,
    'collector_id', p_collector_id,
    'collector_relationship', p_collector_relationship,
    'recovery_outcome', p_recovery_outcome,
    'batch_id', v_batch_id,
    'source', 'log_case_checkout'
  ));

  -- (a) Append-only audit record.
  INSERT INTO case_job_history (tenant_id, case_id, action, details, performed_by)
  VALUES (v_tenant_id, p_case_id, 'checkout', v_details, auth.uid());

  -- (b) Case projection: last-collection convenience (does NOT touch status here).
  UPDATE cases
  SET checkout_collector_name = p_collector_name,
      checkout_collector_mobile = p_collector_mobile,
      checkout_collector_id = p_collector_id,
      checkout_date = v_now,
      recovery_outcome = COALESCE(p_recovery_outcome, recovery_outcome)
  WHERE id = p_case_id AND tenant_id = v_tenant_id;

  -- (c) Per-device: stamp checkout STATE + write custody (transfer + ledger).
  IF p_device_ids IS NOT NULL THEN
    UPDATE case_devices
    SET checked_out_at = v_now,
        checkout_batch_id = v_batch_id,
        checkout_collector_name = p_collector_name,
        checkout_collector_mobile = p_collector_mobile,
        checkout_collector_id = p_collector_id,
        checkout_collector_relationship = p_collector_relationship,
        checkout_by = auth.uid()
    WHERE case_id = p_case_id
      AND tenant_id = v_tenant_id
      AND id = ANY(p_device_ids)
      AND deleted_at IS NULL;

    FOREACH v_device_id IN ARRAY p_device_ids LOOP
      INSERT INTO chain_of_custody_transfers
        (tenant_id, case_id, device_id, from_person_name, to_person_name,
         transfer_reason, transfer_status, accepted_at)
      VALUES
        (v_tenant_id, p_case_id, v_device_id, v_from_person, p_collector_name,
         'checkout', 'accepted', v_now);

      INSERT INTO chain_of_custody
        (tenant_id, case_id, device_id, action_category, action, description,
         actor_id, actor_name, actor_role, custody_status, metadata)
      VALUES
        (v_tenant_id, p_case_id, v_device_id, 'transfer', 'DEVICE_CHECKED_OUT',
         format('Device released to %s at case checkout', p_collector_name),
         auth.uid(), v_from_person, v_actor_role, 'checked_out', v_checkout_meta);
    END LOOP;
  ELSE
    INSERT INTO chain_of_custody
      (tenant_id, case_id, device_id, action_category, action, description,
       actor_id, actor_name, actor_role, custody_status, metadata)
    VALUES
      (v_tenant_id, p_case_id, NULL, 'transfer', 'CASE_CHECKED_OUT',
       format('Case checked out to %s', p_collector_name),
       auth.uid(), v_from_person, v_actor_role, 'checked_out', v_checkout_meta);
  END IF;

  -- (d) Status: once the WHOLE case is collected, device return ends the case.
  -- ready → delivered → closed; delivered/cancelled → closed. Each hop is
  -- best-effort so a gate (e.g. payment-before-release) can hold the case at
  -- its current phase without failing the checkout itself.
  IF p_device_ids IS NULL THEN
    v_remaining := 0;
  ELSE
    SELECT count(*) INTO v_remaining
    FROM case_devices
    WHERE case_id = p_case_id AND tenant_id = v_tenant_id
      AND deleted_at IS NULL AND checked_out_at IS NULL;
  END IF;

  IF v_remaining = 0 THEN
    SELECT s.type INTO v_phase
    FROM cases c JOIN master_case_statuses s ON s.id = c.status_id
    WHERE c.id = p_case_id;

    IF v_phase = 'ready' THEN
      SELECT id INTO v_delivered_status_id
      FROM master_case_statuses WHERE type = 'delivered' AND is_active ORDER BY sort_order LIMIT 1;
      IF v_delivered_status_id IS NOT NULL THEN
        BEGIN
          PERFORM transition_case_status(p_case_id, v_delivered_status_id, 'checkout', v_details);
          v_phase := 'delivered';
        EXCEPTION
          WHEN check_violation OR insufficient_privilege THEN
            NULL;
        END;
      END IF;
    END IF;

    IF v_phase IN ('delivered', 'cancelled') THEN
      SELECT id INTO v_closed_status_id
      FROM master_case_statuses WHERE type = 'closed' AND is_active ORDER BY sort_order LIMIT 1;
      IF v_closed_status_id IS NOT NULL THEN
        BEGIN
          PERFORM transition_case_status(p_case_id, v_closed_status_id, 'checkout', v_details);
        EXCEPTION
          WHEN check_violation OR insufficient_privilege THEN
            NULL;
        END;
      END IF;
    END IF;
  END IF;
END;
$function$;
