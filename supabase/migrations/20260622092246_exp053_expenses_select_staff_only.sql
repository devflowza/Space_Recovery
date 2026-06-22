-- EXP-053: expenses_select was USING(true) — every staff role incl. read-only viewer
-- could read tenant-wide expense financials. Gate SELECT behind staff membership.
-- is_staff_user() excludes 'viewer' (and inactive/soft-deleted profiles); the RESTRICTIVE
-- expenses_tenant_isolation policy still ANDs tenant scoping on top.
-- Submitter-scoping (created_by) deliberately NOT applied — unscoped aggregation readers
-- (financialReportsService/caseFinanceService/ReportsDashboard) run as various staff roles
-- incl. technician and rely on full row visibility (EXP-011's submitter-scope deferred).
-- Rollback: DROP POLICY expenses_select; CREATE POLICY expenses_select ... USING (true);
DROP POLICY IF EXISTS expenses_select ON public.expenses;
CREATE POLICY expenses_select
  ON public.expenses
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_staff_user() OR is_platform_admin());
