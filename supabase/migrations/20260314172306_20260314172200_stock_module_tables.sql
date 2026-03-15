/*
  # Stock Module — New Tables & Column Augmentation

  ## Summary
  Adds new columns to existing stock_categories and stock_items tables,
  and creates the new tables: stock_sales, stock_transactions, stock_sale_items,
  stock_serial_numbers, stock_adjustment_sessions, stock_adjustment_session_items,
  and stock_price_history.

  ## Security
  RLS enabled on all tables with is_staff_user() policies.
*/

-- ============================================================
-- Augment stock_categories
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_categories' AND column_name = 'category_type') THEN
    ALTER TABLE stock_categories ADD COLUMN category_type text NOT NULL DEFAULT 'internal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_categories' AND column_name = 'sort_order') THEN
    ALTER TABLE stock_categories ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_categories' AND column_name = 'deleted_at') THEN
    ALTER TABLE stock_categories ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- ============================================================
-- Augment stock_items
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'item_type') THEN
    ALTER TABLE stock_items ADD COLUMN item_type text NOT NULL DEFAULT 'internal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'current_quantity') THEN
    ALTER TABLE stock_items ADD COLUMN current_quantity numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'reserved_quantity') THEN
    ALTER TABLE stock_items ADD COLUMN reserved_quantity numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'minimum_quantity') THEN
    ALTER TABLE stock_items ADD COLUMN minimum_quantity numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'cost_price') THEN
    ALTER TABLE stock_items ADD COLUMN cost_price numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'selling_price') THEN
    ALTER TABLE stock_items ADD COLUMN selling_price numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'tax_inclusive') THEN
    ALTER TABLE stock_items ADD COLUMN tax_inclusive boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'tax_rate_id') THEN
    ALTER TABLE stock_items ADD COLUMN tax_rate_id uuid REFERENCES tax_rates(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'brand') THEN
    ALTER TABLE stock_items ADD COLUMN brand text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'model') THEN
    ALTER TABLE stock_items ADD COLUMN model text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'capacity') THEN
    ALTER TABLE stock_items ADD COLUMN capacity text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'warranty_months') THEN
    ALTER TABLE stock_items ADD COLUMN warranty_months integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'location') THEN
    ALTER TABLE stock_items ADD COLUMN location text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'barcode') THEN
    ALTER TABLE stock_items ADD COLUMN barcode text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'image_url') THEN
    ALTER TABLE stock_items ADD COLUMN image_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'specifications') THEN
    ALTER TABLE stock_items ADD COLUMN specifications jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'is_featured') THEN
    ALTER TABLE stock_items ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'notes') THEN
    ALTER TABLE stock_items ADD COLUMN notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'deleted_at') THEN
    ALTER TABLE stock_items ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- ============================================================
-- Enable RLS on existing tables
-- ============================================================
ALTER TABLE stock_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;

-- Drop and recreate to ensure proper policies
DROP POLICY IF EXISTS "stock_categories staff select" ON stock_categories;
DROP POLICY IF EXISTS "stock_categories staff insert" ON stock_categories;
DROP POLICY IF EXISTS "stock_categories staff update" ON stock_categories;
DROP POLICY IF EXISTS "stock_categories staff delete" ON stock_categories;
DROP POLICY IF EXISTS "stock_items staff select" ON stock_items;
DROP POLICY IF EXISTS "stock_items staff insert" ON stock_items;
DROP POLICY IF EXISTS "stock_items staff update" ON stock_items;
DROP POLICY IF EXISTS "stock_items staff delete" ON stock_items;

CREATE POLICY "stock_categories staff select" ON stock_categories FOR SELECT TO authenticated USING (is_staff_user());
CREATE POLICY "stock_categories staff insert" ON stock_categories FOR INSERT TO authenticated WITH CHECK (is_staff_user());
CREATE POLICY "stock_categories staff update" ON stock_categories FOR UPDATE TO authenticated USING (is_staff_user()) WITH CHECK (is_staff_user());
CREATE POLICY "stock_categories staff delete" ON stock_categories FOR DELETE TO authenticated USING (is_staff_user());

