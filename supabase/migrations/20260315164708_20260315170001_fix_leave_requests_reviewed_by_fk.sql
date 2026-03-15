/*
  # Add FK constraint for leave_requests.reviewed_by → profiles.id

  The leave_requests table uses reviewed_by (not approved_by) as the column
  linking to profiles. This migration adds the FK constraint so PostgREST
  can resolve the relational join.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'leave_requests'
      AND constraint_name = 'leave_requests_reviewed_by_fkey'
  ) THEN
    ALTER TABLE leave_requests
      ADD CONSTRAINT leave_requests_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'leave_requests'
      AND constraint_name = 'leave_requests_leave_type_id_fkey'
  ) THEN
    ALTER TABLE leave_requests
      ADD CONSTRAINT leave_requests_leave_type_id_fkey
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'leave_balances'
      AND constraint_name = 'leave_balances_leave_type_id_fkey'
  ) THEN
    ALTER TABLE leave_balances
      ADD CONSTRAINT leave_balances_leave_type_id_fkey
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT;
  END IF;
END $$;
