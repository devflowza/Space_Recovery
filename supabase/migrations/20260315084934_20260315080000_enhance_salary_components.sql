/*
  # Enhance Salary Components Table

  1. Changes
    - Add `code` column for unique component identifier (e.g., 'BASIC', 'HRA', 'PASI')
    - Add `name_ar` column for Arabic translations
    - Add `percentage_of` column for percentage-based calculations base reference
    - Add `is_recurring` column to mark recurring vs one-time components
    - Add `is_mandatory` column to mark required components
    - Add `sort_order` column for display ordering
    - Add `deleted_at` column for soft deletes
    - Add unique constraint on (tenant_id, code)

  2. Security
    - No RLS changes needed (already enabled)
*/

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_components' AND column_name = 'code') THEN
    ALTER TABLE salary_components ADD COLUMN code text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_components' AND column_name = 'name_ar') THEN
    ALTER TABLE salary_components ADD COLUMN name_ar text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_components' AND column_name = 'percentage_of') THEN
    ALTER TABLE salary_components ADD COLUMN percentage_of text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_components' AND column_name = 'is_recurring') THEN
    ALTER TABLE salary_components ADD COLUMN is_recurring boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_components' AND column_name = 'is_mandatory') THEN
    ALTER TABLE salary_components ADD COLUMN is_mandatory boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_components' AND column_name = 'sort_order') THEN
    ALTER TABLE salary_components ADD COLUMN sort_order integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_components' AND column_name = 'deleted_at') THEN
    ALTER TABLE salary_components ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Add unique constraint on (tenant_id, code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salary_components_tenant_code_unique'
  ) THEN
    ALTER TABLE salary_components ADD CONSTRAINT salary_components_tenant_code_unique UNIQUE(tenant_id, code);
  END IF;
END $$;

-- Create index on sort_order
CREATE INDEX IF NOT EXISTS idx_salary_components_sort_order ON salary_components(sort_order);
