/*
  # Phase 2B: Billing Infrastructure with PayPal Integration
  
  Creates 10 new billing tables for subscription management, invoicing,
  usage tracking, payment methods, webhook events, coupons, and plan features.
  
  All tables have RLS enabled with tenant isolation policies.
*/

-- Update number_sequences scope constraint to allow billing_invoice
ALTER TABLE number_sequences DROP CONSTRAINT IF EXISTS number_sequences_scope_check;
ALTER TABLE number_sequences ADD CONSTRAINT number_sequences_scope_check CHECK (
  scope = ANY (ARRAY[
    'case'::text, 'invoice'::text, 'quote'::text, 'customer'::text, 
    'expense'::text, 'asset'::text, 'proforma_invoice'::text, 'inventory'::text, 
    'transfer'::text, 'deposit'::text, 'company'::text, 'supplier'::text, 
    'stock'::text, 'purchase_order'::text, 'employee'::text, 'user'::text, 
    'document'::text, 'clone_drive'::text, 'report'::text, 'report_evaluation'::text, 
    'report_service'::text, 'report_server'::text, 'report_malware'::text, 
    'report_forensic'::text, 'report_data_destruction'::text, 'report_prevention'::text, 
    'payment'::text, 'stock_sale'::text, 'stock_adjustment'::text, 'loan'::text, 
    'payroll_bank_file'::text, 'billing_invoice'::text
  ])
);

-- Add PayPal columns to subscription_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription_plans' AND column_name = 'paypal_plan_monthly_id'
  ) THEN
    ALTER TABLE subscription_plans 
      ADD COLUMN paypal_plan_monthly_id text,
      ADD COLUMN paypal_plan_yearly_id text,
      ADD COLUMN paypal_product_id text,
      ADD COLUMN trial_days integer DEFAULT 14,
      ADD COLUMN code text;
  END IF;
END $$;

UPDATE subscription_plans SET code = 'starter' WHERE slug = 'starter' AND code IS NULL;
UPDATE subscription_plans SET code = 'professional' WHERE slug = 'professional' AND code IS NULL;
UPDATE subscription_plans SET code = 'enterprise' WHERE slug = 'enterprise' AND code IS NULL;

-- Tenant Subscriptions
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) NOT NULL UNIQUE,
  plan_id uuid REFERENCES subscription_plans(id) NOT NULL,
  status text DEFAULT 'trialing',
  paypal_subscription_id text UNIQUE,
  paypal_plan_id text,
  paypal_customer_email text,
  billing_interval text DEFAULT 'month',
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  trial_used boolean DEFAULT false,
  cancelled_at timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  cancel_reason text,
  last_payment_date timestamptz,
  last_payment_amount integer,
  next_billing_date timestamptz,
  billing_email text,
  billing_name text,
  billing_address jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_paypal ON tenant_subscriptions(paypal_subscription_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status) WHERE deleted_at IS NULL;

-- Billing Invoices
CREATE TABLE IF NOT EXISTS billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) NOT NULL,
  subscription_id uuid REFERENCES tenant_subscriptions(id),
  paypal_invoice_id text,
  paypal_payment_id text,
  paypal_transaction_id text,
  invoice_number text NOT NULL,
  invoice_date timestamptz DEFAULT now(),
  due_date timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  currency text DEFAULT 'USD',
  subtotal integer NOT NULL DEFAULT 0,
  discount_amount integer DEFAULT 0,
  tax_amount integer DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  amount_paid integer DEFAULT 0,
  amount_due integer DEFAULT 0,
  tax_rate numeric,
  tax_type text,
  tax_country text,
  status text DEFAULT 'draft',
  paid_at timestamptz,
  payment_method text,
  invoice_pdf_url text,
  memo text,
  footer text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_tenant ON billing_invoices(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON billing_invoices(status) WHERE deleted_at IS NULL;

-- Billing Invoice Items
CREATE TABLE IF NOT EXISTS billing_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES billing_invoices(id) ON DELETE CASCADE NOT NULL,
  paypal_item_id text,
  description text NOT NULL,
  quantity integer DEFAULT 1,
  unit_amount integer NOT NULL,
  amount integer NOT NULL,
  period_start timestamptz,
  period_end timestamptz,
  item_type text DEFAULT 'subscription',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_invoice_items_invoice ON billing_invoice_items(invoice_id) WHERE deleted_at IS NULL;

-- Usage Records
CREATE TABLE IF NOT EXISTS usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) NOT NULL,
  metric_name text NOT NULL,
  quantity bigint NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  last_value bigint,
  delta bigint,
  reported_to_paypal boolean DEFAULT false,
  paypal_usage_record_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL,
  UNIQUE(tenant_id, metric_name, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_records_tenant ON usage_records(tenant_id, metric_name) WHERE deleted_at IS NULL;

-- Usage Snapshots
CREATE TABLE IF NOT EXISTS usage_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) NOT NULL,
  snapshot_date date NOT NULL,
  snapshot_hour integer,
  total_users integer DEFAULT 0,
  active_users integer DEFAULT 0,
  total_cases integer DEFAULT 0,
  cases_this_month integer DEFAULT 0,
  storage_bytes bigint DEFAULT 0,
  api_calls_today integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL,
  UNIQUE(tenant_id, snapshot_date, snapshot_hour)
);

CREATE INDEX IF NOT EXISTS idx_usage_snapshots_tenant ON usage_snapshots(tenant_id, snapshot_date) WHERE deleted_at IS NULL;

