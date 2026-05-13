import { supabase } from './supabaseClient';
import type { Database } from '../types/database.types';

type PayrollPeriod = Database['public']['Tables']['payroll_periods']['Row'];
type PayrollPeriodInsert = Database['public']['Tables']['payroll_periods']['Insert'];
type PayrollRecord = Database['public']['Tables']['payroll_records']['Row'];
type PayrollAdjustment = Database['public']['Tables']['payroll_adjustments']['Row'];
type PayrollAdjustmentInsert = Database['public']['Tables']['payroll_adjustments']['Insert'];
type EmployeeLoan = Database['public']['Tables']['employee_loans']['Row'];
type EmployeeLoanInsert = Database['public']['Tables']['employee_loans']['Insert'];
type LoanRepayment = Database['public']['Tables']['loan_repayments']['Row'];
type PayrollSettings = Database['public']['Tables']['payroll_settings']['Row'];
type EmployeeSalaryStructure = Database['public']['Tables']['employee_salary_structures']['Row'];
type EmployeeSalaryStructureInsert = Database['public']['Tables']['employee_salary_structures']['Insert'];

export interface PayrollDashboardStats {
  totalPayroll: number;
  employeeCount: number;
  pendingApprovals: number;
  processedThisMonth: number;
  avgSalary: number;
  upcomingPaymentDate: string | null;
}

export interface ProcessPayrollOptions {
  employeeIds?: string[];
  includePendingAdjustments?: boolean;
}

