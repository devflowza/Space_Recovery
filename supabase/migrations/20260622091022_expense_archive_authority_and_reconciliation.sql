-- EXP-018 + EXP-006: one canonical admin-gated soft-delete path with full ledger/VAT
-- reversal, plus a read-only expense<->ledger reconciliation diagnostic.
-- Rollback: DROP TRIGGER trg_enforce_expense_archive_authority ON public.expenses;
--           DROP FUNCTION public.enforce_expense_archive_authority();
--           DROP FUNCTION public.archive_expense(uuid, text);
--           DROP FUNCTION public.reconcile_expense_ledger(date, date);

-- 1) Column-aware soft-delete authority: setting deleted_at (the real delete-equivalent)
--    requires admin. Honors app.bypass_tenant_guard so main-loop backfills/sweeps work.
CREATE OR REPLACE FUNCTION public.enforce_expense_archive_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    IF COALESCE(current_setting('app.bypass_tenant_guard', true), 'false') <> 'true'
       AND NOT (has_role('admin') OR is_platform_admin()) THEN
      RAISE EXCEPTION 'Only an admin can archive (delete) an expense'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_expense_archive_authority ON public.expenses;
CREATE TRIGGER trg_enforce_expense_archive_authority
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION public.enforce_expense_archive_authority();

-- 2) Canonical archival RPC. Admin-gated, idempotent, atomic. Reverses the GL accrual
--    (append-only, via reverse_financial_transaction, now()-dated) + retires VAT for an
--    approved expense, then soft-deletes. A PAID expense is BLOCKED (its disbursement must
--    be reversed first — archiving would desync the bank balance).
CREATE OR REPLACE FUNCTION public.archive_expense(p_expense_id uuid, p_reason text DEFAULT NULL::text)
RETURNS public.expenses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant uuid := get_current_tenant_id();
  v_exp    public.expenses;
  v_txn    record;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant context' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT (has_role('admin') OR is_platform_admin()) THEN
    RAISE EXCEPTION 'Only an admin can archive (delete) an expense' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_exp FROM public.expenses
   WHERE id = p_expense_id AND tenant_id = v_tenant AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found or already archived';
  END IF;

  IF v_exp.status = 'paid' THEN
    RAISE EXCEPTION 'Cannot archive a paid expense — reverse its disbursement (un-pay) first';
  END IF;

  IF v_exp.status = 'approved' THEN
    FOR v_txn IN
      SELECT id FROM public.financial_transactions
       WHERE reference_type = 'expense' AND reference_id = p_expense_id AND deleted_at IS NULL
    LOOP
      PERFORM public.reverse_financial_transaction(v_txn.id, COALESCE(p_reason, 'Expense archived'));
    END LOOP;

    UPDATE public.vat_records SET deleted_at = now()
     WHERE record_id = p_expense_id AND record_type IN ('purchase', 'expense') AND deleted_at IS NULL;
  END IF;

  UPDATE public.expense_attachments SET deleted_at = now()
   WHERE expense_id = p_expense_id AND deleted_at IS NULL;

  UPDATE public.expenses SET deleted_at = now(), status = 'voided'
   WHERE id = p_expense_id
   RETURNING * INTO v_exp;

  RETURN v_exp;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_expense(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.archive_expense(uuid, text) TO authenticated;

-- 3) Read-only reconciliation (EXP-006): per-period expenses-table vs GL-ledger delta.
CREATE OR REPLACE FUNCTION public.reconcile_expense_ledger(
  p_date_from date DEFAULT NULL,
  p_date_to   date DEFAULT NULL
)
RETURNS TABLE (period text, expenses_base numeric, ledger_base numeric, delta_base numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant uuid := get_current_tenant_id();
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant context' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT is_staff_user() THEN
    RAISE EXCEPTION 'reconcile_expense_ledger: insufficient role' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH exp AS (
    SELECT to_char(e.expense_date, 'YYYY-MM') AS period,
           SUM(COALESCE(e.amount_base, e.amount)) AS base
    FROM public.expenses e
    WHERE e.tenant_id = v_tenant AND e.deleted_at IS NULL AND e.status IN ('approved','paid')
      AND (p_date_from IS NULL OR e.expense_date >= p_date_from)
      AND (p_date_to   IS NULL OR e.expense_date <= p_date_to)
    GROUP BY 1
  ),
  led AS (
    SELECT to_char(ft.transaction_date, 'YYYY-MM') AS period,
           SUM(COALESCE(ft.amount_base, ft.amount)) AS base
    FROM public.financial_transactions ft
    WHERE ft.tenant_id = v_tenant AND ft.deleted_at IS NULL AND ft.transaction_type = 'expense'
      AND (p_date_from IS NULL OR ft.transaction_date >= p_date_from)
      AND (p_date_to   IS NULL OR ft.transaction_date <= p_date_to)
    GROUP BY 1
  )
  SELECT COALESCE(exp.period, led.period),
         COALESCE(exp.base, 0), COALESCE(led.base, 0),
         COALESCE(exp.base, 0) - COALESCE(led.base, 0)
  FROM exp FULL OUTER JOIN led ON exp.period = led.period
  ORDER BY 1;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_expense_ledger(date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.reconcile_expense_ledger(date, date) TO authenticated;
