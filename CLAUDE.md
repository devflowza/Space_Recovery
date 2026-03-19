# xSuite — Architecture Reference for Claude

## Project Overview

xSuite is an AI-powered, multi-tenant SaaS platform for the **data recovery industry**. It is a full ERP + CRM system that manages cases, devices, clients, finances, inventory, HR, and supplier relationships for data recovery labs.

**Stack:**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- State: TanStack Query v5 (server state), React context (auth/permissions)
- Backend: Supabase (Postgres 15, Auth, Edge Functions, Storage, Realtime)
- PDF: `@react-pdf/renderer` (React components) + `pdfmake` (programmatic)
- Icons: `lucide-react` only — no other icon libraries

---

## Supabase Project

- **Project URL**: see `VITE_SUPABASE_URL` in `.env`
- **Anon Key**: see `VITE_SUPABASE_ANON_KEY` in `.env`
- **Project ID**: `ssmbegiyjivrcwgcqutu`
- **MCP Transport**: HTTP (configured in project settings)

---

## Source of Truth Rules

1. **The live Supabase database is the single source of truth** for schema, types, and migrations.
2. Never edit the database schema via the Supabase dashboard directly. All schema changes go through `mcp__supabase__apply_migration`.
3. After every migration, regenerate `src/types/database.types.ts` using `mcp__supabase__generate_typescript_types`.
4. Never hand-edit `src/types/database.types.ts`. It is a generated file.

---

## TypeScript Types

- **Canonical types file**: `src/types/database.types.ts`
- Import the `Database` type from this file. Never import from `src/types/database.ts` (legacy).
- Usage pattern:
  ```typescript
  import type { Database } from '../types/database.types';
  type Case = Database['public']['Tables']['cases']['Row'];
  type CaseInsert = Database['public']['Tables']['cases']['Insert'];
  ```
- The Supabase client in `src/lib/supabaseClient.ts` is typed with `createClient<Database>(...)`.

---

## Multi-Tenant Architecture

### Tenant Isolation Model
- **Every tenant-scoped table** has a `tenant_id uuid NOT NULL` column with FK to `tenants(id)`
- **RESTRICTIVE RLS policies** enforce tenant isolation on ALL tenant-scoped tables:
  ```sql
  CREATE POLICY "{table}_tenant_isolation" ON {table}
    AS RESTRICTIVE FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id() OR is_platform_admin());
  ```
- The `RESTRICTIVE` keyword ensures this policy is always ANDed with any permissive policies
- Platform admins (tenant_id IS NULL in profiles) can access all tenants

### Role Hierarchy
```
owner > admin > manager > technician = sales = accounts = hr > viewer
```

| Role | Scope | Description |
|------|-------|-------------|
| `owner` | Tenant | Tenant creator, full control |
| `admin` | Tenant | Tenant administrator |
| `manager` | Tenant | Team manager |
| `technician` | Tenant | Technical staff |
| `sales` | Tenant | Sales staff |
| `accounts` | Tenant | Accounting staff |
| `hr` | Tenant | HR staff |
| `viewer` | Tenant | Read-only access |

**Platform admins** are identified by `role IN ('owner', 'admin') AND tenant_id IS NULL` in `profiles`.

### Security Functions

| Function | Purpose |
|---|---|
| `get_current_tenant_id()` | Returns current user's tenant_id from profiles |
| `is_platform_admin()` | True if user has admin role with NULL tenant_id |
| `is_tenant_owner()` | True if user is tenant owner |
| `is_tenant_admin()` | True if user is owner or admin |
| `is_admin()` | True if user is owner or admin (any scope) |
| `is_staff_user()` | True for any non-viewer role |
| `has_role(required_role)` | Hierarchical role check |
| `belongs_to_tenant(uuid)` | Check tenant membership |
| `is_portal_user()` | True for portal customers (JWT claim) |
| `get_my_role()` | Returns current role string |

---

## Database Architecture

### Table Naming Conventions
- All tables: **snake_case, plural**
- All columns: **snake_case**
- Enum types: **snake_case with descriptive suffix**
- Functions: **verb-prefix** (e.g., `get_next_number`, `is_admin`)

