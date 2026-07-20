-- Pre-existing RBAC bug fix: the SELECT policy on HR/Payroll data tables was
-- USING (true), so ANY authenticated role — including read-only 'viewer' — could
-- read all employee/salary/payroll rows over the API. Add a staff-only floor
-- (is_staff_user() = any non-viewer role) as a scalar sub-select (InitPlan-safe).
-- Orthogonal to the module gate (which restricts by plan entitlement); this
-- restricts by role. Scoped to the 26 tenant-scoped data tables; the 2 global
-- master reference tables are left as-is (already module-gated, non-sensitive).
ALTER POLICY payroll_settings_select ON public.payroll_settings USING ((SELECT is_staff_user()));
ALTER POLICY payroll_periods_select ON public.payroll_periods USING ((SELECT is_staff_user()));
ALTER POLICY payroll_records_select ON public.payroll_records USING ((SELECT is_staff_user()));
ALTER POLICY payroll_record_items_select ON public.payroll_record_items USING ((SELECT is_staff_user()));
ALTER POLICY payroll_adjustments_select ON public.payroll_adjustments USING ((SELECT is_staff_user()));
ALTER POLICY payroll_bank_files_select ON public.payroll_bank_files USING ((SELECT is_staff_user()));
ALTER POLICY salary_components_select ON public.salary_components USING ((SELECT is_staff_user()));
ALTER POLICY employee_salary_components_select ON public.employee_salary_components USING ((SELECT is_staff_user()));
ALTER POLICY employee_salary_config_select ON public.employee_salary_config USING ((SELECT is_staff_user()));
ALTER POLICY employee_salary_structures_select ON public.employee_salary_structures USING ((SELECT is_staff_user()));
ALTER POLICY employee_loans_select ON public.employee_loans USING ((SELECT is_staff_user()));
ALTER POLICY loan_repayments_select ON public.loan_repayments USING ((SELECT is_staff_user()));
ALTER POLICY employees_select ON public.employees USING ((SELECT is_staff_user()));
ALTER POLICY employee_documents_select ON public.employee_documents USING ((SELECT is_staff_user()));
ALTER POLICY departments_select ON public.departments USING ((SELECT is_staff_user()));
ALTER POLICY positions_select ON public.positions USING ((SELECT is_staff_user()));
ALTER POLICY attendance_records_select ON public.attendance_records USING ((SELECT is_staff_user()));
ALTER POLICY timesheets_select ON public.timesheets USING ((SELECT is_staff_user()));
ALTER POLICY leave_balances_select ON public.leave_balances USING ((SELECT is_staff_user()));
ALTER POLICY leave_requests_select ON public.leave_requests USING ((SELECT is_staff_user()));
ALTER POLICY performance_reviews_select ON public.performance_reviews USING ((SELECT is_staff_user()));
ALTER POLICY recruitment_jobs_select ON public.recruitment_jobs USING ((SELECT is_staff_user()));
ALTER POLICY recruitment_candidates_select ON public.recruitment_candidates USING ((SELECT is_staff_user()));
ALTER POLICY onboarding_checklists_select ON public.onboarding_checklists USING ((SELECT is_staff_user()));
ALTER POLICY onboarding_checklist_items_select ON public.onboarding_checklist_items USING ((SELECT is_staff_user()));
ALTER POLICY onboarding_tasks_select ON public.onboarding_tasks USING ((SELECT is_staff_user()));
