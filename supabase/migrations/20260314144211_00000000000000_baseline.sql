/*
  # xSuite — Complete Baseline Migration

  Rebuilt from the live Supabase database via MCP introspection on 2026-03-14.
  This is the single source-of-truth baseline for the xSuite Data Recovery ERP + CRM platform.

  ## What This File Contains
  1. Required PostgreSQL extensions
  2. Custom enum types (custody_action_category, custody_status, custody_transfer_status, integrity_check_result)
  3. Sequences for bigint/serial tables
  4. All 185 public tables with full column definitions, in dependency order
  5. All foreign key constraints (inline)
  6. Row Level Security enablement for every table
  7. Trigger documentation (functions already exist in live DB)

  ## Tables (185 total, grouped by domain)
  - Geography/Master Data: countries, cities, industries, currency_codes
  - Device Master Data: brands, capacities, device_types, device_encryption, device_form_factors,
    device_interfaces, device_made_in, device_head_no, device_platter_no, device_roles,
    device_conditions, device_component_statuses, interfaces, accessories, donor_compatibility_matrix
  - Service Master Data: service_types, service_locations, service_problems,
    service_catalog_categories, service_line_items_catalog
  - Settings/Config: settings, company_settings, seed_status, accounting_locales,
    tax_rates, number_sequences, number_sequences_audit
  - Templates: template_categories, template_types, template_variables, document_templates,
    template_versions, templates
  - Auth/Profiles: profiles, user_activity_sessions, user_activity_logs, user_sessions,
    user_preferences, user_sidebar_preferences
  - System/Audit: system_logs, audit_trails, database_backups, pdf_generation_logs
  - Modules/Permissions: modules, role_module_permissions
  - Customers/CRM: customer_groups, customers_enhanced, portal_link_history, ndas,
    companies, company_documents, customer_company_relationships, customer_communications
  - Cases: case_priorities, case_statuses, cases, case_devices, case_attachments,
    case_communications, case_diagnostics, case_engineers, case_follow_ups,
    case_internal_notes, case_job_history, case_milestones, case_portal_visibility,
    case_qa_checklists, case_recovery_attempts
  - Reports: case_report_templates, case_reports, case_report_sections,
    report_section_library, report_section_presets, report_template_section_mappings
  - Case Financials: case_quotes, case_quote_items
  - Chain of Custody: chain_of_custody, chain_of_custody_access_log,
    chain_of_custody_integrity_checks, chain_of_custody_transfers
  - Device Diagnostics: device_diagnostics
  - Clone Drives: inventory_locations, resource_clone_drives, clone_drives
  - Inventory: inventory_categories, inventory_condition_types, inventory_item_categories,
    inventory_status_types, inventory_items, inventory_assignments, inventory_case_assignments,
    inventory_photos, inventory_reservations, inventory_search_templates,
    inventory_status_history, inventory_transactions, inventory_parts_usage
  - Banking: payment_methods, bank_accounts, bank_transactions, account_balance_snapshots,
    account_transfers, bank_reconciliation_sessions
  - Financial: expense_categories, expenses, expense_attachments, transaction_categories,
    quotes, quote_statuses, quote_items, quote_history, invoice_statuses, invoices,
    invoice_line_items, payments, payment_allocations, payment_receipts, receipt_allocations,
    payment_disbursements, reconciliation_matches, receipts, financial_transactions,
    financial_audit_logs, vat_records, vat_returns, vat_transactions
  - Suppliers: supplier_categories, supplier_payment_terms, suppliers, supplier_contacts,
    supplier_communications, supplier_documents, supplier_audit_trail,
    supplier_performance_metrics, supplier_products, purchase_order_statuses,
    purchase_orders, purchase_order_items
  - HR/Employees: departments, positions, employees, attendance_records, leave_types,
    leave_balances, leave_requests, timesheets, employee_documents, salary_components,
    employee_salary_config, employee_salary_components, payroll_components, payroll_records,
    payroll_record_items, performance_reviews, onboarding_checklists,
    onboarding_checklist_items, onboarding_tasks, recruitment_jobs, recruitment_candidates
  - Assets: asset_categories, assets, asset_assignments, asset_depreciation, asset_maintenance
  - Stock: stock_categories, stock_locations, stock_items, stock_movements, stock_adjustments
  - Knowledge Base: kb_categories, kb_articles, kb_tags, kb_article_tags, kb_article_versions
  - Import/Export: import_export_templates, import_export_jobs, import_export_logs, import_field_mappings
  - Branches: branches

  ## Security
  - RLS enabled on all 185 tables
  - Actual policies exist in live DB (applied by previous migrations)

  ## Important
  - This migration is a documentation baseline — it is marked as applied
  - The live DB already has all objects; this file serves as the local reference
  - NEVER modify the live DB directly in dashboard — use migrations only
*/

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- CUSTOM ENUM TYPES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE custody_action_category AS ENUM (
    'creation','modification','access','transfer',
    'verification','communication','evidence_handling','financial','critical_event'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE custody_status AS ENUM (
    'in_custody','in_transit','checked_out','archived','disposed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE custody_transfer_status AS ENUM (
    'initiated','pending_acceptance','accepted','rejected','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE integrity_check_result AS ENUM (
    'passed','failed','warning','not_applicable'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SEQUENCES
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS device_component_statuses_id_seq;
CREATE SEQUENCE IF NOT EXISTS device_conditions_id_seq;
CREATE SEQUENCE IF NOT EXISTS device_roles_id_seq;
CREATE SEQUENCE IF NOT EXISTS inventory_condition_types_id_seq;
CREATE SEQUENCE IF NOT EXISTS inventory_item_categories_id_seq;
CREATE SEQUENCE IF NOT EXISTS inventory_status_types_id_seq;
CREATE SEQUENCE IF NOT EXISTS purchase_order_statuses_id_seq;
CREATE SEQUENCE IF NOT EXISTS service_locations_id_seq;
CREATE SEQUENCE IF NOT EXISTS service_problems_id_seq;
CREATE SEQUENCE IF NOT EXISTS supplier_categories_id_seq;
CREATE SEQUENCE IF NOT EXISTS supplier_payment_terms_id_seq;

-- ============================================================
-- TABLES (dependency order)
-- ============================================================

-- ---- Geography ----
CREATE TABLE IF NOT EXISTS countries (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  code text UNIQUE,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cities (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  country_id uuid REFERENCES countries(id),
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS industries (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS currency_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  symbol text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---- Device Master Data ----
CREATE TABLE IF NOT EXISTS brands (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS capacities (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  gb_value numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_encryption (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_form_factors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_interfaces (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_made_in (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_head_no (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_platter_no (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_roles (
  id bigint NOT NULL DEFAULT nextval('device_roles_id_seq') PRIMARY KEY,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_conditions (
  id bigint NOT NULL DEFAULT nextval('device_conditions_id_seq') PRIMARY KEY,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_component_statuses (
  id bigint NOT NULL DEFAULT nextval('device_component_statuses_id_seq') PRIMARY KEY,
  status_name text NOT NULL,
  status_code text NOT NULL,
  color_indicator text NOT NULL,
  icon_type text,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interfaces (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accessories (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donor_compatibility_matrix (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  source_model text NOT NULL,
  source_pcb text,
  compatible_models text[] NOT NULL,
  compatible_pcbs text[],
  compatibility_level text NOT NULL,
  notes text,
  verified_by uuid,
  verification_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- ---- Service Master Data ----
CREATE TABLE IF NOT EXISTS service_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  estimated_days integer DEFAULT 7,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_locations (
  id bigint NOT NULL DEFAULT nextval('service_locations_id_seq') PRIMARY KEY,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_problems (
  id bigint NOT NULL DEFAULT nextval('service_problems_id_seq') PRIMARY KEY,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_catalog_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_line_items_catalog (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name text NOT NULL,
  description text,
  category_id uuid REFERENCES service_catalog_categories(id),
  unit_of_measure text DEFAULT 'service',
  default_price numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---- Settings & Config ----
CREATE TABLE IF NOT EXISTS settings (
  id integer NOT NULL DEFAULT 1 PRIMARY KEY,
  company_profile jsonb DEFAULT '{}'::jsonb,
  localization jsonb DEFAULT '{}'::jsonb,
  portal jsonb DEFAULT '{}'::jsonb,
  limits jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_settings (
  id integer NOT NULL DEFAULT 1 PRIMARY KEY,
  basic_info jsonb DEFAULT '{}'::jsonb,
  location jsonb DEFAULT '{}'::jsonb,
  contact_info jsonb DEFAULT '{}'::jsonb,
  branding jsonb DEFAULT '{}'::jsonb,
  online_presence jsonb DEFAULT '{}'::jsonb,
  business_hours jsonb DEFAULT '{}'::jsonb,
  company_profile jsonb DEFAULT '{}'::jsonb,
  legal_compliance jsonb DEFAULT '{}'::jsonb,
  financial_settings jsonb DEFAULT '{}'::jsonb,
  banking_info jsonb DEFAULT '{}'::jsonb,
  portal_settings jsonb DEFAULT '{}'::jsonb,
  clone_defaults jsonb DEFAULT '{}'::jsonb,
  localization jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  session_timeout_minutes integer NOT NULL DEFAULT 15,
  portal_enabled boolean NOT NULL DEFAULT true,
  portal_maintenance_mode boolean NOT NULL DEFAULT false,
  portal_maintenance_message text DEFAULT 'The portal is currently undergoing maintenance.',
  portal_support_email text DEFAULT '',
  portal_support_phone text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS seed_status (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  category text NOT NULL,
  is_seeded boolean DEFAULT false,
  seeded_at timestamptz,
  seeded_by uuid,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounting_locales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_name text NOT NULL,
  country_code text NOT NULL,
  currency_code text NOT NULL,
  currency_symbol text NOT NULL,
  currency_name text NOT NULL,
  currency_position text NOT NULL DEFAULT 'after',
  decimal_places integer NOT NULL DEFAULT 2,
  tax_name text NOT NULL,
  tax_rate numeric NOT NULL,
  tax_number_label text,
  exchange_rate_to_usd numeric NOT NULL DEFAULT 1.0,
  date_format text NOT NULL DEFAULT 'dd/MM/yyyy',
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  rate numeric NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS number_sequences (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  scope text NOT NULL,
  prefix text DEFAULT '',
  padding integer DEFAULT 4,
  last_number integer DEFAULT 0,
  annual_reset boolean DEFAULT false,
  current_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  current_value integer DEFAULT 0,
  last_reset_date date
);

CREATE TABLE IF NOT EXISTS number_sequences_audit (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  sequence_id uuid NOT NULL REFERENCES number_sequences(id),
  scope text NOT NULL,
  action text NOT NULL,
  old_prefix text,
  new_prefix text,
  old_padding integer,
  new_padding integer,
  old_last_number integer,
  new_last_number integer,
  old_annual_reset boolean,
  new_annual_reset boolean,
  changed_by uuid,
  change_reason text,
  changed_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  user_email text,
  user_role text
);

-- ---- Template System ----
CREATE TABLE IF NOT EXISTS template_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'FileText',
  color text DEFAULT '#6366f1',
  parent_category_id uuid REFERENCES template_categories(id),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS template_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL,
  category_id uuid REFERENCES template_categories(id),
  description text,
  supports_variables boolean DEFAULT true,
  supports_line_items boolean DEFAULT false,
  default_format text DEFAULT 'rich_text',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS template_variables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type_id uuid REFERENCES template_types(id),
  variable_name text NOT NULL,
  variable_key text NOT NULL,
  data_type text DEFAULT 'text',
  description text,
  sample_value text,
  format_pattern text,
  is_required boolean DEFAULT false,
  category text DEFAULT 'general',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type_id uuid NOT NULL REFERENCES template_types(id),
  name text NOT NULL,
  description text,
  content text,
  content_json jsonb DEFAULT '{}',
  subject_line text,
  layout text DEFAULT 'standard',
  page_size text DEFAULT 'A4',
  orientation text DEFAULT 'portrait',
  margin_top integer DEFAULT 20,
  margin_bottom integer DEFAULT 20,
  margin_left integer DEFAULT 20,
  margin_right integer DEFAULT 20,
  header_content text,
  footer_content text,
  show_header boolean DEFAULT true,
  show_footer boolean DEFAULT true,
  show_page_numbers boolean DEFAULT true,
  locale text DEFAULT 'en',
  version integer DEFAULT 1,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  requires_approval boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  default_price numeric DEFAULT 0,
  unit_of_measure text DEFAULT 'service',
  item_category text,
  created_by uuid,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS template_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES document_templates(id),
  version_number integer NOT NULL,
  content text,
  content_json jsonb DEFAULT '{}',
  change_description text,
  changed_by uuid,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  type text NOT NULL,
  key text NOT NULL,
  title text NOT NULL,
  content_rich jsonb DEFAULT '{"blocks":[]}',
  locale text DEFAULT 'en',
  variables text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- ---- Profiles ----
CREATE TABLE IF NOT EXISTS profiles (
  id uuid NOT NULL PRIMARY KEY,
  full_name text NOT NULL,
  role text,
  phone text,
  language text DEFAULT 'en',
  avatar_url text,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  password_reset_required boolean DEFAULT false,
  case_access_level text DEFAULT 'assigned',
  sidebar_preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  email text NOT NULL
);

CREATE TABLE IF NOT EXISTS user_activity_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL,
  login_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  logout_at timestamptz,
  ip_address text,
  user_agent text,
  device_info jsonb DEFAULT '{}',
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  action_type text NOT NULL,
  action_details jsonb DEFAULT '{}',
  entity_type text,
  entity_id text,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  session_token text,
  ip_address text,
  user_agent text,
  device_type text,
  location text,
  is_active boolean DEFAULT true,
  last_activity timestamptz DEFAULT now(),
  login_at timestamptz DEFAULT now(),
  logout_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  theme text DEFAULT 'light',
  language text DEFAULT 'en',
  notifications_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  timezone text DEFAULT 'UTC',
  date_format text DEFAULT 'MM/DD/YYYY',
  preferences_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_sidebar_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  collapsed_sections jsonb DEFAULT '[]',
  sidebar_width integer DEFAULT 280,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---- System / Audit ----
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  level text NOT NULL,
  module text NOT NULL,
  action text NOT NULL,
  message text NOT NULL,
  user_id uuid,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_trails (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb DEFAULT '{}',
  new_values jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS database_backups (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  backup_type text NOT NULL,
  file_path text,
  file_size_bytes bigint DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS pdf_generation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type text NOT NULL,
  document_id uuid,
  case_id uuid,
  file_name text,
  file_size integer,
  generation_status text NOT NULL,
  error_message text,
  generation_time_ms integer,
  metadata jsonb DEFAULT '{}',
  generated_by uuid,
  created_at timestamptz DEFAULT now()
);

-- ---- Modules & Permissions ----
CREATE TABLE IF NOT EXISTS modules (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  icon text,
  route text,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_module_permissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  role text NOT NULL,
  module_id uuid NOT NULL REFERENCES modules(id),
  can_access boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- ---- Customers / CRM ----
CREATE TABLE IF NOT EXISTS customer_groups (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  discount_percent numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers_enhanced (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_number text NOT NULL,
  customer_name text NOT NULL,
  email text,
  mobile_number text,
  phone_number text,
  customer_group_id uuid REFERENCES customer_groups(id),
  country text,
  city text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  profile_photo_url text,
  portal_enabled boolean DEFAULT false,
  portal_token uuid DEFAULT gen_random_uuid(),
  portal_token_generated_at timestamptz DEFAULT now(),
  portal_password_hash text,
  portal_last_login timestamptz,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  portal_session_started_at timestamptz,
  portal_failed_login_attempts integer DEFAULT 0,
  portal_locked_until timestamptz
);

CREATE TABLE IF NOT EXISTS portal_link_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customers_enhanced(id),
  portal_token uuid NOT NULL,
  generated_at timestamptz DEFAULT now(),
  disabled_at timestamptz,
  is_active boolean DEFAULT true,
  disabled_by uuid REFERENCES profiles(id),
  last_used_at timestamptz,
  notes text
);

CREATE TABLE IF NOT EXISTS ndas (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  file_url text,
  signed_date date,
  expiry_date date,
  notes text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_number text NOT NULL,
  company_name text NOT NULL,
  vat_number text,
  industry_id uuid REFERENCES industries(id),
  email text,
  phone_number text,
  website text,
  country text,
  city text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  primary_contact_id uuid REFERENCES customers_enhanced(id),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS company_documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_type text NOT NULL,
  document_name text NOT NULL,
  document_number text,
  description text,
  file_path text,
  file_name text,
  file_size_kb integer,
  mime_type text,
  issue_date date,
  expiry_date date,
  reminder_days_before integer DEFAULT 30,
  status text DEFAULT 'active',
  issuing_authority text,
  issuing_country text,
  version integer DEFAULT 1,
  previous_version_id uuid REFERENCES company_documents(id),
  uploaded_by uuid,
  verified_by uuid,
  verified_at timestamptz,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_company_relationships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customers_enhanced(id),
  company_id uuid NOT NULL REFERENCES companies(id),
  is_primary_contact boolean DEFAULT false,
  job_title text,
  department text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_communications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES customers_enhanced(id),
  company_id uuid REFERENCES companies(id),
  communication_type text NOT NULL,
  subject text,
  content text,
  direction text,
  portal_visible boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  customer_read_at timestamptz
);

-- ---- Cases ----
CREATE TABLE IF NOT EXISTS case_priorities (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  color text DEFAULT '#64748b',
  level integer DEFAULT 1,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS case_statuses (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  color text DEFAULT '#64748b',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_no text NOT NULL,
  customer_id uuid REFERENCES customers_enhanced(id),
  company_id uuid REFERENCES companies(id),
  contact_id uuid REFERENCES customers_enhanced(id),
  title text NOT NULL,
  summary text,
  service_type_id uuid REFERENCES service_types(id),
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'received',
  assigned_engineer_id uuid REFERENCES profiles(id),
  client_reference text,
  primary_device_sn text,
  due_date timestamptz,
  important_data text,
  accessories text,
  checkout_date timestamptz,
  checkout_collector_name text,
  checkout_collector_mobile text,
  checkout_collector_id text,
  recovery_outcome text,
  portal_visible boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sla_target_date timestamptz,
  sla_status text DEFAULT 'on_track',
  outcome_status text,
  recovery_percentage numeric,
  files_recovered_count integer,
  data_recovered_size_gb numeric,
  root_cause text,
  failure_reason text,
  outcome_notes text,
  outcome_recorded_by uuid,
  outcome_recorded_at timestamptz,
  diagnosed_at timestamptz,
  recovery_started_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS case_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  device_type_id uuid REFERENCES device_types(id),
  brand_id uuid REFERENCES brands(id),
  capacity_id uuid REFERENCES capacities(id),
  media_type text,
  brand text,
  model text,
  serial_no text,
  capacity_gb numeric DEFAULT 0,
  condition_text text,
  device_problem text,
  recovery_requirements text,
  device_password text,
  accessories text[],
  is_server_device boolean DEFAULT false,
  slot_no integer,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  condition_id integer REFERENCES device_conditions(id),
  encryption_type_id uuid REFERENCES device_encryption(id),
  device_role_id integer REFERENCES device_roles(id),
  is_primary boolean DEFAULT false,
  parent_device_id uuid REFERENCES case_devices(id),
  role_notes text,
  form_factor_id uuid REFERENCES device_form_factors(id),
  interface_id uuid REFERENCES device_interfaces(id),
  made_in_id uuid REFERENCES device_made_in(id),
  dom text,
  part_number text,
  dcm text,
  firmware text,
  platter_count_id uuid REFERENCES device_platter_no(id),
  head_count_id uuid REFERENCES device_head_no(id),
  controller text,
  pre_amp text,
  physical_head_map text,
  checked_out_at timestamptz,
  checkout_collector_name text,
  swap_source_device_id uuid REFERENCES case_devices(id),
  swap_notes text
);

CREATE TABLE IF NOT EXISTS case_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  category text DEFAULT 'other',
  description text,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_communications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  communication_type text NOT NULL DEFAULT 'other',
  subject text,
  content text,
  direction text DEFAULT 'outbound',
  sent_by uuid REFERENCES profiles(id),
  sent_to text,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS case_diagnostics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL,
  device_id uuid,
  physical_condition text,
  media_type text,
  failure_type text,
  failure_symptoms text[] DEFAULT '{}',
  difficulty_rating integer,
  diagnostic_notes text,
  power_test_passed boolean,
  spin_test_passed boolean,
  detection_test_passed boolean,
  smart_data_available boolean DEFAULT false,
  smart_data jsonb,
  diagnostic_photos text[] DEFAULT '{}',
  diagnosed_by uuid,
  diagnosed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_engineers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  engineer_id uuid NOT NULL REFERENCES profiles(id),
  role_text text DEFAULT 'Team Member',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_follow_ups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  follow_up_type text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  assigned_to uuid REFERENCES profiles(id),
  notes text,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES profiles(id),
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_internal_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id),
  note_text text NOT NULL,
  private boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_job_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  details_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL,
  milestone_type text NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  achieved_by uuid,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_portal_visibility (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  show_device_details boolean DEFAULT true,
  show_technical_details boolean DEFAULT false,
  show_device_password boolean DEFAULT false,
  show_important_data boolean DEFAULT true,
  show_accessories boolean DEFAULT true,
  show_status_updates boolean DEFAULT true,
  show_quotes boolean DEFAULT true,
  show_invoices boolean DEFAULT true,
  show_reports boolean DEFAULT false,
  show_attachments boolean DEFAULT false,
  auto_notify_status_change boolean DEFAULT true,
  auto_notify_quote_ready boolean DEFAULT true,
  auto_notify_device_ready boolean DEFAULT true,
  custom_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_qa_checklists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  data_integrity_verified boolean DEFAULT false,
  file_count_verified boolean DEFAULT false,
  customer_notified boolean DEFAULT false,
  backup_labeled boolean DEFAULT false,
  invoice_created boolean DEFAULT false,
  customer_approval_obtained boolean DEFAULT false,
  additional_checks jsonb DEFAULT '{}',
  notes text,
  completed_by uuid REFERENCES profiles(id),
  completed_at timestamptz,
  is_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_recovery_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  device_id uuid REFERENCES case_devices(id),
  technique text NOT NULL,
  outcome text NOT NULL DEFAULT 'in_progress',
  data_recovered_percent integer DEFAULT 0,
  notes text,
  attempted_by uuid REFERENCES profiles(id),
  attempted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ---- Report Templates & Sections ----
CREATE TABLE IF NOT EXISTS case_report_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name text NOT NULL,
  report_type text NOT NULL,
  description text,
  template_structure jsonb NOT NULL,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  layout_config jsonb DEFAULT '{}',
  header_config jsonb DEFAULT '{}',
  footer_config jsonb DEFAULT '{}',
  supports_bilingual boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  last_used_at timestamptz
);

CREATE TABLE IF NOT EXISTS case_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  report_number text NOT NULL,
  report_type text NOT NULL DEFAULT 'diagnostic',
  title text NOT NULL,
  content text,
  status text NOT NULL DEFAULT 'draft',
  findings text,
  recommendations text,
  visible_to_customer boolean DEFAULT false,
  pdf_file_path text,
  created_by uuid REFERENCES profiles(id),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  sent_to_customer_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  version_number integer DEFAULT 1,
  is_latest_version boolean DEFAULT true,
  parent_report_id uuid REFERENCES case_reports(id),
  report_template_id uuid REFERENCES case_report_templates(id),
  chain_of_custody_id uuid,
  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS case_report_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL,
  section_key text NOT NULL,
  section_title text NOT NULL,
  section_content text,
  section_order integer DEFAULT 0,
  is_required boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_section_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key text NOT NULL,
  section_name text NOT NULL,
  section_name_ar text,
  section_description text,
  section_description_ar text,
  category text NOT NULL,
  icon text DEFAULT 'file-text',
  color text DEFAULT '#3b82f6',
  default_content_template text,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_hidden_in_editor boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS report_section_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id uuid NOT NULL REFERENCES report_section_library(id),
  preset_name text NOT NULL,
  preset_content text NOT NULL,
  device_type_filter text[],
  service_type_filter text[],
  usage_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_template_section_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES case_report_templates(id),
  section_id uuid NOT NULL REFERENCES report_section_library(id),
  section_order integer NOT NULL,
  is_required boolean DEFAULT false,
  is_collapsible boolean DEFAULT false,
  page_break_before boolean DEFAULT false,
  custom_label text,
  custom_label_ar text,
  section_config jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---- Case Quotes ----
CREATE TABLE IF NOT EXISTS case_quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  quote_number text NOT NULL,
  quote_type text NOT NULL DEFAULT 'quote',
  status text NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  description text,
  subtotal numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  discount_type text DEFAULT 'fixed',
  total_amount numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  valid_until date,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  rejected_reason text,
  payment_status text DEFAULT 'unpaid',
  payment_amount numeric DEFAULT 0,
  payment_date timestamptz,
  pdf_file_path text,
  notes text,
  terms text,
  bank_account_id uuid,
  client_reference text,
  portal_visible boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  version integer DEFAULT 1
);

CREATE TABLE IF NOT EXISTS case_quote_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES case_quotes(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'service',
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  line_total numeric DEFAULT 0,
  is_taxable boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ---- Chain of Custody ----
CREATE TABLE IF NOT EXISTS chain_of_custody (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  entry_number integer NOT NULL,
  action_category text NOT NULL,
  action_type text NOT NULL,
  action_description text NOT NULL,
  actor_id uuid REFERENCES profiles(id),
  actor_name text NOT NULL,
  actor_role text,
  actor_ip_address inet,
  actor_user_agent text,
  device_id uuid REFERENCES case_devices(id),
  evidence_reference text,
  evidence_description text,
  location_facility text,
  location_details text,
  location_coordinates jsonb,
  hash_algorithm text,
  hash_value text,
  previous_hash text,
  digital_signature text,
  signature_algorithm text DEFAULT 'RSA-SHA256',
  before_values jsonb DEFAULT '{}',
  after_values jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  witness_id uuid REFERENCES profiles(id),
  witness_name text,
  supervisor_id uuid REFERENCES profiles(id),
  supervisor_approved_at timestamptz,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chain_of_custody_access_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id),
  custody_entry_id uuid REFERENCES chain_of_custody(id),
  device_id uuid REFERENCES case_devices(id),
  access_type text NOT NULL,
  access_purpose text NOT NULL,
  access_method text,
  tools_used text[],
  accessor_id uuid REFERENCES profiles(id),
  accessor_name text NOT NULL,
  supervisor_id uuid REFERENCES profiles(id),
  supervisor_approved boolean DEFAULT false,
  access_started_at timestamptz DEFAULT now(),
  access_ended_at timestamptz,
  access_location text,
  ip_address inet,
  device_fingerprint text,
  notes text,
  findings text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chain_of_custody_integrity_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id),
  device_id uuid REFERENCES case_devices(id),
  custody_entry_id uuid REFERENCES chain_of_custody(id),
  check_type text NOT NULL,
  check_reason text,
  scheduled_check boolean DEFAULT false,
  expected_hash text,
  actual_hash text,
  hash_algorithm text,
  hash_match boolean,
  physical_inspection_performed boolean DEFAULT false,
  physical_condition text,
  seal_number text,
  seal_intact boolean,
  overall_result text NOT NULL,
  findings text,
  anomalies text[],
  photo_urls text[],
  document_urls text[],
  inspector_id uuid REFERENCES profiles(id),
  inspector_name text NOT NULL,
  witness_id uuid REFERENCES profiles(id),
  checked_at timestamptz DEFAULT now(),
  next_check_due timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chain_of_custody_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id),
  custody_entry_id uuid REFERENCES chain_of_custody(id),
  transfer_reason text NOT NULL,
  transfer_method text,
  transfer_location text,
  from_custodian_id uuid REFERENCES profiles(id),
  from_custodian_name text NOT NULL,
  to_custodian_id uuid REFERENCES profiles(id),
  to_custodian_name text NOT NULL,
  condition_before text,
  condition_after text,
  condition_verified boolean DEFAULT false,
  seal_number text,
  new_seal_number text,
  seal_intact boolean,
  transfer_status text DEFAULT 'initiated',
  initiated_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  from_signature text,
  to_signature text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---- Device Diagnostics (detailed) ----
CREATE TABLE IF NOT EXISTS device_diagnostics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_device_id uuid NOT NULL REFERENCES case_devices(id),
  device_type_category text,
  diagnostic_date timestamptz DEFAULT now(),
  diagnosed_by uuid REFERENCES profiles(id),
  heads_status text,
  head_map jsonb,
  pcb_status text,
  pcb_notes text,
  motor_status text,
  surface_status text,
  sa_access boolean,
  platter_condition text,
  controller_status text,
  controller_model text,
  memory_chips_status text,
  nand_type text,
  firmware_corruption boolean,
  trim_support boolean,
  wear_leveling_count integer,
  firmware_version text,
  rom_version text,
  smart_data jsonb,
  imaging_stats jsonb,
  physical_damage_notes text,
  recovery_complexity text,
  estimated_recovery_time_hours numeric,
  technical_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---- Clone Drives ----
CREATE TABLE IF NOT EXISTS inventory_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text,
  description text,
  address text,
  parent_id uuid REFERENCES inventory_locations(id),
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resource_clone_drives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drive_code text NOT NULL,
  physical_drive_brand text,
  physical_drive_model text,
  physical_drive_serial text,
  physical_drive_capacity_gb numeric,
  storage_type text DEFAULT 'hdd',
  storage_location_id uuid REFERENCES inventory_locations(id),
  shelf_number text,
  status text DEFAULT 'available',
  current_case_id uuid REFERENCES cases(id),
  capacity_total_gb numeric,
  capacity_used_gb numeric DEFAULT 0,
  capacity_available_gb numeric,
  last_used_date timestamptz,
  last_wiped_date timestamptz,
  wipe_count integer DEFAULT 0,
  health_status text DEFAULT 'good',
  smart_data jsonb,
  notes text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  clone_id text
);

CREATE TABLE IF NOT EXISTS clone_drives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  patient_device_id uuid NOT NULL REFERENCES case_devices(id),
  physical_drive_serial text,
  physical_drive_brand text,
  physical_drive_model text,
  physical_drive_capacity text,
  storage_path text NOT NULL,
  storage_server text,
  storage_type text DEFAULT 'nas',
  physical_location_id uuid REFERENCES inventory_locations(id),
  image_format text DEFAULT 'dd',
  image_size_gb numeric DEFAULT 0,
  clone_date timestamptz DEFAULT now(),
  cloned_by uuid REFERENCES profiles(id),
  status text DEFAULT 'active',
  extracted_date timestamptz,
  extracted_by uuid REFERENCES profiles(id),
  backup_device_id uuid REFERENCES case_devices(id),
  extraction_notes text,
  retention_days integer DEFAULT 180,
  estimated_deletion_date timestamptz,
  retention_notes text,
  checksum text,
  compression_used boolean DEFAULT false,
  encryption_used boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resource_clone_drive_id uuid REFERENCES resource_clone_drives(id)
);

-- ---- Inventory ----
CREATE TABLE IF NOT EXISTS inventory_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  parent_category_id uuid REFERENCES inventory_categories(id),
  icon_name text,
  color_code text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_condition_types (
  id bigint NOT NULL DEFAULT nextval('inventory_condition_types_id_seq') PRIMARY KEY,
  rating integer NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  color_code text DEFAULT '#6B7280'
);

CREATE TABLE IF NOT EXISTS inventory_item_categories (
  id bigint NOT NULL DEFAULT nextval('inventory_item_categories_id_seq') PRIMARY KEY,
  name text NOT NULL,
  description text,
  parent_id bigint REFERENCES inventory_item_categories(id),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  color_code text DEFAULT '#6B7280'
);

CREATE TABLE IF NOT EXISTS inventory_status_types (
  id bigint NOT NULL DEFAULT nextval('inventory_status_types_id_seq') PRIMARY KEY,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6B7280',
  affects_stock boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  color_code text DEFAULT '#6B7280',
  is_available_status boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_code text,
  barcode text,
  item_type text DEFAULT 'donor_part',
  item_category text,
  category_id bigint REFERENCES inventory_item_categories(id),
  device_type_id uuid REFERENCES device_types(id),
  brand_id uuid REFERENCES brands(id),
  capacity_id uuid REFERENCES capacities(id),
  model text,
  serial_number text,
  sku_code text,
  name text NOT NULL,
  description text,
  status text DEFAULT 'available',
  status_type_id bigint REFERENCES inventory_status_types(id),
  condition_rating integer DEFAULT 5,
  condition_type_id bigint REFERENCES inventory_condition_types(id),
  condition_notes text,
  firmware_version text,
  pcb_number text,
  manufacture_date text,
  vendor text,
  supplier_name text,
  supplier_contact text,
  purchase_date date,
  purchase_order_number text,
  unit_cost numeric DEFAULT 0,
  acquisition_cost numeric DEFAULT 0,
  acquisition_date date,
  current_value numeric DEFAULT 0,
  depreciation_rate numeric DEFAULT 0,
  quantity_purchased integer DEFAULT 1,
  quantity_available integer DEFAULT 0,
  quantity_in_use integer DEFAULT 0,
  quantity_depleted integer DEFAULT 0,
  quantity_defective integer DEFAULT 0,
  minimum_stock_level integer DEFAULT 0,
  maximum_stock_level integer DEFAULT 0,
  reorder_threshold integer DEFAULT 5,
  storage_location_id uuid REFERENCES inventory_locations(id),
  storage_notes text,
  last_verified_date date,
  last_verified_by uuid REFERENCES profiles(id),
  manufacturer_part_number text,
  warranty_expiry date,
  tags text[],
  image_url text,
  notes text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  interface_id uuid REFERENCES interfaces(id),
  usable_donor_parts text,
  product_country_id uuid,
  dcm text,
  head_map text,
  preamp text,
  part_number text,
  platter_heads text
);

CREATE TABLE IF NOT EXISTS inventory_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  case_id uuid NOT NULL REFERENCES cases(id),
  patient_device_id uuid REFERENCES case_devices(id),
  assigned_date timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id),
  quantity_assigned integer DEFAULT 1,
  returned_date timestamptz,
  returned_by uuid REFERENCES profiles(id),
  quantity_returned integer DEFAULT 0,
  quantity_consumed integer DEFAULT 0,
  unit_cost_at_assignment numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  usage_outcome text DEFAULT 'successful',
  usage_notes text,
  status text DEFAULT 'assigned',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_case_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  case_id uuid NOT NULL REFERENCES cases(id),
  assigned_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  assigned_by uuid,
  unassigned_at timestamptz,
  unassigned_by uuid,
  is_active boolean DEFAULT true,
  usage_result text,
  usage_notes text,
  defect_reason text,
  parts_used jsonb DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  description text,
  is_primary boolean DEFAULT false,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  case_id uuid,
  reserved_quantity integer NOT NULL,
  reserved_by uuid NOT NULL,
  reservation_type text DEFAULT 'evaluation',
  reserved_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamptz,
  released_at timestamptz,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_search_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  search_criteria jsonb NOT NULL,
  is_public boolean DEFAULT false,
  created_by uuid NOT NULL,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  old_status_id bigint REFERENCES inventory_status_types(id),
  new_status_id bigint REFERENCES inventory_status_types(id),
  old_condition_id bigint REFERENCES inventory_condition_types(id),
  new_condition_id bigint REFERENCES inventory_condition_types(id),
  changed_by uuid REFERENCES profiles(id),
  change_reason text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  transaction_type text NOT NULL,
  quantity_change integer NOT NULL,
  quantity_before integer NOT NULL,
  quantity_after integer NOT NULL,
  reference_type text,
  reference_id uuid,
  performed_by uuid REFERENCES profiles(id),
  reason text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_parts_usage (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  case_id uuid,
  parts_used jsonb NOT NULL DEFAULT '{}',
  usage_date date DEFAULT CURRENT_DATE,
  technician_id uuid,
  success_status text,
  compatibility_rating integer,
  notes text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- ---- Banking ----
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name text NOT NULL,
  account_number text,
  account_type text NOT NULL DEFAULT 'bank',
  bank_name text,
  branch_code text,
  swift_code text,
  iban text,
  currency_id uuid REFERENCES currency_codes(id),
  current_balance numeric DEFAULT 0,
  opening_balance numeric DEFAULT 0,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  employee_id uuid REFERENCES profiles(id),
  mobile_number text,
  mobile_provider text,
  location text,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES bank_accounts(id),
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  transaction_type text NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric,
  reference text,
  description text,
  counterparty_name text,
  counterparty_account text,
  category text,
  is_reconciled boolean DEFAULT false,
  reconciled_at timestamptz,
  reconciled_by uuid REFERENCES profiles(id),
  source_type text,
  source_id uuid,
  imported_at timestamptz,
  imported_from text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_balance_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES bank_accounts(id),
  snapshot_date date NOT NULL,
  opening_balance numeric NOT NULL,
  total_receipts numeric DEFAULT 0,
  total_disbursements numeric DEFAULT 0,
  total_transfers_in numeric DEFAULT 0,
  total_transfers_out numeric DEFAULT 0,
  closing_balance numeric NOT NULL,
  transaction_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_number text NOT NULL,
  from_account_id uuid NOT NULL REFERENCES bank_accounts(id),
  to_account_id uuid NOT NULL REFERENCES bank_accounts(id),
  amount numeric NOT NULL,
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  description text,
  status text NOT NULL DEFAULT 'pending',
  approval_required boolean DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  approval_notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS bank_reconciliation_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_number text NOT NULL,
  account_id uuid NOT NULL REFERENCES bank_accounts(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  opening_balance numeric NOT NULL,
  closing_balance numeric NOT NULL,
  system_balance numeric,
  variance numeric,
  status text NOT NULL DEFAULT 'in_progress',
  matched_count integer DEFAULT 0,
  unmatched_count integer DEFAULT 0,
  notes text,
  completed_by uuid REFERENCES profiles(id),
  completed_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---- Financial ----
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_number text NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category_id uuid REFERENCES expense_categories(id),
  amount numeric NOT NULL,
  currency_code text DEFAULT 'USD',
  description text NOT NULL,
  vendor_name text,
  reference_number text,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending',
  approval_required boolean DEFAULT true,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  payment_method_id uuid REFERENCES payment_methods(id),
  bank_account_id uuid REFERENCES bank_accounts(id),
  case_id uuid REFERENCES cases(id),
  is_billable boolean DEFAULT false,
  notes text,
  submitted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid NOT NULL REFERENCES expenses(id),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transaction_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number text NOT NULL,
  customer_id uuid REFERENCES customers_enhanced(id),
  company_id uuid REFERENCES companies(id),
  case_id uuid REFERENCES cases(id),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_type text DEFAULT 'fixed',
  discount_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  currency_code text DEFAULT 'USD',
  valid_until date,
  terms_and_conditions text,
  notes text,
  client_reference text,
  bank_account_id uuid REFERENCES bank_accounts(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  rejected_reason text,
  converted_to_invoice_id uuid,
  portal_visible boolean DEFAULT true,
  pdf_file_path text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  accounting_locale_id uuid REFERENCES accounting_locales(id),
  template_id uuid REFERENCES document_templates(id),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS quote_statuses (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  color text DEFAULT '#64748b',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quote_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'service',
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  line_total numeric DEFAULT 0,
  is_taxable boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES quotes(id),
  changed_by uuid,
  change_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_statuses (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  color text DEFAULT '#64748b',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL,
  invoice_type text NOT NULL DEFAULT 'tax_invoice',
  customer_id uuid REFERENCES customers_enhanced(id),
  company_id uuid REFERENCES companies(id),
  case_id uuid REFERENCES cases(id),
  quote_id uuid REFERENCES quotes(id),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_type text DEFAULT 'fixed',
  discount_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  amount_due numeric DEFAULT 0,
  currency_code text DEFAULT 'USD',
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  terms_and_conditions text,
  notes text,
  client_reference text,
  bank_account_id uuid REFERENCES bank_accounts(id),
  converted_from_proforma_id uuid,
  converted_at timestamptz,
  portal_visible boolean DEFAULT true,
  pdf_file_path text,
  sent_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  accounting_locale_id uuid REFERENCES accounting_locales(id),
  invoice_date date DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  tax_rate numeric DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  line_total numeric NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  item_type text NOT NULL DEFAULT 'Service'
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_number text NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  payment_method_id uuid REFERENCES payment_methods(id),
  reference_number text,
  customer_id uuid REFERENCES customers_enhanced(id),
  bank_account_id uuid REFERENCES bank_accounts(id),
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  case_id uuid REFERENCES cases(id)
);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES payments(id),
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  amount numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number text NOT NULL,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  account_id uuid NOT NULL REFERENCES bank_accounts(id),
  payment_method_id uuid REFERENCES payment_methods(id),
  amount numeric NOT NULL,
  source_type text NOT NULL DEFAULT 'customer',
  customer_id uuid REFERENCES customers_enhanced(id),
  company_id uuid REFERENCES companies(id),
  case_id uuid REFERENCES cases(id),
  invoice_id uuid REFERENCES invoices(id),
  reference_number text,
  description text,
  notes text,
  status text NOT NULL DEFAULT 'completed',
  allocated_amount numeric DEFAULT 0,
  unallocated_amount numeric DEFAULT 0,
  is_reconciled boolean DEFAULT false,
  reconciled_at timestamptz,
  reconciled_by uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS receipt_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id uuid NOT NULL REFERENCES payment_receipts(id),
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  allocated_amount numeric NOT NULL,
  allocation_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_disbursements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  disbursement_number text NOT NULL,
  disbursement_date date NOT NULL DEFAULT CURRENT_DATE,
  account_id uuid NOT NULL REFERENCES bank_accounts(id),
  payment_method_id uuid REFERENCES payment_methods(id),
  amount numeric NOT NULL,
  payee_name text NOT NULL,
  payee_type text NOT NULL DEFAULT 'vendor',
  expense_category_id uuid REFERENCES expense_categories(id),
  expense_id uuid REFERENCES expenses(id),
  reference_number text,
  description text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  approval_required boolean DEFAULT true,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  approval_notes text,
  is_reconciled boolean DEFAULT false,
  reconciled_at timestamptz,
  reconciled_by uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS reconciliation_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES bank_reconciliation_sessions(id),
  bank_transaction_id uuid NOT NULL REFERENCES bank_transactions(id),
  matched_type text NOT NULL,
  receipt_id uuid REFERENCES payment_receipts(id),
  disbursement_id uuid REFERENCES payment_disbursements(id),
  transfer_id uuid REFERENCES account_transfers(id),
  match_confidence text NOT NULL DEFAULT 'manual',
  variance_amount numeric DEFAULT 0,
  notes text,
  matched_by uuid REFERENCES profiles(id),
  matched_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receipts (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  receipt_number text NOT NULL,
  receipt_date date NOT NULL,
  amount numeric NOT NULL,
  payment_method_id uuid REFERENCES payment_methods(id),
  case_id uuid REFERENCES cases(id),
  customer_id uuid REFERENCES profiles(id),
  bank_account_id uuid REFERENCES bank_accounts(id),
  reference_number text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  type text NOT NULL,
  category_id uuid REFERENCES transaction_categories(id),
  description text NOT NULL,
  reference_number text,
  related_invoice_id uuid REFERENCES invoices(id),
  related_payment_id uuid REFERENCES payments(id),
  related_expense_id uuid REFERENCES expenses(id),
  bank_account_id uuid REFERENCES bank_accounts(id),
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vat_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid REFERENCES invoices(id),
  expense_id uuid REFERENCES expenses(id),
  transaction_type text,
  vat_amount numeric,
  vat_rate numeric,
  taxable_amount numeric,
  period_start date,
  period_end date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vat_returns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text DEFAULT 'draft',
  output_vat numeric DEFAULT 0,
  input_vat numeric DEFAULT 0,
  net_vat numeric DEFAULT 0,
  submission_date date,
  submitted_by uuid REFERENCES profiles(id),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vat_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vat_return_id uuid REFERENCES vat_returns(id),
  transaction_type text,
  reference_id uuid,
  reference_type text,
  taxable_amount numeric DEFAULT 0,
  vat_amount numeric DEFAULT 0,
  vat_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ---- Suppliers ----
CREATE TABLE IF NOT EXISTS supplier_categories (
  id integer NOT NULL DEFAULT nextval('supplier_categories_id_seq') PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS supplier_payment_terms (
  id integer NOT NULL DEFAULT nextval('supplier_payment_terms_id_seq') PRIMARY KEY,
  name text NOT NULL,
  days integer NOT NULL DEFAULT 0,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_number text NOT NULL,
  supplier_name text NOT NULL,
  company_type text,
  tax_id text,
  registration_number text,
  email text,
  phone text,
  mobile text,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'United States',
  status text DEFAULT 'active',
  payment_terms text,
  credit_limit numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  bank_name text,
  bank_account_number text,
  bank_swift_code text,
  lead_time_days integer DEFAULT 0,
  minimum_order_quantity numeric DEFAULT 0,
  delivery_zones text[],
  notes text,
  rating numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  category_id integer REFERENCES supplier_categories(id),
  payment_terms_id integer REFERENCES supplier_payment_terms(id),
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  primary_contact_position text,
  description text,
  on_time_delivery_rate numeric DEFAULT 0,
  response_time_hours integer DEFAULT 0,
  quality_score numeric DEFAULT 0,
  pricing_score numeric DEFAULT 0,
  reliability_score numeric DEFAULT 0,
  is_approved boolean DEFAULT false,
  preferred_shipping_method text,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS supplier_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  contact_name text NOT NULL,
  contact_title text,
  contact_email text,
  contact_phone text,
  contact_mobile text,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_communications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  communication_type text DEFAULT 'email',
  subject text NOT NULL,
  description text,
  contact_person text,
  communication_date timestamptz DEFAULT now(),
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  document_type text DEFAULT 'other',
  title text NOT NULL,
  description text,
  file_path text,
  file_name text,
  file_size bigint,
  mime_type text,
  expiry_date date,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_audit_trail (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id uuid REFERENCES suppliers(id),
  action text NOT NULL,
  user_id uuid REFERENCES profiles(id),
  changes jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_performance_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  metric_period_start date NOT NULL,
  metric_period_end date NOT NULL,
  total_orders integer DEFAULT 0,
  on_time_deliveries integer DEFAULT 0,
  on_time_delivery_rate numeric DEFAULT 0,
  average_response_time_hours numeric DEFAULT 0,
  total_items_received integer DEFAULT 0,
  defective_items integer DEFAULT 0,
  quality_defect_rate numeric DEFAULT 0,
  pricing_consistency_score numeric DEFAULT 100,
  reliability_score numeric DEFAULT 0,
  overall_rating numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  product_name text NOT NULL,
  product_code text,
  category text,
  unit_price numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  unit_of_measure text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_statuses (
  id integer NOT NULL DEFAULT nextval('purchase_order_statuses_id_seq') PRIMARY KEY,
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  order_date date DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  actual_delivery_date date,
  status text DEFAULT 'draft',
  subtotal numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  payment_status text DEFAULT 'pending',
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status_id integer REFERENCES purchase_order_statuses(id),
  approved_by uuid,
  approved_at timestamptz,
  received_by uuid,
  received_at timestamptz,
  shipping_address text,
  shipping_method text,
  tracking_number text,
  internal_notes text,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  line_total numeric DEFAULT 0,
  received_quantity numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---- HR & Employees ----
CREATE TABLE IF NOT EXISTS departments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  parent_department_id uuid REFERENCES departments(id),
  manager_id uuid REFERENCES profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS positions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  department_id uuid REFERENCES departments(id),
  level text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id uuid NOT NULL PRIMARY KEY REFERENCES profiles(id),
  employee_number text NOT NULL,
  department_id uuid REFERENCES departments(id),
  position_id uuid REFERENCES positions(id),
  employment_type text DEFAULT 'full_time',
  employment_status text DEFAULT 'active',
  hire_date date NOT NULL,
  termination_date date,
  date_of_birth date,
  national_id text,
  passport_number text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'UK',
  emergency_contact_name text,
  emergency_contact_relationship text,
  emergency_contact_phone text,
  bank_name text,
  bank_account_number text,
  bank_sort_code text,
  tax_code text,
  national_insurance_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id),
  attendance_date date NOT NULL,
  check_in_time time,
  check_out_time time,
  total_hours numeric DEFAULT 0,
  status text DEFAULT 'present',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  annual_days integer DEFAULT 0,
  carry_over_allowed boolean DEFAULT false,
  max_carry_over_days integer DEFAULT 0,
  requires_approval boolean DEFAULT true,
  is_paid boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id),
  leave_type_id uuid NOT NULL REFERENCES leave_types(id),
  year integer NOT NULL,
  total_days numeric NOT NULL DEFAULT 0,
  used_days numeric DEFAULT 0,
  pending_days numeric DEFAULT 0,
  remaining_days numeric NOT NULL DEFAULT 0,
  carried_over_days numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id),
  leave_type_id uuid NOT NULL REFERENCES leave_types(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days numeric NOT NULL,
  reason text,
  status text DEFAULT 'pending',
  applied_date date NOT NULL DEFAULT CURRENT_DATE,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_date date,
  review_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timesheets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id),
  work_date date NOT NULL,
  project_name text,
  task_description text,
  hours numeric NOT NULL,
  is_billable boolean DEFAULT true,
  status text DEFAULT 'draft',
  submitted_date date,
  approved_by uuid REFERENCES profiles(id),
  approved_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id),
  document_type text DEFAULT 'other',
  title text NOT NULL,
  description text,
  file_path text,
  file_name text,
  file_size bigint,
  mime_type text,
  uploaded_by uuid,
  expiry_date date,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS salary_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  component_type text NOT NULL,
  calculation_type text DEFAULT 'fixed',
  default_amount numeric DEFAULT 0,
  is_taxable boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_salary_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id),
  base_salary numeric NOT NULL,
  payment_frequency text DEFAULT 'monthly',
  currency text DEFAULT 'GBP',
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_salary_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id),
  component_id uuid NOT NULL REFERENCES salary_components(id),
  amount numeric NOT NULL DEFAULT 0,
  effective_date date DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_components (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  component_name text NOT NULL,
  component_code text NOT NULL,
  component_type text NOT NULL,
  calculation_method text,
  default_amount numeric,
  is_taxable boolean DEFAULT false,
  is_mandatory boolean DEFAULT false,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id),
  payroll_month integer NOT NULL,
  payroll_year integer NOT NULL,
  base_salary numeric NOT NULL,
  total_allowances numeric DEFAULT 0,
  total_deductions numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  gross_salary numeric NOT NULL,
  net_salary numeric NOT NULL,
  payment_date date,
  payment_method text DEFAULT 'bank_transfer',
  status text DEFAULT 'draft',
  notes text,
  processed_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_record_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_record_id uuid NOT NULL REFERENCES payroll_records(id),
  component_id uuid REFERENCES salary_components(id),
  component_name text NOT NULL,
  component_type text NOT NULL,
  amount numeric NOT NULL,
  is_taxable boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id),
  reviewer_id uuid NOT NULL,
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  review_date date,
  overall_rating integer,
  strengths text,
  areas_for_improvement text,
  goals_achieved text,
  goals_next_period text,
  comments text,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onboarding_checklists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  for_position_id uuid,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onboarding_checklist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id uuid NOT NULL REFERENCES onboarding_checklists(id),
  task_name text NOT NULL,
  task_description text,
  assigned_to_role text,
  due_days_from_start integer DEFAULT 0,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL,
  checklist_item_id uuid REFERENCES onboarding_checklist_items(id),
  task_name text NOT NULL,
  task_description text,
  assigned_to uuid,
  due_date date,
  completed_date date,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recruitment_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  department_id uuid,
  position_id uuid,
  employment_type text,
  location text,
  salary_range_min numeric,
  salary_range_max numeric,
  openings integer DEFAULT 1,
  status text DEFAULT 'open',
  posted_date date DEFAULT CURRENT_DATE,
  closing_date date,
  created_by uuid,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recruitment_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES recruitment_jobs(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  resume_path text,
  cover_letter text,
  current_stage text DEFAULT 'applied',
  rating integer,
  notes text,
  applied_date date NOT NULL DEFAULT CURRENT_DATE,
  last_contact_date date,
  assigned_to uuid,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- ---- Assets ----
CREATE TABLE IF NOT EXISTS asset_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  depreciation_method text DEFAULT 'straight_line',
  useful_life_years integer DEFAULT 5,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_number text NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES asset_categories(id),
  serial_number text,
  purchase_date date NOT NULL,
  purchase_price numeric NOT NULL,
  current_value numeric,
  salvage_value numeric DEFAULT 0,
  depreciation_method text DEFAULT 'straight_line',
  useful_life_years integer DEFAULT 5,
  location text,
  status text DEFAULT 'active',
  assigned_to uuid,
  photo_url text,
  warranty_expiry date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES assets(id),
  assigned_to uuid NOT NULL,
  assigned_by uuid,
  assigned_date timestamptz DEFAULT now(),
  return_date timestamptz,
  condition_at_assignment text,
  condition_at_return text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_depreciation (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES assets(id),
  depreciation_period text NOT NULL,
  opening_value numeric NOT NULL,
  depreciation_amount numeric NOT NULL,
  closing_value numeric NOT NULL,
  calculated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_maintenance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES assets(id),
  maintenance_type text NOT NULL,
  description text NOT NULL,
  scheduled_date date,
  completed_date date,
  cost numeric,
  performed_by text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- ---- Stock ----
CREATE TABLE IF NOT EXISTS stock_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  parent_category_id uuid REFERENCES stock_categories(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  address text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES stock_categories(id),
  unit_of_measure text DEFAULT 'unit',
  unit_price numeric DEFAULT 0,
  quantity_on_hand numeric DEFAULT 0,
  reorder_level numeric DEFAULT 0,
  reorder_quantity numeric DEFAULT 0,
  location_id uuid REFERENCES stock_locations(id),
  supplier_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_item_id uuid NOT NULL REFERENCES stock_items(id),
  movement_type text NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric,
  reference_type text,
  reference_id uuid,
  from_location_id uuid REFERENCES stock_locations(id),
  to_location_id uuid REFERENCES stock_locations(id),
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_item_id uuid NOT NULL REFERENCES stock_items(id),
  adjustment_type text NOT NULL,
  quantity_before numeric NOT NULL,
  quantity_after numeric NOT NULL,
  reason text NOT NULL,
  approved_by uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- ---- Knowledge Base ----
CREATE TABLE IF NOT EXISTS kb_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  parent_category_id uuid REFERENCES kb_categories(id),
  icon text,
  color text,
  ordering integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kb_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL,
  content text NOT NULL,
  excerpt text,
  category_id uuid REFERENCES kb_categories(id),
  author_id uuid REFERENCES profiles(id),
  status text DEFAULT 'draft',
  view_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  version integer DEFAULT 1,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kb_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kb_article_tags (
  article_id uuid NOT NULL REFERENCES kb_articles(id),
  tag_id uuid NOT NULL REFERENCES kb_tags(id),
  PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE IF NOT EXISTS kb_article_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES kb_articles(id),
  version_number integer NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  changed_by uuid,
  change_notes text,
  created_at timestamptz DEFAULT now()
);

-- ---- Import / Export ----
CREATE TABLE IF NOT EXISTS import_export_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  entity_type text NOT NULL,
  template_type text NOT NULL,
  configuration jsonb NOT NULL DEFAULT '{}',
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_export_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type text NOT NULL,
  entity_type text NOT NULL,
  file_name text NOT NULL,
  file_path text,
  file_size bigint,
  status text NOT NULL DEFAULT 'pending',
  total_records integer DEFAULT 0,
  processed_records integer DEFAULT 0,
  success_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  warning_count integer DEFAULT 0,
  configuration jsonb DEFAULT '{}',
  error_summary text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_export_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES import_export_jobs(id),
  row_number integer,
  log_type text NOT NULL,
  field_name text,
  message text NOT NULL,
  row_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_field_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  entity_type text NOT NULL,
  description text,
  mappings jsonb NOT NULL DEFAULT '{}',
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---- Branches ----
CREATE TABLE IF NOT EXISTS branches (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  branch_code text NOT NULL,
  branch_name text NOT NULL,
  is_headquarters boolean DEFAULT false,
  address_line1 text,
  address_line2 text,
  city text NOT NULL,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'Oman',
  country_code text DEFAULT 'OM',
  latitude numeric,
  longitude numeric,
  google_maps_url text,
  phone_primary text,
  phone_secondary text,
  email text,
  fax text,
  manager_id uuid,
  manager_name text,
  manager_phone text,
  manager_email text,
  opening_date date,
  is_active boolean DEFAULT true,
  branch_type text,
  service_capabilities jsonb DEFAULT '[]',
  working_hours jsonb,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================
DO $rls$
DECLARE
  t text;
  tables text[] := ARRAY[
    'accessories','account_balance_snapshots','account_transfers','accounting_locales',
    'asset_assignments','asset_categories','asset_depreciation','asset_maintenance','assets',
    'attendance_records','audit_trails','bank_accounts','bank_reconciliation_sessions',
    'bank_transactions','branches','brands','capacities','case_attachments',
    'case_communications','case_devices','case_diagnostics','case_engineers',
    'case_follow_ups','case_internal_notes','case_job_history','case_milestones',
    'case_portal_visibility','case_priorities','case_qa_checklists','case_quote_items',
    'case_quotes','case_recovery_attempts','case_report_sections','case_report_templates',
    'case_reports','case_statuses','cases','chain_of_custody','chain_of_custody_access_log',
    'chain_of_custody_integrity_checks','chain_of_custody_transfers','cities','clone_drives',
    'companies','company_documents','company_settings','countries','currency_codes',
    'customer_communications','customer_company_relationships','customer_groups',
    'customers_enhanced','database_backups','departments','device_component_statuses',
    'device_conditions','device_diagnostics','device_encryption','device_form_factors',
    'device_head_no','device_interfaces','device_made_in','device_platter_no',
    'device_roles','device_types','document_templates','donor_compatibility_matrix',
    'employee_documents','employee_salary_components','employee_salary_config','employees',
    'expense_attachments','expense_categories','expenses','financial_audit_logs',
    'financial_transactions','import_export_jobs','import_export_logs',
    'import_export_templates','import_field_mappings','industries','interfaces',
    'inventory_assignments','inventory_case_assignments','inventory_categories',
    'inventory_condition_types','inventory_item_categories','inventory_items',
    'inventory_locations','inventory_parts_usage','inventory_photos',
    'inventory_reservations','inventory_search_templates','inventory_status_history',
    'inventory_status_types','inventory_transactions','invoice_line_items',
    'invoice_statuses','invoices','kb_article_tags','kb_article_versions',
    'kb_articles','kb_categories','kb_tags','leave_balances','leave_requests',
    'leave_types','modules','ndas','number_sequences','number_sequences_audit',
    'onboarding_checklist_items','onboarding_checklists','onboarding_tasks',
    'payment_allocations','payment_disbursements','payment_methods','payment_receipts',
    'payments','payroll_components','payroll_record_items','payroll_records',
    'pdf_generation_logs','performance_reviews','portal_link_history','positions',
    'profiles','purchase_order_items','purchase_order_statuses','purchase_orders',
    'quote_history','quote_items','quote_statuses','quotes','receipt_allocations',
    'receipts','reconciliation_matches','recruitment_candidates','recruitment_jobs',
    'report_section_library','report_section_presets','report_template_section_mappings',
    'resource_clone_drives','role_module_permissions','salary_components','seed_status',
    'service_catalog_categories','service_line_items_catalog','service_locations',
    'service_problems','service_types','settings','stock_adjustments','stock_categories',
    'stock_items','stock_locations','stock_movements','supplier_audit_trail',
    'supplier_categories','supplier_communications','supplier_contacts',
    'supplier_documents','supplier_payment_terms','supplier_performance_metrics',
    'supplier_products','suppliers','system_logs','tax_rates','template_categories',
    'template_types','template_variables','template_versions','templates','timesheets',
    'transaction_categories','user_activity_logs','user_activity_sessions',
    'user_preferences','user_sessions','user_sidebar_preferences',
    'vat_records','vat_returns','vat_transactions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END;
$rls$;
