/*
  # Add Additional Columns to resource_clone_drives

  ## Summary
  The ResourceCloneDriveModal inserts/updates fields that don't exist on the
  resource_clone_drives table: serial_number, model, vendor, purchase_date,
  purchase_cost, warranty_expiry, physical_location_notes.

  Also, drive_code is NOT NULL with no default, which prevents inserts from the
  modal that doesn't provide it. Adding a default to auto-generate a drive code.

  ## Changes

  ### Modified Table: resource_clone_drives
  - Add `serial_number text` — physical drive serial (alias/convenience)
  - Add `model text` — physical drive model (alias/convenience)
  - Add `vendor text` — supplier/vendor name
  - Add `purchase_date date` — when the drive was purchased
  - Add `purchase_cost numeric` — cost of the drive
  - Add `warranty_expiry date` — warranty expiry date
  - Add `physical_location_notes text` — notes about physical location
  - Alter `drive_code` to have a default value (auto-generated)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_clone_drives' AND column_name = 'serial_number'
  ) THEN
    ALTER TABLE resource_clone_drives ADD COLUMN serial_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_clone_drives' AND column_name = 'model'
  ) THEN
    ALTER TABLE resource_clone_drives ADD COLUMN model text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_clone_drives' AND column_name = 'vendor'
  ) THEN
    ALTER TABLE resource_clone_drives ADD COLUMN vendor text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_clone_drives' AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE resource_clone_drives ADD COLUMN purchase_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_clone_drives' AND column_name = 'purchase_cost'
  ) THEN
    ALTER TABLE resource_clone_drives ADD COLUMN purchase_cost numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_clone_drives' AND column_name = 'warranty_expiry'
  ) THEN
    ALTER TABLE resource_clone_drives ADD COLUMN warranty_expiry date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_clone_drives' AND column_name = 'physical_location_notes'
  ) THEN
    ALTER TABLE resource_clone_drives ADD COLUMN physical_location_notes text;
  END IF;
END $$;

ALTER TABLE resource_clone_drives ALTER COLUMN drive_code SET DEFAULT concat('CLN-', substr(gen_random_uuid()::text, 1, 8));
