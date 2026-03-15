/*
  # Add Foreign Key Columns to resource_clone_drives

  ## Summary
  The Clone Drives list page queries resource_clone_drives with PostgREST
  relationship joins to brands, capacities, device_types, device_interfaces,
  and device_conditions. These joins require foreign key constraints to exist
  in the database, but the table only had plain text columns with no FK references.

  ## Changes

  ### Modified Table: resource_clone_drives
  - Add `brand_id uuid` — FK to brands(id)
  - Add `capacity_id uuid` — FK to capacities(id)
  - Add `device_type_id uuid` — FK to device_types(id)
  - Add `interface_id uuid` — FK to device_interfaces(id)
  - Add `condition_id bigint` — FK to device_conditions(id) (bigint PK)

  ## Notes
  - All columns are nullable (existing rows have no FK data to backfill)
  - No existing columns are dropped or modified
  - device_conditions.id is bigint, all others are uuid
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_clone_drives' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE resource_clone_drives ADD COLUMN brand_id uuid REFERENCES brands(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_clone_drives' AND column_name = 'capacity_id'
  ) THEN
    ALTER TABLE resource_clone_drives ADD COLUMN capacity_id uuid REFERENCES capacities(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_clone_drives' AND column_name = 'device_type_id'
  ) THEN
    ALTER TABLE resource_clone_drives ADD COLUMN device_type_id uuid REFERENCES device_types(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_clone_drives' AND column_name = 'interface_id'
  ) THEN
    ALTER TABLE resource_clone_drives ADD COLUMN interface_id uuid REFERENCES device_interfaces(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_clone_drives' AND column_name = 'condition_id'
  ) THEN
    ALTER TABLE resource_clone_drives ADD COLUMN condition_id bigint REFERENCES device_conditions(id);
  END IF;
END $$;
