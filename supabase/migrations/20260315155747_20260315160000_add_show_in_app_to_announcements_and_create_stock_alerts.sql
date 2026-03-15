/*
  # Fix missing columns and tables causing 400/404 errors

  ## Changes

  1. platform_announcements
     - Add `show_in_app` boolean column (DEFAULT true) — was being queried but didn't exist

  2. stock_alerts (new table)
     - Creates the stock_alerts table queried by stockService.ts
     - Columns: id, stock_item_id, alert_type, is_read, is_dismissed, message, created_at, updated_at, tenant_id
     - RLS enabled with staff access policies
*/

-- 1. Add show_in_app to platform_announcements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_announcements' AND column_name = 'show_in_app'
  ) THEN
    ALTER TABLE platform_announcements ADD COLUMN show_in_app boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- 2. Create stock_alerts table
CREATE TABLE IF NOT EXISTS stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE,
  alert_type text NOT NULL DEFAULT 'low_stock',
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  message text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_alerts staff select"
  ON stock_alerts FOR SELECT
  TO authenticated
  USING (is_staff_user());

CREATE POLICY "stock_alerts staff insert"
  ON stock_alerts FOR INSERT
  TO authenticated
  WITH CHECK (is_staff_user());

CREATE POLICY "stock_alerts staff update"
  ON stock_alerts FOR UPDATE
  TO authenticated
  USING (is_staff_user())
  WITH CHECK (is_staff_user());

CREATE POLICY "stock_alerts staff delete"
  ON stock_alerts FOR DELETE
  TO authenticated
  USING (is_staff_user());
