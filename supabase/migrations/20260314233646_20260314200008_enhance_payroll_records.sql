-- Enhance payroll_records with attendance and period tracking

ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS period_id uuid REFERENCES payroll_periods(id);
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS employee_number text;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS employee_name text;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS department_name text;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS position_title text;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS working_days numeric DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS days_worked numeric DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS days_absent numeric DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS days_leave numeric DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS days_holiday numeric DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS regular_hours numeric DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS overtime_hours numeric DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS daily_rate numeric;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS hourly_rate numeric;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS iban text;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON payroll_records(period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee ON payroll_records(employee_id);
