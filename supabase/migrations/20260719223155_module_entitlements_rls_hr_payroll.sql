-- Enforce plan-driven module entitlements at the data layer: one additive
-- RESTRICTIVE policy per HR/Payroll table. RESTRICTIVE policies are ANDed with
-- the existing tenant-isolation + permissive role policies, so a tenant whose
-- plan excludes the module gets zero rows (SELECT) and rejected writes
-- (INSERT/UPDATE/DELETE) over the API. tenant_module_enabled() is default-deny
-- and platform-admin-bypassing; called as a scalar sub-select so it InitPlans
-- once per query (not per row). Grandfathered tenants (all modules enabled) are
-- unaffected. Existing policies are untouched.

-- Payroll module (13 tables)
CREATE POLICY payroll_settings_module_gate ON public.payroll_settings AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('payroll'))) WITH CHECK ((SELECT public.tenant_module_enabled('payroll')));
CREATE POLICY payroll_periods_module_gate ON public.payroll_periods AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('payroll'))) WITH CHECK ((SELECT public.tenant_module_enabled('payroll')));
CREATE POLICY payroll_records_module_gate ON public.payroll_records AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('payroll'))) WITH CHECK ((SELECT public.tenant_module_enabled('payroll')));
CREATE POLICY payroll_record_items_module_gate ON public.payroll_record_items AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('payroll'))) WITH CHECK ((SELECT public.tenant_module_enabled('payroll')));
CREATE POLICY payroll_adjustments_module_gate ON public.payroll_adjustments AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('payroll'))) WITH CHECK ((SELECT public.tenant_module_enabled('payroll')));
CREATE POLICY payroll_bank_files_module_gate ON public.payroll_bank_files AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('payroll'))) WITH CHECK ((SELECT public.tenant_module_enabled('payroll')));
CREATE POLICY salary_components_module_gate ON public.salary_components AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('payroll'))) WITH CHECK ((SELECT public.tenant_module_enabled('payroll')));
CREATE POLICY employee_salary_components_module_gate ON public.employee_salary_components AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('payroll'))) WITH CHECK ((SELECT public.tenant_module_enabled('payroll')));
CREATE POLICY employee_salary_config_module_gate ON public.employee_salary_config AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('payroll'))) WITH CHECK ((SELECT public.tenant_module_enabled('payroll')));
CREATE POLICY employee_salary_structures_module_gate ON public.employee_salary_structures AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('payroll'))) WITH CHECK ((SELECT public.tenant_module_enabled('payroll')));
CREATE POLICY employee_loans_module_gate ON public.employee_loans AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('payroll'))) WITH CHECK ((SELECT public.tenant_module_enabled('payroll')));
CREATE POLICY loan_repayments_module_gate ON public.loan_repayments AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('payroll'))) WITH CHECK ((SELECT public.tenant_module_enabled('payroll')));
CREATE POLICY master_payroll_components_module_gate ON public.master_payroll_components AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('payroll'))) WITH CHECK ((SELECT public.tenant_module_enabled('payroll')));

-- HR module (15 tables)
CREATE POLICY employees_module_gate ON public.employees AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
CREATE POLICY employee_documents_module_gate ON public.employee_documents AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
CREATE POLICY departments_module_gate ON public.departments AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
CREATE POLICY positions_module_gate ON public.positions AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
CREATE POLICY attendance_records_module_gate ON public.attendance_records AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
CREATE POLICY timesheets_module_gate ON public.timesheets AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
CREATE POLICY leave_balances_module_gate ON public.leave_balances AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
CREATE POLICY leave_requests_module_gate ON public.leave_requests AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
CREATE POLICY performance_reviews_module_gate ON public.performance_reviews AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
CREATE POLICY recruitment_jobs_module_gate ON public.recruitment_jobs AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
CREATE POLICY recruitment_candidates_module_gate ON public.recruitment_candidates AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
CREATE POLICY onboarding_checklists_module_gate ON public.onboarding_checklists AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
CREATE POLICY onboarding_checklist_items_module_gate ON public.onboarding_checklist_items AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
CREATE POLICY onboarding_tasks_module_gate ON public.onboarding_tasks AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
CREATE POLICY master_leave_types_module_gate ON public.master_leave_types AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.tenant_module_enabled('hr'))) WITH CHECK ((SELECT public.tenant_module_enabled('hr')));
