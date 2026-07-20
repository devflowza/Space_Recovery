-- Follow-up: the data-migration RPCs are SECURITY DEFINER (import also sets
-- app.bypass_tenant_guard and bypasses RLS), so the RESTRICTIVE <table>_module_gate
-- policies do NOT apply to them. Without a guard a tenant whose plan excludes
-- HR/Payroll could still IMPORT employees/departments/positions/leave/loans into
-- their own tenant (injection) or EXPORT gated rows the module gate otherwise
-- hides ("trace"). Wrap both RPCs with a plan-entitlement gate WITHOUT touching
-- their large bodies: rename the originals to *_impl, revoke direct client
-- EXECUTE, and add same-signature SECURITY DEFINER wrappers that check
-- tenant_module_enabled() for the 5 gateable entity types these RPCs support
-- (hr: employees/departments/positions/leaveBalances; payroll: employeeLoans).
-- Import RAISEs (reject injection); export returns an empty page (no trace).
-- Platform admins bypass via tenant_module_enabled(), same as everywhere else.

ALTER FUNCTION public.data_migration_export_page(text, timestamptz, uuid, integer, jsonb)
  RENAME TO data_migration_export_page_impl;
ALTER FUNCTION public.data_migration_import_batch(uuid, text, jsonb)
  RENAME TO data_migration_import_batch_impl;

-- Only the wrappers (SECURITY DEFINER, owned by postgres) may reach the impls.
REVOKE EXECUTE ON FUNCTION public.data_migration_export_page_impl(text, timestamptz, uuid, integer, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.data_migration_import_batch_impl(uuid, text, jsonb) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.data_migration_export_page(
  p_entity_type text, p_after_created_at timestamptz, p_after_id uuid, p_limit integer, p_filters jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_mod text := CASE p_entity_type
    WHEN 'employees' THEN 'hr' WHEN 'departments' THEN 'hr'
    WHEN 'positions' THEN 'hr' WHEN 'leaveBalances' THEN 'hr'
    WHEN 'employeeLoans' THEN 'payroll' ELSE NULL END;
BEGIN
  -- No trace: a tenant without the module gets an empty page (never gated rows).
  IF v_mod IS NOT NULL AND NOT public.tenant_module_enabled(v_mod) THEN
    RETURN jsonb_build_object('rows', '[]'::jsonb, 'next', 'null'::jsonb);
  END IF;
  RETURN public.data_migration_export_page_impl(p_entity_type, p_after_created_at, p_after_id, p_limit, p_filters);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.data_migration_import_batch(
  p_run_id uuid, p_entity_type text, p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_mod text := CASE p_entity_type
    WHEN 'employees' THEN 'hr' WHEN 'departments' THEN 'hr'
    WHEN 'positions' THEN 'hr' WHEN 'leaveBalances' THEN 'hr'
    WHEN 'employeeLoans' THEN 'payroll' ELSE NULL END;
BEGIN
  -- Reject injection: refuse to write HR/Payroll rows into a non-entitled tenant.
  IF v_mod IS NOT NULL AND NOT public.tenant_module_enabled(v_mod) THEN
    RAISE EXCEPTION 'Module % is not enabled for this tenant; import of "%" is not permitted', v_mod, p_entity_type
      USING ERRCODE = 'insufficient_privilege', HINT = 'module_disabled';
  END IF;
  RETURN public.data_migration_import_batch_impl(p_run_id, p_entity_type, p_rows);
END;
$fn$;

-- Mirror the originals' client EXECUTE surface on the wrappers (export had no
-- PUBLIC grant; import did). Behavior is unchanged for entitled tenants.
REVOKE EXECUTE ON FUNCTION public.data_migration_export_page(text, timestamptz, uuid, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.data_migration_export_page(text, timestamptz, uuid, integer, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.data_migration_import_batch(uuid, text, jsonb) TO anon, authenticated, service_role;
