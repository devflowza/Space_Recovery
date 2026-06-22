-- EXP-063: wizard-scoped server preflight for expense bulk import (NOT insert-path
-- enforcement — expenses_insert RLS is unchanged; a direct API insert still bypasses this).
-- Mirrors the client resolution: explicit plan_features row wins; else hierarchy fallback
-- (bulk_import requires 'professional'); else NULL = unlimited for the monthly cap. Live DB
-- has 0 plan_features rows for these keys today, so the gate is effectively open until
-- operators seed plan_features — no tenant who imports today is suddenly blocked.
-- Rollback: DROP FUNCTION public.assert_expense_import_allowed(integer);
CREATE OR REPLACE FUNCTION public.assert_expense_import_allowed(p_row_count integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id   uuid;
  v_plan_code   text;
  v_plan_id     uuid;
  v_plan_rank   integer;
  v_bulk_row    record;
  v_bulk_ok     boolean;
  v_limit       integer;
  v_limit_found boolean := false;
  v_current     integer;
  v_month_start timestamptz;
BEGIN
  IF NOT has_role('accounts') THEN
    RAISE EXCEPTION 'Not authorized to import expenses' USING ERRCODE = '42501';
  END IF;
  IF p_row_count IS NULL OR p_row_count < 0 THEN
    RAISE EXCEPTION 'Invalid import row count' USING ERRCODE = '22023';
  END IF;

  v_tenant_id := get_current_tenant_id();
  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  SELECT ts.plan_id, sp.code INTO v_plan_id, v_plan_code
  FROM tenant_subscriptions ts
  JOIN subscription_plans sp ON sp.id = ts.plan_id
  WHERE ts.tenant_id = v_tenant_id AND ts.status = 'active' AND ts.deleted_at IS NULL
  ORDER BY ts.created_at DESC
  LIMIT 1;

  v_plan_code := COALESCE(v_plan_code, 'starter');
  v_plan_rank := CASE v_plan_code
                   WHEN 'starter' THEN 1 WHEN 'professional' THEN 2 WHEN 'enterprise' THEN 3 ELSE 0 END;

  IF v_plan_id IS NOT NULL THEN
    SELECT * INTO v_bulk_row FROM plan_features
    WHERE plan_id = v_plan_id AND feature_key = 'bulk_import' AND deleted_at IS NULL LIMIT 1;
  END IF;
  IF FOUND THEN
    v_bulk_ok := COALESCE(v_bulk_row.is_enabled, false);
  ELSE
    v_bulk_ok := (v_plan_rank >= 2);
  END IF;
  IF NOT v_bulk_ok THEN
    RAISE EXCEPTION 'Bulk import requires the Professional plan or higher. Please upgrade to import expenses.'
      USING ERRCODE = 'P0001', HINT = 'feature:bulk_import';
  END IF;

  IF v_plan_id IS NOT NULL THEN
    SELECT limit_value INTO v_limit FROM plan_features
    WHERE plan_id = v_plan_id AND feature_key = 'max_expenses_per_month' AND deleted_at IS NULL LIMIT 1;
    v_limit_found := FOUND;
  END IF;
  IF NOT v_limit_found OR v_limit IS NULL THEN
    RETURN;
  END IF;

  v_month_start := date_trunc('month', now());
  SELECT count(*) INTO v_current FROM expenses
  WHERE tenant_id = v_tenant_id AND deleted_at IS NULL AND created_at >= v_month_start;

  IF (v_current + p_row_count) > v_limit THEN
    RAISE EXCEPTION 'This import of % expense(s) would exceed your plan limit of % per month (% already used). Please upgrade or reduce the file.',
      p_row_count, v_limit, v_current
      USING ERRCODE = 'P0001', HINT = 'limit:max_expenses_per_month';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_expense_import_allowed(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.assert_expense_import_allowed(integer) TO authenticated;