CREATE POLICY "stock_items staff select" ON stock_items FOR SELECT TO authenticated USING (is_staff_user());
CREATE POLICY "stock_items staff insert" ON stock_items FOR INSERT TO authenticated WITH CHECK (is_staff_user());
CREATE POLICY "stock_items staff update" ON stock_items FOR UPDATE TO authenticated USING (is_staff_user()) WITH CHECK (is_staff_user());
CREATE POLICY "stock_items staff delete" ON stock_items FOR DELETE TO authenticated USING (is_staff_user());

-- ============================================================
-- stock_sales
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text,
  sale_date timestamptz NOT NULL DEFAULT now(),
  case_id uuid REFERENCES cases(id),
  customer_id uuid NOT NULL REFERENCES customers_enhanced(id),
  company_id uuid REFERENCES companies(id),
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  discount_type text,
  discount_value numeric,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text,
  invoice_id uuid REFERENCES invoices(id),
  notes text,
  sold_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_sales_customer ON stock_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_stock_sales_case ON stock_sales(case_id);
CREATE INDEX IF NOT EXISTS idx_stock_sales_deleted ON stock_sales(deleted_at);

ALTER TABLE stock_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_sales staff select" ON stock_sales FOR SELECT TO authenticated USING (is_staff_user());
CREATE POLICY "stock_sales staff insert" ON stock_sales FOR INSERT TO authenticated WITH CHECK (is_staff_user());
CREATE POLICY "stock_sales staff update" ON stock_sales FOR UPDATE TO authenticated USING (is_staff_user()) WITH CHECK (is_staff_user());
CREATE POLICY "stock_sales staff delete" ON stock_sales FOR DELETE TO authenticated USING (is_staff_user());