### Table Prefixes (Mandatory)

| Prefix | Scope | Description |
|--------|-------|-------------|
| `geo_*` | Global | Geography (countries, cities) |
| `catalog_*` | Global | Product/service catalogs (devices, services) |
| `master_*` | Global | Lookup/reference data (statuses, types, categories) |
| `system_*` | Global | System configuration |
| `platform_*` | Platform | Platform admin tables |
| `tenant_*` | Platform | Tenant management |
| `subscription_*` | Platform | Subscription plans |
| `billing_*` | Platform | Platform billing |
| `case_*` | Tenant | Case management |
| `customer_*` | Tenant | Customer management |
| `invoice_*` | Tenant | Invoices |
| `quote_*` | Tenant | Quotes |
| `purchase_*` | Tenant | Purchase orders |
| `expense_*` | Tenant | Expenses |
| `payment_*` | Tenant | Payments |
| `inventory_*` | Tenant | Inventory |
| `stock_*` | Tenant | Stock management |
| `asset_*` | Tenant | Asset management |
| `supplier_*` | Tenant | Suppliers |
| `employee_*` | Tenant | HR/employees |
| `payroll_*` | Tenant | Payroll |
| `leave_*` | Tenant | Leave management |
| `kb_*` | Tenant | Knowledge base |

### Soft Deletes
All tables use `deleted_at timestamptz DEFAULT NULL`. **Never use hard deletes (`DELETE FROM`)**. Always set `deleted_at = now()`.

### RLS Policy Patterns

**Tenant-scoped tables** (3 patterns applied to every table with `tenant_id`):
1. RESTRICTIVE tenant isolation: `tenant_id = get_current_tenant_id() OR is_platform_admin()`
2. PERMISSIVE operation policies for SELECT/INSERT/UPDATE/DELETE
3. DELETE restricted to admin role via `has_role('admin')`

**Global master data** (`geo_*`, `catalog_*`, `master_*`, `system_*`):
- SELECT: `USING (true)` for all authenticated users
- INSERT/UPDATE/DELETE: `is_platform_admin()` only

**Platform tables** (`platform_*`):
- All operations: `is_platform_admin()` only

---

## Domain Model (222 Tables)

### Geography (Global)
`geo_countries`, `geo_cities`

### Master Data (Global)
`master_industries`, `master_currency_codes`, `master_case_priorities`, `master_case_statuses`, `master_case_report_templates`, `master_invoice_statuses`, `master_quote_statuses`, `master_purchase_order_statuses`, `master_leave_types`, `master_payment_methods`, `master_expense_categories`, `master_transaction_categories`, `master_template_categories`, `master_template_types`, `master_template_variables`, `master_modules`, `master_inventory_categories`, `master_inventory_condition_types`, `master_inventory_item_categories`, `master_inventory_status_types`, `master_supplier_categories`, `master_supplier_payment_terms`, `master_payroll_components`

### Device & Service Catalogs (Global)
`catalog_device_brands`, `catalog_device_types`, `catalog_device_capacities`, `catalog_device_encryption`, `catalog_device_form_factors`, `catalog_device_interfaces`, `catalog_device_made_in`, `catalog_device_head_counts`, `catalog_device_platter_counts`, `catalog_device_roles`, `catalog_device_conditions`, `catalog_device_component_statuses`, `catalog_interfaces`, `catalog_accessories`, `catalog_donor_compatibility_matrix`, `catalog_service_types`, `catalog_service_locations`, `catalog_service_problems`, `catalog_service_categories`, `catalog_service_line_items`

### System (Global)
`system_settings`, `system_seed_status`, `report_section_library`, `report_section_presets`, `report_template_section_mappings`

