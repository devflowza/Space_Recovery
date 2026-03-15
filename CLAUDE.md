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
- **MCP Transport**: HTTP (configured in project settings)

---

## Source of Truth Rules

1. **The live Supabase database is the single source of truth** for schema, types, and migrations.
2. Never edit the database schema via the Supabase dashboard directly. All schema changes go through `mcp__supabase__apply_migration`.
3. After every migration, regenerate `src/types/database.types.ts` by querying `information_schema.columns` via `mcp__supabase__execute_sql`.
4. Never hand-edit `src/types/database.types.ts`. It is a generated file.
5. `supabase/migrations/` must contain exactly **one file**: `00000000000000_baseline.sql` (the reconstructed live schema baseline). All new changes go in new timestamped migration files.

---

## TypeScript Types

- **Canonical types file**: `src/types/database.types.ts`
- Import the `Database` type from this file. Never import from `src/types/database.ts` (legacy, kept for reference only during transition).
- Usage pattern:
  ```typescript
  import type { Database } from '../types/database.types';
  type Case = Database['public']['Tables']['cases']['Row'];
  type CaseInsert = Database['public']['Tables']['cases']['Insert'];
  ```
- The Supabase client in `src/lib/supabaseClient.ts` is typed with `createClient<Database>(...)`.

---

## Database Architecture

### Schema Conventions
- All tables: **snake_case, plural** (e.g., `case_devices`, `inventory_items`)
- All columns: **snake_case** (e.g., `created_at`, `deleted_at`, `tenant_id`)
- Enum types: **snake_case with `_type` or descriptive suffix** (e.g., `custody_status`, `custody_action_category`)
- Functions: **verb-prefix** (e.g., `get_next_number`, `handle_new_user`, `is_admin`)
- RLS policies: `"{table} {role} {action}"` pattern

### Soft Deletes
All tables use `deleted_at timestamptz DEFAULT NULL`. **Never use hard deletes (`DELETE FROM`)**. Always set `deleted_at = now()` for deletions. Filter active records with `WHERE deleted_at IS NULL`.