-- ============================================================
-- stock_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL REFERENCES stock_items(id),
  transaction_type text NOT NULL,
  quantity numeric NOT NULL,
  previous_quantity numeric,
  new_quantity numeric,
  case_id uuid REFERENCES cases(id),
  customer_id uuid REFERENCES customers_enhanced(id),
  purchase_order_id uuid REFERENCES purchase_orders(id),
  sale_id uuid REFERENCES stock_sales(id),
  unit_cost numeric,
  unit_price numeric,
  reference_number text,
  notes text,
  performed_by uuid REFERENCES profiles(id),
  transaction_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_transactions_item ON stock_transactions(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_date ON stock_transactions(transaction_date);

ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_transactions staff select" ON stock_transactions FOR SELECT TO authenticated USING (is_staff_user());
CREATE POLICY "stock_transactions staff insert" ON stock_transactions FOR INSERT TO authenticated WITH CHECK (is_staff_user());
CREATE POLICY "stock_transactions staff update" ON stock_transactions FOR UPDATE TO authenticated USING (is_staff_user()) WITH CHECK (is_staff_user());
CREATE POLICY "stock_transactions staff delete" ON stock_transactions FOR DELETE TO authenticated USING (is_staff_user());

-- ============================================================
-- stock_sale_items
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES stock_sales(id),
  stock_item_id uuid NOT NULL REFERENCES stock_items(id),
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  cost_price numeric,
  discount_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL,
  serial_number text,
  warranty_start_date date,
  warranty_end_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_sale_items_sale ON stock_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_sale_items_item ON stock_sale_items(stock_item_id);

ALTER TABLE stock_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_sale_items staff select" ON stock_sale_items FOR SELECT TO authenticated USING (is_staff_user());
CREATE POLICY "stock_sale_items staff insert" ON stock_sale_items FOR INSERT TO authenticated WITH CHECK (is_staff_user());
CREATE POLICY "stock_sale_items staff update" ON stock_sale_items FOR UPDATE TO authenticated USING (is_staff_user()) WITH CHECK (is_staff_user());
CREATE POLICY "stock_sale_items staff delete" ON stock_sale_items FOR DELETE TO authenticated USING (is_staff_user());

-- ============================================================
-- stock_serial_numbers
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_serial_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL REFERENCES stock_items(id),
  serial_number text NOT NULL,
  status text NOT NULL DEFAULT 'in_stock',
  purchase_order_id uuid REFERENCES purchase_orders(id),
  purchase_date date,
  purchase_cost numeric,
  sale_id uuid REFERENCES stock_sales(id),
  sold_to_customer_id uuid REFERENCES customers_enhanced(id),
  sold_date date,
  warranty_end_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL,
  UNIQUE(stock_item_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_stock_serial_numbers_item ON stock_serial_numbers(stock_item_id);

ALTER TABLE stock_serial_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_serial_numbers staff select" ON stock_serial_numbers FOR SELECT TO authenticated USING (is_staff_user());
CREATE POLICY "stock_serial_numbers staff insert" ON stock_serial_numbers FOR INSERT TO authenticated WITH CHECK (is_staff_user());
CREATE POLICY "stock_serial_numbers staff update" ON stock_serial_numbers FOR UPDATE TO authenticated USING (is_staff_user()) WITH CHECK (is_staff_user());
CREATE POLICY "stock_serial_numbers staff delete" ON stock_serial_numbers FOR DELETE TO authenticated USING (is_staff_user());

-- ============================================================
-- stock_adjustment_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_adjustment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number text,
  adjustment_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

ALTER TABLE stock_adjustment_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_adjustment_sessions staff select" ON stock_adjustment_sessions FOR SELECT TO authenticated USING (is_staff_user());
CREATE POLICY "stock_adjustment_sessions staff insert" ON stock_adjustment_sessions FOR INSERT TO authenticated WITH CHECK (is_staff_user());
CREATE POLICY "stock_adjustment_sessions staff update" ON stock_adjustment_sessions FOR UPDATE TO authenticated USING (is_staff_user()) WITH CHECK (is_staff_user());
CREATE POLICY "stock_adjustment_sessions staff delete" ON stock_adjustment_sessions FOR DELETE TO authenticated USING (is_staff_user());

-- ============================================================
-- stock_adjustment_session_items
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_adjustment_session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES stock_adjustment_sessions(id),
  stock_item_id uuid NOT NULL REFERENCES stock_items(id),
  system_quantity numeric,
  counted_quantity numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_adj_session_items_session ON stock_adjustment_session_items(session_id);

ALTER TABLE stock_adjustment_session_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_adjustment_session_items staff select" ON stock_adjustment_session_items FOR SELECT TO authenticated USING (is_staff_user());
CREATE POLICY "stock_adjustment_session_items staff insert" ON stock_adjustment_session_items FOR INSERT TO authenticated WITH CHECK (is_staff_user());
CREATE POLICY "stock_adjustment_session_items staff update" ON stock_adjustment_session_items FOR UPDATE TO authenticated USING (is_staff_user()) WITH CHECK (is_staff_user());
CREATE POLICY "stock_adjustment_session_items staff delete" ON stock_adjustment_session_items FOR DELETE TO authenticated USING (is_staff_user());

-- ============================================================
-- stock_price_history
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL REFERENCES stock_items(id),
  price_type text NOT NULL,
  old_price numeric,
  new_price numeric,
  changed_by uuid REFERENCES profiles(id),
  change_reason text,
  effective_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_price_history_item ON stock_price_history(stock_item_id);

ALTER TABLE stock_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_price_history staff select" ON stock_price_history FOR SELECT TO authenticated USING (is_staff_user());
CREATE POLICY "stock_price_history staff insert" ON stock_price_history FOR INSERT TO authenticated WITH CHECK (is_staff_user());
