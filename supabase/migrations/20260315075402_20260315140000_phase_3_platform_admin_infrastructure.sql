/*
  # Phase 3: Platform Admin Infrastructure
  
  ## Overview
  This migration creates the complete platform administration system for SaaS management.
  
  ## New Tables
  
  ### 1. `platform_admins`
  Tracks super admin users who can manage all tenants. Manually managed via database.
  
  ### 2. `tenant_health_metrics`
  Daily snapshots of tenant health scores and risk indicators.
  
  ### 3. `tenant_activity_log`
  Tracks significant tenant activities for analytics and monitoring.
  
  ### 4. `support_tickets`
  Help desk tickets for tenant support.
  
  ### 5. `support_ticket_messages`
  Threaded conversation messages for support tickets.
  
  ### 6. `platform_announcements`
  System-wide announcements and notifications.
  
  ### 7. `announcement_dismissals`
  Tracks which users have dismissed which announcements.
  
  ### 8. `platform_metrics`
  Daily aggregated platform-wide statistics.
  
  ## Security
  - RLS enabled on all 8 tables
  - Platform admins have full access via `is_platform_admin()`
  - Tenants can view only their own tickets
  - All users can view active announcements targeted to them
  
  ## Indexes
  - Performance indexes on dates, tenant IDs, status fields
  
  ## Number Sequences
  - Add `support_ticket` scope for ticket numbers
*/

-- =====================================================
-- 1. UPDATE NUMBER SEQUENCES CONSTRAINT
-- =====================================================

ALTER TABLE number_sequences DROP CONSTRAINT IF EXISTS number_sequences_scope_check;

ALTER TABLE number_sequences ADD CONSTRAINT number_sequences_scope_check
CHECK (scope = ANY (ARRAY[
  'case'::text, 'invoice'::text, 'quote'::text, 'customer'::text, 'expense'::text,
  'asset'::text, 'proforma_invoice'::text, 'inventory'::text, 'transfer'::text,
  'deposit'::text, 'company'::text, 'supplier'::text, 'stock'::text,
  'purchase_order'::text, 'employee'::text, 'user'::text, 'document'::text,
  'clone_drive'::text, 'report'::text, 'report_evaluation'::text,
  'report_service'::text, 'report_server'::text, 'report_malware'::text,
  'report_forensic'::text, 'report_data_destruction'::text, 'report_prevention'::text,
  'payment'::text, 'stock_sale'::text, 'stock_adjustment'::text, 'loan'::text,
  'payroll_bank_file'::text, 'billing_invoice'::text, 'support_ticket'::text
]));

-- =====================================================
-- 2. PLATFORM ADMINS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id)
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view all platform admins"
  ON platform_admins FOR SELECT
  TO authenticated
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage platform admins"
  ON platform_admins FOR ALL
  TO authenticated
  USING (is_platform_admin());

CREATE INDEX IF NOT EXISTS idx_platform_admins_user_id ON platform_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_is_active ON platform_admins(is_active);

COMMENT ON TABLE platform_admins IS 'Super admin users who can manage all tenants and platform';

-- =====================================================
-- 3. TENANT HEALTH METRICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recorded_at timestamptz DEFAULT now(),
  health_score integer CHECK (health_score >= 0 AND health_score <= 100),
  churn_risk text CHECK (churn_risk IN ('low', 'medium', 'high', 'critical')),
  engagement_level text CHECK (engagement_level IN ('inactive', 'low', 'moderate', 'high', 'very_high')),
  days_since_last_login integer DEFAULT 0,
  active_users_count integer DEFAULT 0,
  cases_created_last_30d integer DEFAULT 0,
  revenue_last_30d numeric(15,2) DEFAULT 0,
  support_tickets_open integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tenant_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view all health metrics"
  ON tenant_health_metrics FOR SELECT
  TO authenticated
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage health metrics"
  ON tenant_health_metrics FOR ALL
  TO authenticated
  USING (is_platform_admin());

CREATE INDEX IF NOT EXISTS idx_tenant_health_tenant_id ON tenant_health_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_health_recorded_at ON tenant_health_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_health_churn_risk ON tenant_health_metrics(churn_risk);
CREATE INDEX IF NOT EXISTS idx_tenant_health_score ON tenant_health_metrics(health_score);

COMMENT ON TABLE tenant_health_metrics IS 'Daily tenant health snapshots for churn prediction';

-- =====================================================
-- 4. TENANT ACTIVITY LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  activity_details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tenant_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view all activity logs"
  ON tenant_activity_log FOR SELECT
  TO authenticated
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert activity logs"
  ON tenant_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin());

CREATE INDEX IF NOT EXISTS idx_tenant_activity_tenant_id ON tenant_activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_activity_created_at ON tenant_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_activity_type ON tenant_activity_log(activity_type);

COMMENT ON TABLE tenant_activity_log IS 'Audit log of significant tenant activities';

