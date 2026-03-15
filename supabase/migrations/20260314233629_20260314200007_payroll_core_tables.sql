-- Core Payroll Tables

-- employee_salary_structures
CREATE TABLE IF NOT EXISTS employee_salary_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  effective_date date NOT NULL,
  base_salary numeric NOT NULL CHECK (base_salary >= 0),
  payment_frequency text DEFAULT 'monthly',
  currency text DEFAULT 'OMR',
  bank_name text,
  bank_account_number text,
  iban text,
  payment_method text DEFAULT 'bank_transfer',
  is_active boolean DEFAULT true,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(employee_id, effective_date)
);

ALTER TABLE employee_salary_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage salary structures" ON employee_salary_structures FOR ALL USING (is_staff_user());
CREATE INDEX idx_salary_struct_emp ON employee_salary_structures(employee_id);

-- payroll_periods
CREATE TABLE IF NOT EXISTS payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name text NOT NULL,
  period_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  payment_date date,
  status text DEFAULT 'draft',
  total_gross numeric DEFAULT 0,
  total_deductions numeric DEFAULT 0,
  total_net numeric DEFAULT 0,
  employee_count integer DEFAULT 0,
  notes text,
  processed_by uuid REFERENCES profiles(id),
  processed_at timestamptz,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  paid_by uuid REFERENCES profiles(id),
  paid_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(period_type, start_date, end_date)
);

ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage payroll periods" ON payroll_periods FOR ALL USING (is_staff_user());
CREATE INDEX idx_payroll_periods_dates ON payroll_periods(start_date, end_date);
CREATE INDEX idx_payroll_periods_status ON payroll_periods(status);

-- payroll_adjustments
CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  payroll_period_id uuid REFERENCES payroll_periods(id),
  adjustment_type text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  is_deduction boolean DEFAULT false,
  description text NOT NULL,
  reference_number text,
  effective_date date NOT NULL,
  status text DEFAULT 'pending',
  applied_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage payroll adjustments" ON payroll_adjustments FOR ALL USING (is_staff_user());
CREATE INDEX idx_adj_employee ON payroll_adjustments(employee_id);
CREATE INDEX idx_adj_period ON payroll_adjustments(payroll_period_id);

-- employee_loans
CREATE TABLE IF NOT EXISTS employee_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_number text UNIQUE NOT NULL,
  employee_id uuid REFERENCES employees(id) NOT NULL,
  loan_type text NOT NULL,
  principal_amount numeric NOT NULL CHECK (principal_amount > 0),
  interest_rate numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  installment_amount numeric NOT NULL,
  installments_count integer NOT NULL,
  installments_paid integer DEFAULT 0,
  remaining_balance numeric NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text DEFAULT 'active',
  notes text,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE employee_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage loans" ON employee_loans FOR ALL USING (is_staff_user());
CREATE INDEX idx_loans_emp ON employee_loans(employee_id);

-- loan_repayments
CREATE TABLE IF NOT EXISTS loan_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES employee_loans(id) ON DELETE CASCADE NOT NULL,
  payroll_record_id uuid REFERENCES payroll_records(id),
  installment_number integer NOT NULL,
  amount numeric NOT NULL,
  principal_amount numeric,
  interest_amount numeric,
  remaining_balance numeric NOT NULL,
  payment_date date NOT NULL,
  payment_method text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage loan repayments" ON loan_repayments FOR ALL USING (is_staff_user());
CREATE INDEX idx_repay_loan ON loan_repayments(loan_id);

-- payroll_settings
CREATE TABLE IF NOT EXISTS payroll_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view payroll settings" ON payroll_settings FOR SELECT USING (is_staff_user());
CREATE POLICY "Admin manage payroll settings" ON payroll_settings FOR ALL USING (is_admin());

-- payroll_bank_files
CREATE TABLE IF NOT EXISTS payroll_bank_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number text UNIQUE NOT NULL,
  payroll_period_id uuid REFERENCES payroll_periods(id) NOT NULL,
  bank_name text NOT NULL,
  file_format text NOT NULL,
  total_amount numeric NOT NULL,
  record_count integer NOT NULL,
  file_content text,
  file_url text,
  status text DEFAULT 'generated',
  submitted_at timestamptz,
  processed_at timestamptz,
  error_message text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payroll_bank_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage bank files" ON payroll_bank_files FOR ALL USING (is_staff_user());
CREATE INDEX idx_bank_files_period ON payroll_bank_files(payroll_period_id);

-- Seed payroll settings
INSERT INTO payroll_settings (setting_key, setting_value, description) VALUES
  ('working_days_per_month', '{"value": 22}', 'Standard working days per month'),
  ('working_hours_per_day', '{"value": 8}', 'Standard working hours per day'),
  ('overtime_rate_multiplier', '{"regular": 1.25, "weekend": 1.5, "holiday": 2.0}', 'Overtime rate multipliers'),
  ('currency', '{"code": "OMR", "symbol": "ر.ع.", "decimals": 3}', 'Payroll currency settings'),
  ('payment_day', '{"value": 28}', 'Default payment day of month')
ON CONFLICT (setting_key) DO NOTHING;
