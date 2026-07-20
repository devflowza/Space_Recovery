import { describe, it, expect } from 'vitest';
import { MODULE_MANIFEST, moduleForTable, gatedTables } from './manifest';

const HR_TABLES = [
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
];

const PAYROLL_TABLES = [
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
];

describe('MODULE_MANIFEST', () => {
  it('has unique module slugs', () => {
    const slugs = MODULE_MANIFEST.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every entry has a non-empty tables list with no duplicates', () => {
    for (const entry of MODULE_MANIFEST) {
      expect(entry.tables.length).toBeGreaterThan(0);
      expect(new Set(entry.tables).size).toBe(entry.tables.length);
    }
  });

  it('hr has exactly the 15 expected tables', () => {
    const hr = MODULE_MANIFEST.find((entry) => entry.slug === 'hr');
    expect(hr).toBeDefined();
    expect(hr?.tables).toHaveLength(15);
    expect(new Set(hr?.tables)).toEqual(new Set(HR_TABLES));
  });

  it('payroll has exactly the 13 expected tables', () => {
    const payroll = MODULE_MANIFEST.find((entry) => entry.slug === 'payroll');
    expect(payroll).toBeDefined();
    expect(payroll?.tables).toHaveLength(13);
    expect(new Set(payroll?.tables)).toEqual(new Set(PAYROLL_TABLES));
  });

  it('payroll depends on hr', () => {
    const payroll = MODULE_MANIFEST.find((entry) => entry.slug === 'payroll');
    expect(payroll?.dependsOn).toContain('hr');
  });

  it('moduleForTable resolves the owning module', () => {
    expect(moduleForTable('payroll_records')).toBe('payroll');
    expect(moduleForTable('employees')).toBe('hr');
  });

  it('moduleForTable returns undefined for an unmapped table', () => {
    expect(moduleForTable('cases')).toBeUndefined();
  });

  it('the combined gated tables total 28 with no table mapped to two modules', () => {
    const gated = gatedTables();
    expect(gated).toHaveLength(28);
    const tableNames = gated.map((g) => g.table);
    expect(new Set(tableNames).size).toBe(tableNames.length);
  });
});