-- =====================================================
-- 5. SUPPORT TICKETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  category text DEFAULT 'general' CHECK (category IN ('technical', 'billing', 'feature_request', 'bug_report', 'general')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  assigned_to uuid REFERENCES platform_admins(id) ON DELETE SET NULL,
  resolution_notes text,
  satisfaction_rating integer CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  deleted_at timestamptz
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view all tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (is_platform_admin() AND deleted_at IS NULL);

CREATE POLICY "Platform admins can manage all tickets"
  ON support_tickets FOR ALL
  TO authenticated
  USING (is_platform_admin());

CREATE POLICY "Tenants can view their own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    (customer_id = auth.uid() OR 
     tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Tenants can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

COMMENT ON TABLE support_tickets IS 'Help desk support tickets for tenant assistance';

-- =====================================================
-- 6. SUPPORT TICKET MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'support')),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_internal_note boolean DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view all messages"
  ON support_ticket_messages FOR SELECT
  TO authenticated
  USING (is_platform_admin());

CREATE POLICY "Platform admins can create messages"
  ON support_ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin());

CREATE POLICY "Tenants can view their ticket messages"
  ON support_ticket_messages FOR SELECT
  TO authenticated
  USING (
    NOT is_internal_note AND
    ticket_id IN (
      SELECT id FROM support_tickets 
      WHERE customer_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Tenants can create messages on their tickets"
  ON support_ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_type = 'customer' AND
    NOT is_internal_note AND
    ticket_id IN (
      SELECT id FROM support_tickets 
      WHERE customer_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON support_ticket_messages(created_at);

COMMENT ON TABLE support_ticket_messages IS 'Threaded conversation messages for support tickets';

-- =====================================================
-- 7. PLATFORM ANNOUNCEMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_ar text,
  content_en text NOT NULL,
  content_ar text,
  announcement_type text DEFAULT 'info' CHECK (announcement_type IN ('info', 'warning', 'maintenance', 'feature', 'promotion')),
  target_audience text DEFAULT 'all' CHECK (target_audience IN ('all', 'trial', 'starter', 'professional', 'enterprise')),
  show_as_banner boolean DEFAULT true,
  is_dismissible boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES platform_admins(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage announcements"
  ON platform_announcements FOR ALL
  TO authenticated
  USING (is_platform_admin());

CREATE POLICY "All users can view active announcements"
  ON platform_announcements FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    deleted_at IS NULL AND
    start_date <= now() AND
    (end_date IS NULL OR end_date >= now())
  );

CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON platform_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_start_date ON platform_announcements(start_date);
CREATE INDEX IF NOT EXISTS idx_announcements_target_audience ON platform_announcements(target_audience);

COMMENT ON TABLE platform_announcements IS 'Platform-wide announcements and notifications';

-- =====================================================
-- 8. ANNOUNCEMENT DISMISSALS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS announcement_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES platform_announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE announcement_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dismissals"
  ON announcement_dismissals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create dismissals"
  ON announcement_dismissals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Platform admins can view all dismissals"
  ON announcement_dismissals FOR SELECT
  TO authenticated
  USING (is_platform_admin());

CREATE INDEX IF NOT EXISTS idx_dismissals_announcement_id ON announcement_dismissals(announcement_id);
CREATE INDEX IF NOT EXISTS idx_dismissals_user_id ON announcement_dismissals(user_id);

COMMENT ON TABLE announcement_dismissals IS 'Tracks which users dismissed which announcements';

-- =====================================================
-- 9. PLATFORM METRICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,
  total_tenants integer DEFAULT 0,
  active_tenants integer DEFAULT 0,
  trial_tenants integer DEFAULT 0,
  paying_tenants integer DEFAULT 0,
  total_users integer DEFAULT 0,
  active_users integer DEFAULT 0,
  mrr numeric(15,2) DEFAULT 0,
  arr numeric(15,2) DEFAULT 0,
  new_tenants integer DEFAULT 0,
  churned_tenants integer DEFAULT 0,
  open_tickets integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view all metrics"
  ON platform_metrics FOR SELECT
  TO authenticated
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage metrics"
  ON platform_metrics FOR ALL
  TO authenticated
  USING (is_platform_admin());

CREATE INDEX IF NOT EXISTS idx_platform_metrics_date ON platform_metrics(metric_date DESC);

COMMENT ON TABLE platform_metrics IS 'Daily aggregated platform-wide statistics';

-- =====================================================
-- 10. NUMBER SEQUENCES FOR SUPPORT TICKETS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM number_sequences WHERE scope = 'support_ticket'
  ) THEN
    INSERT INTO number_sequences (scope, prefix, padding, last_number, annual_reset)
    VALUES ('support_ticket', 'TKT', 5, 0, false);
  END IF;
END $$;

-- =====================================================
-- 11. HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_ticket_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num integer;
  ticket_num text;
BEGIN
  UPDATE number_sequences 
  SET last_number = last_number + 1,
      updated_at = now()
  WHERE scope = 'support_ticket'
  RETURNING last_number INTO next_num;
  
  ticket_num := 'TKT-' || LPAD(next_num::text, 5, '0');
  RETURN ticket_num;
END;
$$;

COMMENT ON FUNCTION get_next_ticket_number() IS 'Generates next support ticket number';
