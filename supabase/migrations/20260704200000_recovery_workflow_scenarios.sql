-- ═══════════════════════════════════════════════════════════════════════════
-- Recovery workflow scenarios: partial recovery (badge, no schema), re-recovery
-- (linked cases), and No Solution — Future Follow-up (dedicated phase + reason).
--   0. Widen phase CHECKs with 'no_solution'
--   1. master_case_no_solution_reasons catalog + seeds
--   2. New status "No Solution — Future Follow-up"
--   3. cases: parent_case_id, case_origin, no_solution_reason_id, no_solution_notes
--   4. Transition edges to/from no_solution
--   5. transition_case_status v4 (+ no_solution_reason gate)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT set_config('app.bypass_tenant_guard', 'true', true);

-- ── 0. Phase vocabulary ─────────────────────────────────────────────────────
ALTER TABLE master_case_statuses DROP CONSTRAINT IF EXISTS master_case_statuses_type_check;
ALTER TABLE master_case_statuses ADD CONSTRAINT master_case_statuses_type_check
  CHECK (type = ANY (ARRAY['intake','diagnosis','quoting','awaiting_approval','approved','recovery','qa','ready','completed','delivered','closed','no_solution','cancelled']));

ALTER TABLE case_status_transitions DROP CONSTRAINT IF EXISTS case_status_transitions_from_check;
ALTER TABLE case_status_transitions ADD CONSTRAINT case_status_transitions_from_check
  CHECK (from_phase = ANY (ARRAY['intake','diagnosis','quoting','awaiting_approval','approved','recovery','qa','ready','completed','delivered','closed','no_solution','cancelled']));

ALTER TABLE case_status_transitions DROP CONSTRAINT IF EXISTS case_status_transitions_to_check;
ALTER TABLE case_status_transitions ADD CONSTRAINT case_status_transitions_to_check
  CHECK (to_phase = ANY (ARRAY['intake','diagnosis','quoting','awaiting_approval','approved','recovery','qa','ready','completed','delivered','closed','no_solution','cancelled']));

-- ── 1. No-solution reason catalog (global master data) ──────────────────────
CREATE TABLE IF NOT EXISTS master_case_no_solution_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE master_case_no_solution_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_case_no_solution_reasons FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS master_case_no_solution_reasons_select ON master_case_no_solution_reasons;
CREATE POLICY master_case_no_solution_reasons_select ON master_case_no_solution_reasons FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS master_case_no_solution_reasons_insert ON master_case_no_solution_reasons;
CREATE POLICY master_case_no_solution_reasons_insert ON master_case_no_solution_reasons FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS master_case_no_solution_reasons_update ON master_case_no_solution_reasons;
CREATE POLICY master_case_no_solution_reasons_update ON master_case_no_solution_reasons FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS master_case_no_solution_reasons_delete ON master_case_no_solution_reasons;
CREATE POLICY master_case_no_solution_reasons_delete ON master_case_no_solution_reasons FOR DELETE TO authenticated USING (is_admin());

GRANT SELECT ON master_case_no_solution_reasons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON master_case_no_solution_reasons TO authenticated;

INSERT INTO master_case_no_solution_reasons (code, name, description, sort_order) VALUES
  ('unsupported_firmware',   'Unsupported Firmware / Family',   'Drive firmware or family not yet supported by available tools', 10),
  ('unsupported_controller', 'Unsupported SSD/Flash Controller','SSD or flash memory controller not yet supported',             20),
  ('no_method',              'No Recovery Method Available',     'No known recovery method currently exists for this failure',   30),
  ('severe_media_damage',    'Severe Media Damage',              'Physical media damage beyond current recovery capability',     40),
  ('tool_unavailable',       'Required Tool/Donor Unavailable',  'Required tool, donor part, or resource not currently available',50),
  ('other',                  'Other (see notes)',                'Other reason — see case notes',                                90)
ON CONFLICT (code) DO NOTHING;

-- ── 2. No-solution status ───────────────────────────────────────────────────
INSERT INTO master_case_statuses (name, type, color, sort_order, is_default, is_active, customer_visible)
VALUES ('No Solution — Future Follow-up', 'no_solution', '#b45309', 130, false, true, true)
ON CONFLICT (name) DO UPDATE
  SET type=EXCLUDED.type, color=EXCLUDED.color, sort_order=EXCLUDED.sort_order,
      is_active=true, customer_visible=EXCLUDED.customer_visible, updated_at=now();