export const payrollService = {
  // ============================================================================
  // SALARY COMPONENTS
  // ============================================================================

  async getSalaryComponents() {
    const { data, error } = await supabase
      .from('salary_components')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order');

    if (error) throw error;
    return data;
  },

  async getSalaryComponent(id: string) {
    const { data, error } = await supabase
      .from('salary_components')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createSalaryComponent(component: Database['public']['Tables']['salary_components']['Insert']) {
    const { data, error } = await supabase
      .from('salary_components')
      .insert(component)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateSalaryComponent(id: string, updates: Partial<Database['public']['Tables']['salary_components']['Update']>) {
    const { data, error } = await supabase
      .from('salary_components')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async deleteSalaryComponent(id: string) {
    const { error } = await supabase
      .from('salary_components')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  // ============================================================================
  // PAYROLL PERIODS
  // ============================================================================

  async getPayrollPeriods(filters?: { status?: string; year?: number }) {
    let query = supabase
      .from('payroll_periods')
      .select('*')
      .is('deleted_at', null)
      .order('start_date', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.year) {
      const startOfYear = `${filters.year}-01-01`;
      const endOfYear = `${filters.year}-12-31`;
      query = query.gte('start_date', startOfYear).lte('start_date', endOfYear);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as PayrollPeriod[];
  },

  async getPayrollPeriod(id: string) {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data as PayrollPeriod | null;
  },

  async getCurrentPayrollPeriod() {
    const now = new Date();
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .lte('start_date', now.toISOString().split('T')[0])
      .gte('end_date', now.toISOString().split('T')[0])
      .eq('period_type', 'monthly')
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data as PayrollPeriod | null;
  },

  async createPayrollPeriod(data: PayrollPeriodInsert) {
    const { data: period, error } = await supabase
      .from('payroll_periods')
      .insert(data)
      .select()
      .maybeSingle();

    if (error) throw error;
    return period as PayrollPeriod;
  },

  async updatePayrollPeriod(id: string, updates: Partial<PayrollPeriodInsert>) {
    const { data, error } = await supabase
      .from('payroll_periods')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as PayrollPeriod;
  },

  async approvePayroll(periodId: string, approvedBy: string) {
    return this.updatePayrollPeriod(periodId, {
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    });
  },

  async approvePayrollPeriod(periodId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    return this.approvePayroll(periodId, user.id);
  },

  async markPayrollAsPaid(periodId: string, paidBy: string) {
    return this.updatePayrollPeriod(periodId, {
      status: 'paid',
      paid_by: paidBy,
      paid_at: new Date().toISOString(),
    });
  },

  async markPayrollPeriodAsPaid(periodId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    return this.markPayrollAsPaid(periodId, user.id);
  },

  // ============================================================================
  // PAYROLL RECORDS
  // ============================================================================

  async getPayrollRecords(periodId: string) {
    const { data, error } = await supabase
      .from('payroll_records')
      .select(`
        *,
        employee:employees(id, first_name, last_name, employee_number)
      `)
      .eq('period_id', periodId)
      .is('deleted_at', null)
      .order('employee_name');

    if (error) throw error;
    return data;
  },

  async getPayrollRecord(id: string) {
    const { data, error } = await supabase
      .from('payroll_records')
      .select(`
        *,
        employee:employees(id, first_name, last_name, employee_number, department:departments(name), position:positions(title))
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getEmployeePayrollHistory(employeeId: string, limit = 12) {
    const { data, error } = await supabase
      .from('payroll_records')
      .select(`
        *,
        period:payroll_periods(period_name, start_date, end_date, payment_date)
      `)
      .eq('employee_id', employeeId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getPayrollRecordItems(recordId: string) {
    const { data, error } = await supabase
      .from('payroll_record_items')
      .select('*')
      .eq('payroll_record_id', recordId)
      .order('component_type')
      .order('component_code');

    if (error) throw error;
    return data;
  },

  // ============================================================================
  // PAYROLL PROCESSING
  // ============================================================================

  async processPayroll(periodId: string, options: ProcessPayrollOptions = {}) {
    const period = await this.getPayrollPeriod(periodId);
    if (!period) throw new Error('Payroll period not found');
    if (period.status !== 'draft') throw new Error('Payroll period is not in draft status');

    let employeesQuery = supabase
      .from('employees')
      .select(`
        *,
        department:departments(name),
        position:positions(title),
        salary_structure:employee_salary_structures(base_salary, payment_frequency, bank_name, bank_account_number, iban)
      `)
      .eq('employment_status', 'active');

    if (options.employeeIds && options.employeeIds.length > 0) {
      employeesQuery = employeesQuery.in('id', options.employeeIds);
    }

    const { data: employees, error: empError } = await employeesQuery;
    if (empError) throw empError;

    const settings = await this.getPayrollSettings();
    const workingDaysPerMonth = settings.working_days_per_month || 22;
    const workingHoursPerDay = settings.working_hours_per_day || 8;

    const pendingAdjustments = options.includePendingAdjustments
      ? await this.getPendingAdjustments()
      : [];

    const records = [];
    for (const employee of employees || []) {
      const salaryStructure = Array.isArray(employee.salary_structure)
        ? employee.salary_structure[0]
        : employee.salary_structure;

      if (!salaryStructure?.base_salary) continue;

      const baseSalary = salaryStructure.base_salary;
      const dailyRate = baseSalary / workingDaysPerMonth;
      const hourlyRate = dailyRate / workingHoursPerDay;

      const attendance = await this.getEmployeeAttendance(
        employee.id,
        period.start_date,
        period.end_date
      );

      const activeLoans = await this.getActiveLoans(employee.id);
      const loanDeductions = activeLoans.reduce(
        (sum, loan) => sum + Number(loan.installment_amount),
        0
      );

      const grossEarnings = baseSalary;
      const socialSecurityDeduction = baseSalary * 0.07;
      const totalDeductions = socialSecurityDeduction + loanDeductions;
      const netSalary = grossEarnings - totalDeductions;

      const record = {
        period_id: periodId,
        employee_id: employee.id,
        employee_number: employee.employee_number,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        department_name: employee.department?.name,
        position_title: employee.position?.title,
        working_days: workingDaysPerMonth,
        days_worked: attendance.daysWorked,
        days_absent: attendance.daysAbsent,
        days_leave: attendance.daysLeave,
        regular_hours: attendance.regularHours,
        overtime_hours: attendance.overtimeHours,
        base_salary: baseSalary,
        daily_rate: dailyRate,
        hourly_rate: hourlyRate,
        gross_earnings: grossEarnings,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        bank_name: salaryStructure.bank_name,
        bank_account_number: salaryStructure.bank_account_number,
        iban: salaryStructure.iban,
        payment_method: 'bank_transfer',
        status: 'calculated',
      };

      records.push(record);

      for (const loan of activeLoans) {
        await this.recordLoanRepayment({
          loan_id: loan.id,
          amount: Number(loan.installment_amount),
          payment_date: period.end_date,
          payment_method: 'payroll_deduction',
          notes: `Automatic deduction for ${period.period_name}`,
        });
      }
    }

    if (records.length > 0) {
      const { data: createdRecords, error: recordError } = await supabase
        .from('payroll_records')
        .insert(records)
        .select();

      if (recordError) throw recordError;

      const totalGross = records.reduce((sum, r) => sum + r.gross_earnings, 0);
      const totalDeductions = records.reduce((sum, r) => sum + r.total_deductions, 0);
      const totalNet = records.reduce((sum, r) => sum + r.net_salary, 0);

      await this.updatePayrollPeriod(periodId, {
        status: 'processing',
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet,
        employee_count: records.length,
      });

      return {
        success: true,
        recordsCreated: createdRecords.length,
        totalGross,
        totalNet,
      };
    }

    return { success: false, recordsCreated: 0, totalGross: 0, totalNet: 0 };
  },

  async getEmployeeAttendance(employeeId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    const daysWorked = data?.filter(d => d.status === 'present').length || 0;
    const daysAbsent = data?.filter(d => d.status === 'absent').length || 0;
    const daysLeave = data?.filter(d => d.status === 'leave').length || 0;
    const regularHours = data?.reduce((sum, d) => sum + (d.hours_worked || 0), 0) || 0;
    const overtimeHours = data?.reduce((sum, d) => sum + (d.overtime_hours || 0), 0) || 0;

    return {
      daysWorked,
      daysAbsent,
      daysLeave,
      regularHours,
      overtimeHours,
    };
  },

  // ============================================================================
  // ADJUSTMENTS
  // ============================================================================

  async getPayrollAdjustments(filters?: { status?: string; employeeId?: string }) {
    let query = supabase
      .from('payroll_adjustments')
      .select(`
        *,
        employee:employees(first_name, last_name, employee_number)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getPendingAdjustments(employeeId?: string) {
    let query = supabase
      .from('payroll_adjustments')
      .select('*')
      .eq('status', 'pending')
      .is('deleted_at', null);

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as PayrollAdjustment[];
  },

  async createPayrollAdjustment(data: PayrollAdjustmentInsert) {
    const { data: adjustment, error } = await supabase
      .from('payroll_adjustments')
      .insert(data)
      .select()
      .maybeSingle();

    if (error) throw error;
    return adjustment as PayrollAdjustment;
  },

  async approveAdjustment(id: string, approvedBy: string) {
    const { data, error } = await supabase
      .from('payroll_adjustments')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as PayrollAdjustment;
  },

  async approvePayrollAdjustment(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    return this.approveAdjustment(id, user.id);
  },

  async cancelAdjustment(id: string) {
    const { data, error } = await supabase
      .from('payroll_adjustments')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as PayrollAdjustment;
  },

  async cancelPayrollAdjustment(id: string) {
    return this.cancelAdjustment(id);
  },

  // ============================================================================
  // EMPLOYEE LOANS
  // ============================================================================

  async getEmployeeLoans(filters?: { status?: string; employeeId?: string }) {
    let query = supabase
      .from('employee_loans')
      .select(`
        *,
        employee:employees(first_name, last_name, employee_number)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getEmployeeLoan(id: string) {
    const { data, error } = await supabase
      .from('employee_loans')
      .select(`
        *,
        employee:employees(first_name, last_name, employee_number)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getActiveLoans(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_loans')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (error) throw error;
    return data as EmployeeLoan[];
  },

  async createEmployeeLoan(data: EmployeeLoanInsert) {
    const { data: nextNumber } = await supabase.rpc('get_next_number', {
      p_scope: 'loan',
    });

    const loanData = {
      ...data,
      loan_number: nextNumber || `LOAN-${Date.now()}`,
    };

    const { data: loan, error } = await supabase
      .from('employee_loans')
      .insert(loanData)
      .select()
      .maybeSingle();

    if (error) throw error;
    return loan as EmployeeLoan;
  },

  async approveLoan(id: string, approvedBy: string) {
    const { data, error } = await supabase
      .from('employee_loans')
      .update({
        status: 'active',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as EmployeeLoan;
  },

  async getLoanRepaymentHistory(loanId: string) {
    const { data, error } = await supabase
      .from('loan_repayments')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data as LoanRepayment[];
  },

  async recordLoanRepayment(repayment: {
    loan_id: string;
    amount: number;
    payment_date: string;
    payment_method?: string;
    notes?: string;
  }) {
    const loan = await this.getEmployeeLoan(repayment.loan_id);
    if (!loan) throw new Error('Loan not found');

    const { data, error } = await supabase
      .from('loan_repayments')
      .insert({
        loan_id: repayment.loan_id,
        amount: repayment.amount,
        payment_date: repayment.payment_date,
        payment_method: repayment.payment_method || 'payroll_deduction',
        notes: repayment.notes,
      })
      .select()
      .maybeSingle();

    if (error) throw error;

    const newRemainingBalance = Number(loan.remaining_balance) - repayment.amount;
    const newInstallmentsPaid = (loan.installments_paid || 0) + 1;
    const isCompleted = newInstallmentsPaid >= loan.installments_count;

    const { error: updateError } = await supabase
      .from('employee_loans')
      .update({
        remaining_balance: newRemainingBalance,
        installments_paid: newInstallmentsPaid,
        status: isCompleted ? 'completed' : loan.status,
        end_date: isCompleted ? new Date().toISOString().split('T')[0] : loan.end_date,
      })
      .eq('id', repayment.loan_id);

    if (updateError) throw updateError;

    return data;
  },

  // ============================================================================
  // EMPLOYEE SALARY STRUCTURES
  // ============================================================================

  async getEmployeeSalaryStructure(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_salary_structures')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as EmployeeSalaryStructure | null;
  },

  async createEmployeeSalaryStructure(data: EmployeeSalaryStructureInsert) {
    await supabase
      .from('employee_salary_structures')
      .update({ is_active: false })
      .eq('employee_id', data.employee_id)
      .eq('is_active', true);

    const { data: structure, error } = await supabase
      .from('employee_salary_structures')
      .insert({ ...data, is_active: true })
      .select()
      .maybeSingle();

    if (error) throw error;
    return structure as EmployeeSalaryStructure;
  },

  // ============================================================================
  // SETTINGS
  // ============================================================================

  async getPayrollSettings() {
    const { data, error } = await supabase
      .from('payroll_settings')
      .select('*');

    if (error) throw error;

    const settings: Record<string, any> = {};
    data?.forEach((setting: PayrollSettings) => {
      settings[setting.setting_key] = setting.setting_value;
    });

    return {
      working_days_per_month: settings.working_days_per_month?.value || 22,
      working_hours_per_day: settings.working_hours_per_day?.value || 8,
      overtime_rate_multiplier: settings.overtime_rate_multiplier || {
        regular: 1.25,
        weekend: 1.5,
        holiday: 2.0,
      },
      currency: settings.currency || { code: 'USD', symbol: '$', decimals: 2 },
      payment_day: settings.payment_day?.value || 28,
    };
  },

  async updatePayrollSettings(settings: {
    working_days_per_month: number;
    working_hours_per_day: number;
    overtime_rate_multiplier: { regular: number; weekend: number; holiday: number };
    currency: { code: string; symbol: string; decimals: number };
    payment_day: number;
  }) {
    const updates = [
      {
        setting_key: 'working_days_per_month',
        setting_value: { value: settings.working_days_per_month },
        description: 'Number of working days per month',
      },
      {
        setting_key: 'working_hours_per_day',
        setting_value: { value: settings.working_hours_per_day },
        description: 'Number of working hours per day',
      },
      {
        setting_key: 'overtime_rate_multiplier',
        setting_value: settings.overtime_rate_multiplier,
        description: 'Overtime rate multipliers',
      },
      {
        setting_key: 'currency',
        setting_value: settings.currency,
        description: 'Currency settings',
      },
      {
        setting_key: 'payment_day',
        setting_value: { value: settings.payment_day },
        description: 'Default payment day of month',
      },
    ];

    for (const update of updates) {
      const { error } = await supabase
        .from('payroll_settings')
        .upsert(
          { ...update },
          { onConflict: 'setting_key' }
        );

      if (error) throw error;
    }

    return true;
  },

  async resetPayrollSettings() {
    const { error } = await supabase
      .from('payroll_settings')
      .update({ deleted_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw error;
    return true;
  },

  // ============================================================================
  // DASHBOARD STATS
  // ============================================================================

  async getDashboardStats(): Promise<PayrollDashboardStats> {
    const currentPeriod = await this.getCurrentPayrollPeriod();

    const { data: employees, count: employeeCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('employment_status', 'active');

    const { data: pendingPeriods } = await supabase
      .from('payroll_periods')
      .select('*')
      .in('status', ['draft', 'processing'])
      .is('deleted_at', null);

    let totalPayroll = 0;
    let processedThisMonth = 0;

    if (currentPeriod) {
      const { data: records } = await supabase
        .from('payroll_records')
        .select('net_salary, status')
        .eq('period_id', currentPeriod.id)
        .is('deleted_at', null);

      totalPayroll = records?.reduce((sum, r) => sum + (r.net_salary || 0), 0) || 0;
      processedThisMonth = records?.filter(r => r.status === 'paid' || r.status === 'approved').length || 0;
    }

    return {
      totalPayroll,
      employeeCount: employeeCount || 0,
      pendingApprovals: pendingPeriods?.length || 0,
      processedThisMonth,
      avgSalary: employeeCount ? totalPayroll / employeeCount : 0,
      upcomingPaymentDate: currentPeriod?.payment_date || null,
    };
  },

  // ============================================================================
  // BANK FILES
  // ============================================================================

  async generateBankFile(periodId: string, format: 'WPS' | 'ACH' | 'custom' = 'WPS') {
    const period = await this.getPayrollPeriod(periodId);
    if (!period) throw new Error('Payroll period not found');

    const records = await this.getPayrollRecords(periodId);

    const { data: nextNumber } = await supabase.rpc('get_next_number', {
      p_scope: 'payroll_bank_file',
    });

    const fileContent = this.generateWPSFileContent(records);

    const { data: bankFile, error } = await supabase
      .from('payroll_bank_files')
      .insert({
        file_number: nextNumber || `PBF-${Date.now()}`,
        payroll_period_id: periodId,
        bank_name: 'Bank Muscat',
        file_format: format,
        total_amount: period.total_net,
        record_count: records.length,
        file_content: fileContent,
        status: 'generated',
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return bankFile;
  },

  generateWPSFileContent(records: any[]): string {
    const lines = records.map((record) => {
      return [
        record.employee_number || '',
        record.employee_name || '',
        record.iban || record.bank_account_number || '',
        record.net_salary?.toFixed(2) || '0.00',
        record.currency_code || 'USD',
        record.bank_name || 'Bank Muscat',
      ].join('|');
    });

    return lines.join('\n');
  },
};
