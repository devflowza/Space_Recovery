/*
  # Add tenant_id to Critical Business Tables

  ## Overview
  Add tenant_id column to high-traffic business tables for multi-tenant isolation.

  ## Tables Modified
  
  1. **cases** - Core data recovery cases
  2. **customers_enhanced** - Customer records
  3. **invoices** - Financial invoices
  4. **quotes** - Sales quotes
  5. **payments** - Payment records
  6. **expenses** - Expense tracking
  7. **inventory_items** - Inventory management
  8. **employees** - HR employee records
  9. **bank_accounts** - Banking accounts
  10. **suppliers** - Supplier records

  ## Changes for Each Table
  - Add `tenant_id UUID REFERENCES tenants(id)` column
  - Create index on tenant_id for query performance
  - Backfill tenant_id with default tenant for existing records

  ## Notes
  - Does NOT modify RLS policies yet (that's Phase 2)
  - Allows NULL temporarily for backward compatibility
  - Default tenant ID is assigned to all existing records
*/

-- =====================================================
-- 1. CASES TABLE
-- =====================================================

DO $$
DECLARE
  v_default_tenant_id UUID;
BEGIN
  SELECT id INTO v_default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cases' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE cases ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX idx_cases_tenant_id ON cases(tenant_id);
    
    EXECUTE 'UPDATE cases SET tenant_id = $1 WHERE tenant_id IS NULL' USING v_default_tenant_id;
  END IF;
END $$;

-- =====================================================
-- 2. CUSTOMERS_ENHANCED TABLE
-- =====================================================

DO $$
DECLARE
  v_default_tenant_id UUID;
BEGIN
  SELECT id INTO v_default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers_enhanced' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE customers_enhanced ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX idx_customers_enhanced_tenant_id ON customers_enhanced(tenant_id);
    
    EXECUTE 'UPDATE customers_enhanced SET tenant_id = $1 WHERE tenant_id IS NULL' USING v_default_tenant_id;
  END IF;
END $$;

-- =====================================================
-- 3. INVOICES TABLE
-- =====================================================

DO $$
DECLARE
  v_default_tenant_id UUID;
BEGIN
  SELECT id INTO v_default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
    
    EXECUTE 'UPDATE invoices SET tenant_id = $1 WHERE tenant_id IS NULL' USING v_default_tenant_id;
  END IF;
END $$;

-- =====================================================
-- 4. QUOTES TABLE
-- =====================================================

DO $$
DECLARE
  v_default_tenant_id UUID;
BEGIN
  SELECT id INTO v_default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE quotes ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX idx_quotes_tenant_id ON quotes(tenant_id);
    
    EXECUTE 'UPDATE quotes SET tenant_id = $1 WHERE tenant_id IS NULL' USING v_default_tenant_id;
  END IF;
END $$;

-- =====================================================
-- 5. PAYMENTS TABLE
-- =====================================================

DO $$
DECLARE
  v_default_tenant_id UUID;
BEGIN
  SELECT id INTO v_default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
    
    EXECUTE 'UPDATE payments SET tenant_id = $1 WHERE tenant_id IS NULL' USING v_default_tenant_id;
  END IF;
END $$;

-- =====================================================
-- 6. EXPENSES TABLE
-- =====================================================

DO $$
DECLARE
  v_default_tenant_id UUID;
BEGIN
  SELECT id INTO v_default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX idx_expenses_tenant_id ON expenses(tenant_id);
    
    EXECUTE 'UPDATE expenses SET tenant_id = $1 WHERE tenant_id IS NULL' USING v_default_tenant_id;
  END IF;
END $$;

-- =====================================================
-- 7. INVENTORY_ITEMS TABLE
-- =====================================================

DO $$
DECLARE
  v_default_tenant_id UUID;
BEGIN
  SELECT id INTO v_default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX idx_inventory_items_tenant_id ON inventory_items(tenant_id);
    
    EXECUTE 'UPDATE inventory_items SET tenant_id = $1 WHERE tenant_id IS NULL' USING v_default_tenant_id;
  END IF;
END $$;

-- =====================================================
-- 8. EMPLOYEES TABLE
-- =====================================================

DO $$
DECLARE
  v_default_tenant_id UUID;
BEGIN
  SELECT id INTO v_default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX idx_employees_tenant_id ON employees(tenant_id);
    
    EXECUTE 'UPDATE employees SET tenant_id = $1 WHERE tenant_id IS NULL' USING v_default_tenant_id;
  END IF;
END $$;

-- =====================================================
-- 9. BANK_ACCOUNTS TABLE
-- =====================================================

DO $$
DECLARE
  v_default_tenant_id UUID;
BEGIN
  SELECT id INTO v_default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_accounts' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE bank_accounts ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX idx_bank_accounts_tenant_id ON bank_accounts(tenant_id);
    
    EXECUTE 'UPDATE bank_accounts SET tenant_id = $1 WHERE tenant_id IS NULL' USING v_default_tenant_id;
  END IF;
END $$;

-- =====================================================
-- 10. SUPPLIERS TABLE
-- =====================================================

DO $$
DECLARE
  v_default_tenant_id UUID;
BEGIN
  SELECT id INTO v_default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX idx_suppliers_tenant_id ON suppliers(tenant_id);
    
    EXECUTE 'UPDATE suppliers SET tenant_id = $1 WHERE tenant_id IS NULL' USING v_default_tenant_id;
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN cases.tenant_id IS 'Multi-tenant isolation - links case to owning tenant';
COMMENT ON COLUMN customers_enhanced.tenant_id IS 'Multi-tenant isolation - links customer to owning tenant';
COMMENT ON COLUMN invoices.tenant_id IS 'Multi-tenant isolation - links invoice to owning tenant';
COMMENT ON COLUMN quotes.tenant_id IS 'Multi-tenant isolation - links quote to owning tenant';