-- ── 3. cases columns (re-recovery link + no-solution reason) ────────────────
ALTER TABLE cases ADD COLUMN IF NOT EXISTS parent_case_id uuid REFERENCES cases(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_origin text NOT NULL DEFAULT 'new';
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_case_origin_check;
ALTER TABLE cases ADD CONSTRAINT cases_case_origin_check CHECK (case_origin = ANY (ARRAY['new','re_recovery']));
ALTER TABLE cases ADD COLUMN IF NOT EXISTS no_solution_reason_id uuid REFERENCES master_case_no_solution_reasons(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS no_solution_notes text;
COMMENT ON COLUMN cases.parent_case_id IS 'Original case this is a re-recovery of (case_origin=re_recovery).';
COMMENT ON COLUMN cases.no_solution_reason_id IS 'Structured reason a case was parked as No Solution — Future Follow-up.';
CREATE INDEX IF NOT EXISTS idx_cases_parent_case_id ON cases(parent_case_id) WHERE deleted_at IS NULL;

-- ── 4. Transition edges to/from no_solution ─────────────────────────────────
WITH desired(from_phase, to_phase, allowed_roles, requires, sort_order, description) AS (VALUES
  ('recovery','no_solution',   ARRAY['technician','manager','admin','owner'], ARRAY['no_solution_reason'], 66, 'No method available today — park for future follow-up (device returned)'),
  ('diagnosis','no_solution',  ARRAY['technician','manager','admin','owner'], ARRAY['no_solution_reason'], 28, 'No method available today — park for future follow-up (device returned)'),
  ('no_solution','recovery',   ARRAY['admin','owner'],                        ARRAY['reopen_reason'],      96, 'A recovery method is now available — resume recovery'),
  ('no_solution','diagnosis',  ARRAY['admin','owner'],                        ARRAY['reopen_reason'],      97, 'Re-assess with new tooling'),
  ('no_solution','closed',     ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],             98, 'Permanently close — customer no longer interested')
)
UPDATE case_status_transitions t
SET allowed_roles=d.allowed_roles, requires=d.requires, sort_order=d.sort_order, description=d.description, is_active=true
FROM desired d WHERE t.from_phase=d.from_phase AND t.to_phase=d.to_phase;

WITH desired(from_phase, to_phase, allowed_roles, requires, sort_order, description) AS (VALUES
  ('recovery','no_solution',   ARRAY['technician','manager','admin','owner'], ARRAY['no_solution_reason'], 66, 'No method available today — park for future follow-up (device returned)'),
  ('diagnosis','no_solution',  ARRAY['technician','manager','admin','owner'], ARRAY['no_solution_reason'], 28, 'No method available today — park for future follow-up (device returned)'),
  ('no_solution','recovery',   ARRAY['admin','owner'],                        ARRAY['reopen_reason'],      96, 'A recovery method is now available — resume recovery'),
  ('no_solution','diagnosis',  ARRAY['admin','owner'],                        ARRAY['reopen_reason'],      97, 'Re-assess with new tooling'),
  ('no_solution','closed',     ARRAY['technician','manager','admin','owner'], ARRAY[]::text[],             98, 'Permanently close — customer no longer interested')
)
INSERT INTO case_status_transitions (from_phase, to_phase, allowed_roles, requires, sort_order, description, is_active)
SELECT d.from_phase, d.to_phase, d.allowed_roles, d.requires, d.sort_order, d.description, true
FROM desired d
WHERE NOT EXISTS (SELECT 1 FROM case_status_transitions t WHERE t.from_phase=d.from_phase AND t.to_phase=d.to_phase);

-- ── 5. transition_case_status v4 (v3 + no_solution_reason gate) ─────────────
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

  IF v_to_status.type = 'qa' AND v_from_status.type IS DISTINCT FROM 'qa'
     AND NOT COALESCE(tenant_feature_enabled(v_case.tenant_id, 'workflow.stage.qa'), true) THEN
    RAISE EXCEPTION 'Cannot enter "%": the QA stage is disabled for this workspace (Settings → Features & Modules).',
      v_to_status.name USING ERRCODE = '23514', HINT = 'qa_disabled';
  END IF;

  IF v_from_status.type = v_to_status.type THEN
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

    IF 'cancellation_reason' = ANY(v_transition.requires) AND NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Cannot enter "%": a cancellation reason is required.',
        v_to_status.name USING ERRCODE = '23514', HINT = 'cancellation_reason';
    END IF;
    IF 'reopen_reason' = ANY(v_transition.requires) AND NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Cannot enter "%": a reopen reason is required.',
        v_to_status.name USING ERRCODE = '23514', HINT = 'reopen_reason';
    END IF;

    IF 'no_solution_reason' = ANY(v_transition.requires) THEN
      IF (SELECT no_solution_reason_id FROM cases WHERE id = p_case_id) IS NULL THEN
        RAISE EXCEPTION 'Cannot enter "%": a no-solution reason must be recorded first.',
          v_to_status.name USING ERRCODE = '23514', HINT = 'no_solution_reason';
      END IF;
    END IF;

    IF 'qa_passed' = ANY(v_transition.requires) THEN
      IF NOT EXISTS (
        SELECT 1 FROM case_qa_checklists
        WHERE case_id = p_case_id AND status = 'passed' AND deleted_at IS NULL
      ) THEN
        RAISE EXCEPTION 'Cannot enter "%": QA has not passed. Record a passed QA checklist for this case first.',
          v_to_status.name USING ERRCODE = '23514', HINT = 'qa_passed';
      END IF;
    END IF;

    IF 'recovery_outcome' = ANY(v_transition.requires) THEN
      IF NOT EXISTS (
        SELECT 1 FROM case_recovery_attempts
        WHERE case_id = p_case_id AND result IS NOT NULL AND deleted_at IS NULL
      ) THEN
        RAISE EXCEPTION 'Cannot enter "%": no recovery attempt with an outcome has been recorded for this case.',
          v_to_status.name USING ERRCODE = '23514', HINT = 'recovery_recorded';
      END IF;
    END IF;

    IF 'device_returned' = ANY(v_transition.requires) THEN
      IF EXISTS (
        SELECT 1 FROM case_devices
        WHERE case_id = p_case_id AND deleted_at IS NULL AND checked_out_at IS NULL
      ) THEN
        RAISE EXCEPTION 'Cannot enter "%": all devices must be checked out to the customer first.',
          v_to_status.name USING ERRCODE = '23514', HINT = 'device_returned';
      END IF;
    END IF;

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
