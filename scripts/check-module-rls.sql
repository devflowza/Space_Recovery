-- check-module-rls.sql
-- CI regression gate for plan-driven module-entitlement RLS (see CLAUDE.md and
-- src/lib/modules/manifest.ts — the two must be kept in sync).
--
-- Fails if any of the 28 HR/Payroll module tables is missing a RESTRICTIVE
-- `<table>_module_gate` policy that calls tenant_module_enabled() in its USING
-- clause. Without this gate, a table added to master_modules coverage (or
-- renamed) can silently lose enforcement while manifest.ts still lists it,
-- letting a tenant whose plan excludes the module read/write rows it shouldn't.
-- Baseline: migration 20260719223155_module_entitlements_rls_hr_payroll.sql.
--
-- Usage: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/check-module-rls.sql
-- Exits non-zero (via the DO ... RAISE EXCEPTION) if any table is missing its gate.

WITH gated_tables(table_name) AS (
  VALUES
    -- HR module (15 tables)
    ('employees'), ('employee_documents'), ('departments'), ('positions'),
    ('attendance_records'), ('timesheets'), ('leave_balances'), ('leave_requests'),
    ('performance_reviews'), ('recruitment_jobs'), ('recruitment_candidates'),
    ('onboarding_checklists'), ('onboarding_checklist_items'), ('onboarding_tasks'),
    ('master_leave_types'),
    -- Payroll module (13 tables)
    ('payroll_settings'), ('payroll_periods'), ('payroll_records'), ('payroll_record_items'),
    ('payroll_adjustments'), ('payroll_bank_files'), ('salary_components'),
    ('employee_salary_components'), ('employee_salary_config'), ('employee_salary_structures'),
    ('employee_loans'), ('loan_repayments'), ('master_payroll_components')
),
policy_check AS (
  SELECT
    gt.table_name,
    (SELECT p.qual FROM pg_policies p
       WHERE p.schemaname = 'public'
         AND p.tablename = gt.table_name
         AND p.policyname = gt.table_name || '_module_gate') AS qual,
    (SELECT p.permissive FROM pg_policies p
       WHERE p.schemaname = 'public'
         AND p.tablename = gt.table_name
         AND p.policyname = gt.table_name || '_module_gate') AS permissive
  FROM gated_tables gt
),
violations AS (
  SELECT
    table_name,
    CASE
      WHEN qual IS NULL THEN 'missing ' || table_name || '_module_gate policy'
      WHEN permissive <> 'RESTRICTIVE' THEN table_name || '_module_gate exists but is not RESTRICTIVE'
      WHEN qual NOT ILIKE '%tenant_module_enabled%' THEN table_name || '_module_gate does not reference tenant_module_enabled() in USING'
      ELSE NULL
    END AS issue
  FROM policy_check
)
SELECT table_name, issue
FROM violations
WHERE issue IS NOT NULL
ORDER BY table_name;

DO $$
DECLARE
  v_total int;
  v_count int;
  v_offenders text;
BEGIN
  WITH gated_tables(table_name) AS (
    VALUES
      ('employees'), ('employee_documents'), ('departments'), ('positions'),
      ('attendance_records'), ('timesheets'), ('leave_balances'), ('leave_requests'),
      ('performance_reviews'), ('recruitment_jobs'), ('recruitment_candidates'),
      ('onboarding_checklists'), ('onboarding_checklist_items'), ('onboarding_tasks'),
      ('master_leave_types'),
      ('payroll_settings'), ('payroll_periods'), ('payroll_records'), ('payroll_record_items'),
      ('payroll_adjustments'), ('payroll_bank_files'), ('salary_components'),
      ('employee_salary_components'), ('employee_salary_config'), ('employee_salary_structures'),
      ('employee_loans'), ('loan_repayments'), ('master_payroll_components')
  ),
  policy_check AS (
    SELECT
      gt.table_name,
      (SELECT p.qual FROM pg_policies p
         WHERE p.schemaname = 'public'
           AND p.tablename = gt.table_name
           AND p.policyname = gt.table_name || '_module_gate') AS qual,
      (SELECT p.permissive FROM pg_policies p
         WHERE p.schemaname = 'public'
           AND p.tablename = gt.table_name
           AND p.policyname = gt.table_name || '_module_gate') AS permissive
    FROM gated_tables gt
  ),
  violations AS (
    SELECT
      table_name,
      (qual IS NULL
        OR permissive <> 'RESTRICTIVE'
        OR qual NOT ILIKE '%tenant_module_enabled%') AS is_violation
    FROM policy_check
  )
  SELECT
    count(*),
    count(*) FILTER (WHERE is_violation),
    string_agg(table_name, ', ' ORDER BY table_name) FILTER (WHERE is_violation)
  INTO v_total, v_count, v_offenders
  FROM violations;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Module RLS check FAILED: % of % HR/Payroll table(s) missing a RESTRICTIVE <table>_module_gate policy referencing tenant_module_enabled(): %', v_count, v_total, v_offenders;
  END IF;
  RAISE NOTICE 'OK: all % HR/Payroll module tables have a RESTRICTIVE module_gate RLS policy', v_total;
END $$;