### Platform & Subscription
`tenants`, `profiles`, `platform_admins`, `platform_audit_logs`, `platform_announcements`, `platform_metrics`, `tenant_impersonation_sessions`, `subscription_plans`, `plan_features`, `tenant_subscriptions`, `tenant_payment_methods`, `tenant_activity_log`, `tenant_health_metrics`, `billing_invoices`, `billing_invoice_items`, `billing_events`, `billing_coupons`, `coupon_redemptions`, `usage_records`, `usage_snapshots`, `support_tickets`, `support_ticket_messages`, `announcement_dismissals`, `onboarding_progress`, `signup_otps`

### Cases (Tenant-scoped)
`cases`, `case_devices`, `case_attachments`, `case_communications`, `case_diagnostics`, `case_engineers`, `case_follow_ups`, `case_internal_notes`, `case_job_history`, `case_milestones`, `case_portal_visibility`, `case_qa_checklists`, `case_recovery_attempts`, `case_quotes`, `case_quote_items`, `case_reports`, `case_report_sections`

### Chain of Custody (Tenant-scoped)
`chain_of_custody`, `chain_of_custody_access_log`, `chain_of_custody_integrity_checks`, `chain_of_custody_transfers`
- Uses enums: `custody_action_category`, `custody_status`, `custody_transfer_status`, `integrity_check_result`

### Customers & Companies (Tenant-scoped)
`customers_enhanced` (canonical; `customers` is a compatibility view), `customer_groups`, `customer_communications`, `customer_company_relationships`, `companies`, `company_documents`, `company_settings`, `ndas`, `portal_link_history`

### Financial (Tenant-scoped)
`invoices`, `invoice_line_items`, `quotes`, `quote_items`, `quote_history`, `payments`, `payment_allocations`, `payment_receipts`, `payment_disbursements`, `receipts`, `receipt_allocations`, `expenses`, `expense_attachments`, `financial_transactions`, `financial_audit_logs`, `bank_accounts`, `bank_transactions`, `bank_reconciliation_sessions`, `account_balance_snapshots`, `account_transfers`, `reconciliation_matches`, `accounting_locales`, `tax_rates`, `vat_records`, `vat_returns`, `vat_transactions`

### Inventory & Stock (Tenant-scoped)
`inventory_items`, `inventory_locations`, `inventory_assignments`, `inventory_case_assignments`, `inventory_photos`, `inventory_reservations`, `inventory_search_templates`, `inventory_status_history`, `inventory_transactions`, `inventory_parts_usage`, `stock_items`, `stock_categories`, `stock_locations`, `stock_movements`, `stock_adjustments`, `stock_adjustment_sessions`, `stock_adjustment_session_items`, `stock_alerts`, `stock_price_history`, `stock_sales`, `stock_sale_items`, `stock_serial_numbers`, `stock_transactions`, `clone_drives`, `resource_clone_drives`, `device_diagnostics`

### Suppliers (Tenant-scoped)
`suppliers`, `supplier_contacts`, `supplier_communications`, `supplier_documents`, `supplier_audit_trail`, `supplier_performance_metrics`, `supplier_products`, `purchase_orders`, `purchase_order_items`

### HR & Payroll (Tenant-scoped)
`departments`, `positions`, `employees`, `employee_documents`, `employee_salary_config`, `employee_salary_components`, `employee_salary_structures`, `employee_loans`, `loan_repayments`, `attendance_records`, `timesheets`, `leave_balances`, `leave_requests`, `salary_components`, `payroll_settings`, `payroll_periods`, `payroll_records`, `payroll_record_items`, `payroll_adjustments`, `payroll_bank_files`, `performance_reviews`, `onboarding_checklists`, `onboarding_checklist_items`, `onboarding_tasks`, `recruitment_jobs`, `recruitment_candidates`

### Assets (Tenant-scoped)
`asset_categories`, `assets`, `asset_assignments`, `asset_depreciation`, `asset_maintenance`

### Documents & Templates (Tenant-scoped)
`document_templates`, `templates`, `template_versions`, `number_sequences`, `number_sequences_audit`, `role_module_permissions`

### System & Logs (Tenant-scoped)
`system_logs`, `audit_trails`, `database_backups`, `pdf_generation_logs`, `user_preferences`, `user_sidebar_preferences`, `user_activity_sessions`, `user_activity_logs`, `user_sessions`, `branches`

