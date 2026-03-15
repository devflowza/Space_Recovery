/*
  # Fix employees table and HR module foreign key constraints

  ## Summary
  The `employees` table was missing essential columns and all HR-related tables
  were missing foreign key constraints that PostgREST requires to perform
  relational joins via the REST API.

  ## Changes

  ### 1. employees table — new columns
  - `first_name` (text): Employee's first name
  - `last_name` (text): Employee's last name
  - `deleted_at` (timestamptz): Soft-delete timestamp (project convention for all tables)

  ### 2. New foreign key constraints
  Added FK constraints so PostgREST can resolve relational joins:
  - `employees.department_id` → `departments.id`
  - `employees.position_id` → `positions.id`
  - `recruitment_jobs.department_id` → `departments.id`
  - `recruitment_jobs.position_id` → `positions.id`
  - `onboarding_checklists.for_position_id` → `positions.id`
  - `performance_reviews.employee_id` → `employees.id`
  - `performance_reviews.reviewer_id` → `profiles.id`
  - `timesheets.employee_id` → `employees.id`
  - `leave_requests.employee_id` → `employees.id`
  - `leave_balances.employee_id` → `employees.id`
  - `payroll_records.employee_id` → `employees.id`
  - `attendance_records.employee_id` → `employees.id`

  ## Notes
  - All column additions use IF NOT EXISTS guards
  - All FK additions use DO blocks with existence checks to be idempotent
  - No data is removed or modified
*/

-- 1. Add missing columns to employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE employees ADD COLUMN first_name text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE employees ADD COLUMN last_name text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE employees ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- 2. FK: employees.department_id → departments.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'employees'
      AND constraint_name = 'employees_department_id_fkey'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT employees_department_id_fkey
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. FK: employees.position_id → positions.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'employees'
      AND constraint_name = 'employees_position_id_fkey'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT employees_position_id_fkey
      FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. FK: recruitment_jobs.department_id → departments.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'recruitment_jobs'
      AND constraint_name = 'recruitment_jobs_department_id_fkey'
  ) THEN
    ALTER TABLE recruitment_jobs
      ADD CONSTRAINT recruitment_jobs_department_id_fkey
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. FK: recruitment_jobs.position_id → positions.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'recruitment_jobs'
      AND constraint_name = 'recruitment_jobs_position_id_fkey'
  ) THEN
    ALTER TABLE recruitment_jobs
      ADD CONSTRAINT recruitment_jobs_position_id_fkey
      FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 6. FK: onboarding_checklists.for_position_id → positions.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'onboarding_checklists'
      AND constraint_name = 'onboarding_checklists_for_position_id_fkey'
  ) THEN
    ALTER TABLE onboarding_checklists
      ADD CONSTRAINT onboarding_checklists_for_position_id_fkey
      FOREIGN KEY (for_position_id) REFERENCES positions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 7. FK: performance_reviews.employee_id → employees.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'performance_reviews'
      AND constraint_name = 'performance_reviews_employee_id_fkey'
  ) THEN
    ALTER TABLE performance_reviews
      ADD CONSTRAINT performance_reviews_employee_id_fkey
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 8. FK: performance_reviews.reviewer_id → profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'performance_reviews'
      AND constraint_name = 'performance_reviews_reviewer_id_fkey'
  ) THEN
    ALTER TABLE performance_reviews
      ADD CONSTRAINT performance_reviews_reviewer_id_fkey
      FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 9. FK: timesheets.employee_id → employees.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'timesheets'
      AND constraint_name = 'timesheets_employee_id_fkey'
  ) THEN
    ALTER TABLE timesheets
      ADD CONSTRAINT timesheets_employee_id_fkey
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 10. FK: leave_requests.employee_id → employees.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'leave_requests'
      AND constraint_name = 'leave_requests_employee_id_fkey'
  ) THEN
    ALTER TABLE leave_requests
      ADD CONSTRAINT leave_requests_employee_id_fkey
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 11. FK: leave_balances.employee_id → employees.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'leave_balances'
      AND constraint_name = 'leave_balances_employee_id_fkey'
  ) THEN
    ALTER TABLE leave_balances
      ADD CONSTRAINT leave_balances_employee_id_fkey
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 12. FK: payroll_records.employee_id → employees.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'payroll_records'
      AND constraint_name = 'payroll_records_employee_id_fkey'
  ) THEN
    ALTER TABLE payroll_records
      ADD CONSTRAINT payroll_records_employee_id_fkey
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 13. FK: attendance_records.employee_id → employees.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'attendance_records'
      AND constraint_name = 'attendance_records_employee_id_fkey'
  ) THEN
    ALTER TABLE attendance_records
      ADD CONSTRAINT attendance_records_employee_id_fkey
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;
END $$;
