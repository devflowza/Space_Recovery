/*
  # Multi-Tenant SaaS Foundation

  ## Overview
  Transform xSuite from single-instance to multi-tenant SaaS platform.

  ## Changes

  ### 1. New Tables
  
  #### `subscription_plans`
  Defines available SaaS plans (Starter, Professional, Enterprise)
  
  #### `tenants`
  Central registry for all SaaS customers (data recovery labs)

  #### `onboarding_progress`
  Track tenant onboarding completion status
  
  ### 2. Altered Tables
  
  #### `profiles`
  - Added `tenant_id` (uuid) - Links user to their tenant

  ### 3. Functions
  
  #### `get_current_tenant_id()`
  Returns the tenant_id for the authenticated user
  
  #### `is_platform_admin()`
  Returns true if user has platform-level admin access (for SaaS management)

  ### 4. Security
  - RLS enabled on all new tables
  - Tenants can only access their own data
  - Platform admins can access all tenants

  ## Notes
  - This is Phase 1 of multi-tenant transformation
  - Existing single-tenant data will be assigned to default tenant
  - Additional tables will receive tenant_id in subsequent migrations
*/

-- =====================================================
-- 1. CREATE SUBSCRIPTION PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{"max_users": 5, "max_cases": 100, "max_storage_gb": 10}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- RLS for subscription_plans (simple - no tenant_id needed)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Admins can manage subscription plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- 2. SEED DEFAULT SUBSCRIPTION PLANS
-- =====================================================

INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, currency, features, limits, sort_order)
VALUES
  (
    'Starter',
    'starter',
    'Perfect for small data recovery labs getting started',
    29.00,
    290.00,
    'USD',
    '{"modules": ["cases", "customers", "quotes", "invoices", "basic_reports"], "features": ["customer_portal", "email_notifications", "basic_support"]}'::jsonb,
    '{"max_users": 3, "max_cases": 50, "max_storage_gb": 5, "max_customers": 100}'::jsonb,
    1
  ),
  (
    'Professional',
    'professional',
    'For growing labs with advanced needs',
    99.00,
    990.00,
    'USD',
    '{"modules": ["cases", "customers", "quotes", "invoices", "inventory", "reports", "banking", "expenses"], "features": ["customer_portal", "email_notifications", "whatsapp_integration", "advanced_reports", "priority_support", "custom_branding"]}'::jsonb,
    '{"max_users": 10, "max_cases": 500, "max_storage_gb": 50, "max_customers": 1000}'::jsonb,
    2
  ),
  (
    'Enterprise',
    'enterprise',
    'For large operations with unlimited scale',
    299.00,
    2990.00,
    'USD',
    '{"modules": ["all"], "features": ["everything", "sso", "api_access", "custom_integrations", "dedicated_support", "white_label", "advanced_security"]}'::jsonb,
    '{"max_users": -1, "max_cases": -1, "max_storage_gb": -1, "max_customers": -1}'::jsonb,
    3
  )
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 3. CREATE TENANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'cancelled', 'deleted')),
  plan_id UUID REFERENCES subscription_plans(id),
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  subscription_id TEXT,
  subscription_status TEXT,
  settings JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan_id);

-- RLS for tenants (will be updated after tenant_id added to profiles)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. ADD TENANT_ID TO PROFILES TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);
  END IF;
END $$;

-- =====================================================
-- 5. CREATE DEFAULT TENANT FOR EXISTING DATA
-- =====================================================

DO $$
DECLARE
  default_tenant_id UUID;
  professional_plan_id UUID;
BEGIN
  -- Get professional plan ID
  SELECT id INTO professional_plan_id FROM subscription_plans WHERE slug = 'professional';
  
  -- Create default tenant only if none exist
  IF NOT EXISTS (SELECT 1 FROM tenants LIMIT 1) THEN
    INSERT INTO tenants (
      name,
      slug,
      status,
      plan_id,
      trial_ends_at,
      settings,
      limits
    ) VALUES (
      'xSuite Data Recovery',
      'default',
      'active',
      professional_plan_id,
      NULL,
      '{"is_default": true}'::jsonb,
      '{"max_users": -1, "max_cases": -1, "max_storage_gb": -1}'::jsonb
    )
    RETURNING id INTO default_tenant_id;
    
    -- Assign all existing users to default tenant
    UPDATE profiles SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  END IF;
END $$;

-- =====================================================
-- 6. NOW ADD RLS POLICIES FOR TENANTS (after tenant_id exists)
-- =====================================================

CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage all tenants"
  ON tenants FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- 7. CREATE ONBOARDING PROGRESS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  steps_completed JSONB DEFAULT '[]',
  current_step TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tenant ON onboarding_progress(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_progress(user_id);

-- RLS for onboarding_progress
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's onboarding progress"
  ON onboarding_progress FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage their tenant's onboarding progress"
  ON onboarding_progress FOR ALL
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- 8. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$;

-- Function to check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
    AND tenant_id IS NULL
  );
$$;

-- =====================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE subscription_plans IS 'Available SaaS subscription plans with pricing and limits';
COMMENT ON TABLE tenants IS 'Multi-tenant registry - each tenant is a separate data recovery lab customer';
COMMENT ON TABLE onboarding_progress IS 'Tracks tenant onboarding wizard completion status';
COMMENT ON FUNCTION get_current_tenant_id() IS 'Returns tenant_id for authenticated user';
COMMENT ON FUNCTION is_platform_admin() IS 'Returns true if user is platform admin (can manage tenants)';
