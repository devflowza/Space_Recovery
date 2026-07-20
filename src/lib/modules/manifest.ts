// Declarative manifest of gateable modules — the single source of truth for which
// tables, routes, nav sections, and event-type prefixes belong to each plan-driven
// module. Backs the CI regression gate (scripts/check-module-rls.sql) that asserts
// every table listed here actually carries its RESTRICTIVE `<table>_module_gate`
// RLS policy (see migration 20260719223155_module_entitlements_rls_hr_payroll.sql).
// Extend this manifest — not ad-hoc lists elsewhere — when a module grows.
export interface ModuleManifestEntry {
  slug: string;
  label: string;
  gateable: boolean;
  dependsOn?: string[];
  tables: string[];
  routes: string[];
  navSectionKeys: string[];
  eventTypePrefixes: string[];
}

export const MODULE_MANIFEST: ModuleManifestEntry[] = [
  {
    slug: 'hr',
    label: 'HR',
    gateable: true,
    dependsOn: [],
    navSectionKeys: ['hr', 'employee'],
    routes: [
      '/hr',
      '/hr/employees',
      '/hr/employees/:id',
      '/hr/recruitment',
      '/hr/onboarding',
      '/hr/performance',
      '/attendance',
      '/leave',
      '/timesheets',
    ],
    eventTypePrefixes: ['hr.'],
    tables: [
      'employees',
      'employee_documents',
      'departments',
      'positions',
      'attendance_records',
      'timesheets',
      'leave_balances',
      'leave_requests',
      'performance_reviews',
      'recruitment_jobs',
      'recruitment_candidates',
      'onboarding_checklists',
      'onboarding_checklist_items',
      'onboarding_tasks',
      'master_leave_types',
    ],
  },
  {
    slug: 'payroll',
    label: 'Payroll',
    gateable: true,
    dependsOn: ['hr'],
    navSectionKeys: ['payroll'],
    routes: [
      '/payroll',
      '/payroll/process',
      '/payroll/components',
      '/payroll/history',
      '/payroll/periods/:id',
      '/payroll/adjustments',
      '/payroll/loans',
      '/payroll/settings',
    ],
    eventTypePrefixes: ['payroll.'],
    tables: [
      'payroll_settings',
      'payroll_periods',
      'payroll_records',
      'payroll_record_items',
      'payroll_adjustments',
      'payroll_bank_files',
      'salary_components',
      'employee_salary_components',
      'employee_salary_config',
      'employee_salary_structures',
      'employee_loans',
      'loan_repayments',
      'master_payroll_components',
    ],
  },
];

export function moduleForTable(table: string): string | undefined {
  return MODULE_MANIFEST.find((entry) => entry.tables.includes(table))?.slug;
}

export function gatedTables(): { table: string; slug: string }[] {
  return MODULE_MANIFEST.filter((entry) => entry.gateable).flatMap((entry) =>
    entry.tables.map((table) => ({ table, slug: entry.slug }))
  );
}