-- Tenant Payment Methods
CREATE TABLE IF NOT EXISTS tenant_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) NOT NULL,
  payment_method_id text UNIQUE NOT NULL,
  payment_provider text DEFAULT 'paypal',
  type text NOT NULL,
  card_brand text,
  card_last4 text,
  card_exp_month integer,
  card_exp_year integer,
  card_funding text,
  paypal_email text,
  paypal_account_id text,
  bank_name text,
  bank_last4 text,
  is_default boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  billing_name text,
  billing_email text,
  billing_address jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_payment_methods_tenant ON tenant_payment_methods(tenant_id) WHERE deleted_at IS NULL;

-- Billing Events
CREATE TABLE IF NOT EXISTS billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  paypal_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_billing_events_processed ON billing_events(processed) WHERE deleted_at IS NULL AND NOT processed;

-- Billing Coupons
CREATE TABLE IF NOT EXISTS billing_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_coupon_id text,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  currency text DEFAULT 'USD',
  applies_to_plans uuid[],
  duration text DEFAULT 'once',
  duration_months integer,
  max_redemptions integer,
  redemptions_count integer DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_coupons_code ON billing_coupons(code) WHERE deleted_at IS NULL;

-- Coupon Redemptions
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) NOT NULL,
  coupon_id uuid REFERENCES billing_coupons(id) NOT NULL,
  paypal_discount_id text,
  redeemed_at timestamptz DEFAULT now(),
  applied_to_subscription uuid REFERENCES tenant_subscriptions(id),
  discount_amount_total integer DEFAULT 0,
  periods_remaining integer,
  deleted_at timestamptz DEFAULT NULL,
  UNIQUE(tenant_id, coupon_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_tenant ON coupon_redemptions(tenant_id) WHERE deleted_at IS NULL;

-- Plan Features
CREATE TABLE IF NOT EXISTS plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES subscription_plans(id) NOT NULL,
  feature_key text NOT NULL,
  feature_name text NOT NULL,
  feature_name_ar text,
  is_enabled boolean DEFAULT true,
  limit_value integer,
  limit_type text,
  display_order integer DEFAULT 0,
  is_highlighted boolean DEFAULT false,
  deleted_at timestamptz DEFAULT NULL,
  UNIQUE(plan_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_features(plan_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tenant_subscriptions select own" ON tenant_subscriptions
  FOR SELECT USING (tenant_id = get_current_tenant_id() OR is_platform_admin());

CREATE POLICY "tenant_subscriptions admin all" ON tenant_subscriptions
  FOR ALL USING (is_platform_admin());

CREATE POLICY "billing_invoices select own" ON billing_invoices
  FOR SELECT USING (tenant_id = get_current_tenant_id() OR is_platform_admin());

CREATE POLICY "billing_invoices admin all" ON billing_invoices
  FOR ALL USING (is_platform_admin());

CREATE POLICY "billing_invoice_items select own" ON billing_invoice_items
  FOR SELECT USING (
    invoice_id IN (SELECT id FROM billing_invoices WHERE tenant_id = get_current_tenant_id())
    OR is_platform_admin()
  );

CREATE POLICY "billing_invoice_items admin all" ON billing_invoice_items
  FOR ALL USING (is_platform_admin());

CREATE POLICY "usage_records select own" ON usage_records
  FOR SELECT USING (tenant_id = get_current_tenant_id() OR is_platform_admin());

CREATE POLICY "usage_records system insert" ON usage_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "usage_records admin all" ON usage_records
  FOR ALL USING (is_platform_admin());

CREATE POLICY "usage_snapshots select own" ON usage_snapshots
  FOR SELECT USING (tenant_id = get_current_tenant_id() OR is_platform_admin());

CREATE POLICY "usage_snapshots system insert" ON usage_snapshots
  FOR INSERT WITH CHECK (true);

CREATE POLICY "usage_snapshots admin all" ON usage_snapshots
  FOR ALL USING (is_platform_admin());

CREATE POLICY "tenant_payment_methods all own" ON tenant_payment_methods
  FOR ALL USING (tenant_id = get_current_tenant_id() OR is_platform_admin());

CREATE POLICY "billing_events admin all" ON billing_events
  FOR ALL USING (is_platform_admin());

CREATE POLICY "billing_coupons select active" ON billing_coupons
  FOR SELECT USING (is_active = true AND (valid_until IS NULL OR valid_until > now()) AND deleted_at IS NULL);

CREATE POLICY "billing_coupons admin all" ON billing_coupons
  FOR ALL USING (is_platform_admin());

CREATE POLICY "coupon_redemptions select own" ON coupon_redemptions
  FOR SELECT USING (tenant_id = get_current_tenant_id() OR is_platform_admin());

CREATE POLICY "coupon_redemptions insert own" ON coupon_redemptions
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id() OR is_platform_admin());

CREATE POLICY "coupon_redemptions admin all" ON coupon_redemptions
  FOR ALL USING (is_platform_admin());

CREATE POLICY "plan_features select all" ON plan_features
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "plan_features admin all" ON plan_features
  FOR ALL USING (is_platform_admin());

-- Add invoice number sequence
INSERT INTO number_sequences (scope, prefix, padding, last_number, annual_reset, tenant_id)
SELECT 'billing_invoice', 'BINV#', 5, 0, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM number_sequences WHERE scope = 'billing_invoice');

-- Update triggers
CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_invoices_updated_at
  BEFORE UPDATE ON billing_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_payment_methods_updated_at
  BEFORE UPDATE ON tenant_payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_coupons_updated_at
  BEFORE UPDATE ON billing_coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