### Knowledge Base (Tenant-scoped)
`kb_categories`, `kb_articles`, `kb_tags`, `kb_article_tags`, `kb_article_versions`

### Import/Export (Tenant-scoped)
`import_export_templates`, `import_export_jobs`, `import_export_logs`, `import_field_mappings`

---

## Key Database Functions

| Function | Purpose |
|---|---|
| `get_next_number(scope)` | Returns next formatted number (e.g., `CASE-0042`) |
| `get_next_case_number()` | Case-specific number generator |
| `handle_new_user()` | Auth trigger: creates `profiles` row on signup |
| `is_admin()` | RLS helper: true if user is owner or admin |
| `is_staff_user()` | RLS helper: true for any staff role |
| `is_platform_admin()` | RLS helper: true for platform-level admin |
| `has_role(role)` | Hierarchical role check |
| `get_my_role()` | Returns current user's role string |
| `authenticate_portal_customer(email, password)` | Portal customer auth |
| `convert_proforma_to_tax_invoice(quote_id)` | Converts quote to invoice |
| `search_donor_drives(criteria)` | Inventory donor drive search |
| `log_audit_trail(...)` | Creates audit trail entry |
| `log_chain_of_custody(...)` | Creates chain of custody entry |
| `log_case_history(...)` | Creates case history entry |

---

## Edge Functions

Located in `supabase/functions/`:

| Function | Purpose |
|---|---|
| `send-document-email` | Sends PDFs/documents via email (SMTP) |
| `user-management` | Admin user creation/management |
| `provision-tenant` | Creates new SaaS tenants |
| `paypal-create-subscription` | PayPal subscription creation |
| `paypal-cancel-subscription` | PayPal subscription cancellation |
| `paypal-webhook` | PayPal webhook handler |

- All edge functions use Deno runtime
- All must handle CORS with headers: `Content-Type, Authorization, X-Client-Info, Apikey`
- Import external packages with `npm:` prefix
- Never share code between edge functions

---

## Migration Workflow

When making schema changes:

1. **Introspect first**: Use `mcp__supabase__list_tables` or `mcp__supabase__execute_sql` to understand the current live schema.
2. **Write migration**: Use `mcp__supabase__apply_migration` with a timestamped filename.
3. **Include in every migration**:
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`
   - RESTRICTIVE tenant isolation policy for tenant-scoped tables
   - Appropriate RLS policies
   - `tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE` for tenant-scoped tables
   - `CREATE INDEX idx_{table}_tenant_id ON {table}(tenant_id) WHERE deleted_at IS NULL`
4. **Regen types**: Use `mcp__supabase__generate_typescript_types` and save to `src/types/database.types.ts`.
5. **Never** use `DROP TABLE`, `DROP COLUMN`, or `DELETE FROM` on production data. Use soft deletes and additive migrations only.

---

## Frontend Architecture

```
src/
  App.tsx                    # Router + QueryClient + AuthContext
  contexts/
    AuthContext.tsx           # Supabase auth state
    PermissionsContext.tsx    # Role-based permission checks
    PortalAuthContext.tsx     # Customer portal auth
    PlatformAdminContext.tsx  # Platform admin state
  lib/
    supabaseClient.ts         # Singleton Supabase client (typed with Database)
    *Service.ts               # Domain service files (one per domain)
    pdf/                      # PDF generation utilities
  components/
    ui/                       # Base UI components
    layout/                   # AppLayout, Sidebar, PortalLayout
    ...                       # One subdirectory per domain
  pages/
    auth/                     # Login, TenantSignup
    cases/                    # Case management
    financial/                # Invoices, Quotes, Banking
    portal/                   # Customer portal
    platform-admin/           # Platform administration
    settings/                 # Settings
    ...                       # One subdirectory per domain
  types/
    database.types.ts         # GENERATED — do not hand-edit
    roles.ts                  # Role type definitions
