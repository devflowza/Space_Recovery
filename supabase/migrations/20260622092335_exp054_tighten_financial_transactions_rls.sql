-- EXP-054: tighten financial_transactions least-privilege (tenant isolation unchanged).
-- INSERT: only owner/admin/manager/accounts (has_role('accounts')) may directly insert a
-- ledger row. All money-bearing flows use SECURITY DEFINER RPCs (post_manual_transaction,
-- reverse_financial_transaction, record_payment, record_expense_disbursement,
-- create_receipt_with_allocations, convert_proforma_to_tax_invoice) which bypass RLS so they
-- are unaffected. Only direct-insert app paths are expense approval (already accounts-gated)
-- and CSV import of revenue/transactions — accounts-gating both is consistent.
-- Behavior change: technician/sales/hr can no longer CSV-import revenue/transactions
-- (intended hardening; surfaces as the import per-row error).
-- SELECT: drop the open USING(true); restrict to working staff (non-viewer).
-- Rollback: recreate _insert WITH CHECK (is_staff_user()) and _select USING (true).
DROP POLICY IF EXISTS financial_transactions_insert ON public.financial_transactions;
CREATE POLICY financial_transactions_insert ON public.financial_transactions
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_role('accounts'));

DROP POLICY IF EXISTS financial_transactions_select ON public.financial_transactions;
CREATE POLICY financial_transactions_select ON public.financial_transactions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff_user());