### RLS (Row Level Security)
- RLS is **enabled on all 185 tables**. Every new table must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` immediately after creation.
- Never create policies with `USING (true)` — this defeats RLS.
- Always restrict policies to `authenticated` role minimum.
- Key helper functions:
  - `auth.uid()` — current user's UUID
  - `is_admin()` — returns true if user has admin role
  - `is_staff_user()` — returns true for any internal staff role
  - `is_portal_user()` — returns true for portal (customer) users
  - `get_my_role()` — returns the user's role string

### Tenant Isolation
- Multi-tenant via `profiles.role` and RLS policies scoped to `auth.uid()`
- Portal customers are isolated via `portal_link_history` and `authenticate_portal_customer()` function
- No `tenant_id` column — isolation is per-user via auth

---

## Domain Model (185 Tables)

### Geography & Master Data
`countries`, `cities`, `industries`, `currency_codes`, `branches`

### Device Master Data
`brands`, `capacities`, `device_types`, `device_encryption`, `device_form_factors`, `device_interfaces`, `device_made_in`, `device_head_no`, `device_platter_no`, `device_roles`, `device_conditions`, `device_component_statuses`, `interfaces`, `accessories`, `donor_compatibility_matrix`

### Service Configuration
`service_types`, `service_locations`, `service_problems`, `service_catalog_categories`, `service_line_items_catalog`

### Settings & Configuration
`settings`, `company_settings`, `seed_status`, `accounting_locales`, `tax_rates`, `number_sequences`, `number_sequences_audit`

### Templates & Documents
`template_categories`, `template_types`, `template_variables`, `document_templates`, `template_versions`, `templates`

### Auth & Users
`profiles` (extends `auth.users`), `user_activity_sessions`, `user_activity_logs`, `user_sessions`, `user_preferences`, `user_sidebar_preferences`

### System
`system_logs`, `audit_trails`, `database_backups`, `pdf_generation_logs`

### Permissions
`modules`, `role_module_permissions`

### Customers & Companies
`customer_groups`, `customers_enhanced` (canonical; `customers` is a compatibility view), `portal_link_history`, `ndas`, `companies`, `company_documents`, `customer_company_relationships`, `customer_communications`

### Cases (Core Domain)
`case_priorities`, `case_statuses`, `cases`, `case_devices`, `case_attachments`, `case_communications`, `case_diagnostics`, `case_engineers`, `case_follow_ups`, `case_internal_notes`, `case_job_history`, `case_milestones`, `case_portal_visibility`, `case_qa_checklists`, `case_recovery_attempts`

### Reports
`case_report_templates`, `case_reports`, `case_report_sections`, `report_section_library`, `report_section_presets`, `report_template_section_mappings`

### Case Quotes (case-level, pre-financial)
`case_quotes`, `case_quote_items`

### Chain of Custody
`chain_of_custody`, `chain_of_custody_access_log`, `chain_of_custody_integrity_checks`, `chain_of_custody_transfers`
- Uses enums: `custody_action_category`, `custody_status`, `custody_transfer_status`, `integrity_check_result`

### Device Diagnostics
`device_diagnostics`

### Clone Drives / Resources
`inventory_locations`, `resource_clone_drives`, `clone_drives`

### Inventory
`inventory_categories`, `inventory_condition_types`, `inventory_item_categories`, `inventory_status_types`, `inventory_items`, `inventory_assignments`, `inventory_case_assignments`, `inventory_photos`, `inventory_reservations`, `inventory_search_templates`, `inventory_status_history`, `inventory_transactions`, `inventory_parts_usage`

### Banking
`payment_methods`, `bank_accounts`, `bank_transactions`, `account_balance_snapshots`, `account_transfers`, `bank_reconciliation_sessions`

### Financial
`expense_categories`, `expenses`, `expense_attachments`, `transaction_categories`, `quotes`, `quote_statuses`, `quote_items`, `quote_history`, `invoice_statuses`, `invoices`, `invoice_line_items`, `payments`, `payment_allocations`, `payment_receipts`, `receipt_allocations`, `payment_disbursements`, `reconciliation_matches`, `receipts`, `financial_transactions`, `financial_audit_logs`, `vat_records`, `vat_returns`, `vat_transactions`

### Suppliers
`supplier_categories`, `supplier_payment_terms`, `suppliers`, `supplier_contacts`, `supplier_communications`, `supplier_documents`, `supplier_audit_trail`, `supplier_performance_metrics`, `supplier_products`, `purchase_order_statuses`, `purchase_orders`, `purchase_order_items`

### HR & Payroll
`departments`, `positions`, `employees`, `attendance_records`, `leave_types`, `leave_balances`, `leave_requests`, `timesheets`, `employee_documents`, `salary_components`, `employee_salary_config`, `employee_salary_components`, `payroll_components`, `payroll_records`, `payroll_record_items`, `performance_reviews`, `onboarding_checklists`, `onboarding_checklist_items`, `onboarding_tasks`, `recruitment_jobs`, `recruitment_candidates`

### Assets
`asset_categories`, `assets`, `asset_assignments`, `asset_depreciation`, `asset_maintenance`

### Stock
`stock_categories`, `stock_locations`, `stock_items`, `stock_movements`, `stock_adjustments`

### Knowledge Base
`kb_categories`, `kb_articles`, `kb_tags`, `kb_article_tags`, `kb_article_versions`

### Import / Export
`import_export_templates`, `import_export_jobs`, `import_export_logs`, `import_field_mappings`

---

## Key Database Functions

| Function | Purpose |
|---|---|
| `get_next_number(seq_name)` | Returns next formatted number (e.g., `CASE-0042`) |
| `generate_next_number(seq_name)` | Increments and returns next sequence value |
| `get_next_case_number()` | Case-specific number generator |
| `handle_new_user()` | Auth trigger: creates `profiles` row on signup |
| `is_admin()` | RLS helper: true if current user is admin |
| `is_staff_user()` | RLS helper: true for any staff role |
| `is_portal_user()` | RLS helper: true for portal customers |
| `get_my_role()` | Returns current user's role string |
| `get_dashboard_stats_v2()` | Aggregated dashboard statistics |
| `authenticate_portal_customer(email, password)` | Portal customer auth |
| `convert_proforma_to_tax_invoice(quote_id)` | Converts quote to invoice |
| `search_donor_drives(criteria)` | Inventory donor drive search |

---

## Edge Functions

Located in `supabase/functions/`:

| Function | Purpose |
|---|---|
| `send-document-email` | Sends PDFs/documents via email (SMTP) |
| `user-management` | Admin user creation/management |

- All edge functions use Deno runtime
- All must handle CORS with headers: `Content-Type, Authorization, X-Client-Info, Apikey`
- Import external packages with `npm:` prefix (e.g., `npm:@supabase/supabase-js`)
- Never share code between edge functions

---

## Migration Workflow

When making schema changes:

1. **Introspect first**: Use `mcp__supabase__list_tables` or `mcp__supabase__execute_sql` to understand the current live schema before writing any SQL.
2. **Write migration**: Use `mcp__supabase__apply_migration` with a timestamped filename (`YYYYMMDDHHMMSS_description`).
3. **Include in every migration**:
   - Detailed markdown comment header explaining what changed
   - `IF NOT EXISTS` / `IF EXISTS` guards on all DDL
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for any new table
   - RLS policies for any new table
4. **Regen types**: After migration, re-query `information_schema.columns` and regenerate `src/types/database.types.ts`.
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
  lib/
    supabaseClient.ts         # Singleton Supabase client (typed with Database)
    *Service.ts               # Domain service files (one per domain)
    pdf/                      # PDF generation utilities
  components/
    ui/                       # Base UI components (Button, Input, Modal, etc.)
    layout/                   # AppLayout, Sidebar, PortalLayout
    cases/                    # Case-specific components
    financial/                # Financial components
    ...                       # One subdirectory per domain
  pages/
    auth/                     # Login, Signup
    cases/                    # CasesList, CaseDetail
    financial/                # Invoices, Quotes, Banking, etc.
    portal/                   # Customer portal pages
    settings/                 # Settings pages
    ...                       # One subdirectory per domain
  types/
    database.types.ts         # GENERATED — do not hand-edit
    roles.ts                  # Role type definitions
    accountingLocale.ts       # Locale types
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

`customers` is a **compatibility view** over `customers_enhanced`. The canonical table is `customers_enhanced`. Always insert/update `customers_enhanced` directly. `customers` is read-only via the view.

---

## Number Sequences

Case numbers, invoice numbers, quote numbers, etc. are generated via:
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
- Do not install new npm packages without checking if the functionality exists in already-installed packages
- Do not use purple/indigo/violet color schemes in UI
- Do not add comments to code unless the logic is non-obvious
- Do not create new files unless necessary; prefer editing existing files