```

### Service Layer Pattern
Each domain has a `*Service.ts` file in `src/lib/`. Services:
- Import `supabase` from `./supabaseClient`
- Use `Database` types from `../types/database.types`
- Return typed data, never raw Supabase responses
- Use `maybeSingle()` (not `single()`) when fetching zero-or-one row

### Query Keys
All TanStack Query keys are centralized in `src/lib/queryKeys.ts`.

### Permissions
Use `PermissionsContext` for all feature-gating. Never hardcode role strings in components — use the permission system.

---

## Customers vs customers_enhanced

`customers` is a **compatibility view** over `customers_enhanced`. The canonical table is `customers_enhanced`. Always insert/update `customers_enhanced` directly.

---

## Number Sequences

Case numbers, invoice numbers, etc. are generated via:
```typescript
const { data } = await supabase.rpc('get_next_number', { sequence_name: 'cases' });
```
Sequences are tracked in `number_sequences` and audited in `number_sequences_audit`.

---

## PDF Generation

- React-based documents: `src/components/documents/` (using `@react-pdf/renderer`)
- Programmatic PDFs: `src/lib/pdf/` (using `pdfmake`)
- Arabic/RTL support: Noto Sans Arabic + Tajawal fonts in `public/fonts/`
- Font loading: `src/lib/pdf/fontLoader.ts`

---

## Key Enums

```typescript
type CustodyActionCategory = 'creation' | 'modification' | 'access' | 'transfer' | 'verification' | 'communication' | 'evidence_handling' | 'financial' | 'critical_event';
type CustodyStatus = 'in_custody' | 'in_transit' | 'checked_out' | 'archived' | 'disposed';
type CustodyTransferStatus = 'initiated' | 'pending_acceptance' | 'accepted' | 'rejected' | 'cancelled';
type IntegrityCheckResult = 'passed' | 'failed' | 'warning' | 'not_applicable';
```

---

## Do Not

- Do not use `DROP TABLE` or hard deletes
- Do not bypass RLS with `service_role` key in frontend code
- Do not use `single()` — use `maybeSingle()` instead
- Do not import from `src/types/database.ts` (legacy) — use `src/types/database.types.ts`
- Do not write to `supabase/migrations/` directly — use `mcp__supabase__apply_migration`
- Do not install new npm packages without checking existing packages first
- Do not use purple/indigo/violet color schemes in UI
- Do not add comments to code unless the logic is non-obvious
- Do not create new files unless necessary; prefer editing existing files
- Do not create `USING(true)` policies on tenant-scoped tables — use RESTRICTIVE tenant isolation
- Do not use `is_admin()` for platform-level operations — use `is_platform_admin()`

---

## Database Migration History

### Version 1.0.0 — Complete SaaS Architecture Rebuild
**Date**: 2026-03-19
**Migrations**: 001–014

- Dropped all 200 legacy tables, rebuilt 222 tables with proper naming conventions (`geo_*`, `catalog_*`, `master_*`, `system_*` prefixes)
- 1,019 RLS policies: 861 permissive + 158 RESTRICTIVE tenant isolation
- 92 database functions including 7 security helpers (all SECURITY DEFINER)
- 59 frontend files updated with new table references
- Regenerated `database.types.ts` (13,692 lines)
- All tenant-scoped tables enforce RESTRICTIVE isolation via `get_current_tenant_id()` / `is_platform_admin()`
- Role hierarchy: `owner > admin > manager > technician = sales = accounts = hr > viewer`
- See `docs/TABLE_MAPPING.md` for complete old → new table name mapping

### Future Migration Guidelines

1. **New tenant-scoped table**: Add `tenant_id uuid NOT NULL REFERENCES tenants(id)`, apply RESTRICTIVE tenant isolation policy, apply `set_tenant_and_audit_fields` trigger
2. **New global/master table**: No `tenant_id`. Read-only for authenticated, write for `is_platform_admin()`
3. **New platform table**: No `tenant_id`. Platform admin only access
4. **Naming**: Follow domain prefix conventions in Table Prefixes section. Audit tables: `{domain}_audit_logs`. Use plural table names
