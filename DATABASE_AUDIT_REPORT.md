# Database Schema Audit: Multi-Tenancy Architecture Analysis

**Date**: 2026-03-19
**Project**: xSuite (Supabase Project: `ssmbegiyjivrcwgcqutu`)
**Total Tables**: ~200 base tables in `public` schema

---

## 1. Table Naming Convention Analysis

### Case Style
- **All tables use `snake_case`** consistently (e.g., `case_devices`, `inventory_items`, `chain_of_custody_access_log`)
- **All columns use `snake_case`** (e.g., `created_at`, `deleted_at`, `tenant_id`)

### Singular vs Plural
- **Predominantly plural** (e.g., `cases`, `profiles`, `invoices`, `expenses`)
- **Exceptions (singular)**: `chain_of_custody`, `seed_status`, `onboarding_progress` — these represent single-record or conceptual entities and are acceptable

### Prefix/Suffix Patterns
| Pattern | Examples |
|---|---|
| Domain grouping | `case_*` (15 tables), `inventory_*` (12 tables), `stock_*` (12 tables), `supplier_*` (8 tables) |
| Lifecycle/audit suffix | `*_audit_trail`, `*_history`, `*_log` |
| Junction tables | `*_assignments`, `*_allocations`, `*_relationships` |
| Platform-level prefix | `platform_*` (admins, announcements, metrics) |
| Tenant-level prefix | `tenant_*` (subscriptions, payment_methods, activity_log, health_metrics) |
| Billing prefix | `billing_*` (coupons, events, invoices, invoice_items) |

### Inconsistencies Found
1. **`chain_of_custody`** is singular while related tables are descriptive (`chain_of_custody_access_log`, `chain_of_custody_transfers`)
2. **`donor_compatibility_matrix`** is singular
3. **Mixed audit patterns**: `audit_trails`, `supplier_audit_trail`, `financial_audit_logs`, `tenant_activity_log` — inconsistent suffixes for similar concepts
4. **`signup_otps`** — abbreviation in table name (minor)

---

## 2. Tenant Management Architecture

### Primary Tenant Table: `tenants`

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `name` | text | NO | — | Tenant display name |
| `slug` | text | NO | — | URL-safe identifier |
| `status` | text | NO | `'trial'` | Lifecycle status |
| `plan_id` | uuid | YES | — | FK to subscription_plans |
| `trial_ends_at` | timestamptz | YES | `now() + 14 days` | Trial expiration |
| `subscription_id` | text | YES | — | External subscription ref |
| `subscription_status` | text | YES | — | Payment status |
| `settings` | jsonb | YES | `'{}'` | Tenant-level configuration |
| `limits` | jsonb | YES | `'{}'` | Usage limits |
| `metadata` | jsonb | YES | `'{}'` | Extensible metadata |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update |
| `deleted_at` | timestamptz | YES | — | Soft delete |

### Tenant Identification
- **UUID-based** (`gen_random_uuid()`)
- Tenant context resolved via `get_current_tenant_id()` function:
  ```sql
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
  ```

### Tenant Lifecycle
- Status defaults to `'trial'` with 14-day trial period
- Subscription managed via `tenant_subscriptions` table
- PayPal integration for billing (`paypal_subscription_id`, `paypal_plan_id`)

### Tenant-Related Tables
| Table | Purpose |
|---|---|
| `tenant_subscriptions` | Subscription state, billing interval, PayPal integration |
| `tenant_payment_methods` | PayPal/card payment methods per tenant |
| `tenant_activity_log` | Audit log of significant tenant activities |
| `tenant_health_metrics` | Daily health snapshots for churn prediction |
| `subscription_plans` | Available plans with pricing and limits |
| `plan_features` | Feature flags per plan |
| `billing_invoices` | Platform billing invoices |
| `billing_events` | PayPal webhook events |
| `billing_coupons` | Discount codes |
| `coupon_redemptions` | Coupon usage tracking |
| `usage_records` | Metered usage per tenant |
| `usage_snapshots` | Periodic usage snapshots |
| `onboarding_progress` | Tenant onboarding wizard state |

### Tables WITH `tenant_id` Column (148 tables)
All core business tables have `tenant_id uuid` as a FK to `tenants.id`. This includes all case, financial, HR, inventory, supplier, customer, and operational tables.

### Tables WITHOUT `tenant_id` (65 tables — by design)
These fall into categories:

**Global/Shared Master Data** (correct — no tenant_id needed):
- Geography: `countries`, `cities`, `industries`, `currency_codes`
- Device catalogs: `brands`, `capacities`, `device_types`, `device_encryption`, `device_form_factors`, `device_head_no`, `device_interfaces`, `device_made_in`, `device_platter_no`, `device_roles`, `device_conditions`, `device_component_statuses`, `interfaces`, `accessories`
- Status/type lookups: `case_priorities`, `case_statuses`, `invoice_statuses`, `quote_statuses`, `purchase_order_statuses`, `leave_types`
- Templates: `template_categories`, `template_types`, `template_variables`, `case_report_templates`, `report_section_library`, `report_section_presets`, `report_template_section_mappings`
- System config: `settings`, `seed_status`, `modules`, `role_module_permissions`, `payroll_components`

**Platform-Level Tables** (correct — managed by super admins):
- `platform_admins`, `platform_announcements`, `platform_metrics`
- `subscription_plans`, `plan_features`, `billing_coupons`
- `announcement_dismissals`, `signup_otps`

**Potential Gaps** (should potentially have `tenant_id`):
- `expense_categories` — if tenants can customize expense categories
- `inventory_categories`, `inventory_condition_types`, `inventory_item_categories`, `inventory_status_types` — if tenants can customize inventory taxonomies
- `service_catalog_categories`, `service_line_items_catalog`, `service_locations`, `service_problems`, `service_types` — if tenants can customize service offerings
- `supplier_categories`, `supplier_payment_terms` — if tenants have different supplier taxonomies
- `payment_methods` — if tenants define custom payment methods
- `transaction_categories` — if tenants customize categories
- `leave_balances` — contains employee-specific data, should have tenant_id
- `number_sequences_audit` — audit trail should be tenant-scoped
- `database_backups` — should be tenant-scoped
- `support_ticket_messages` — has no tenant_id (parent `support_tickets` does, but messages table lacks it)
- `billing_invoice_items` — has no tenant_id (parent `billing_invoices` does)

---

## 3. Super Admin Infrastructure

### Platform Admins Table: `platform_admins`

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to auth.users |
| `email` | text | Admin email |
| `full_name` | text | Display name |
| `is_active` | boolean | Active flag |
| `created_at` | timestamptz | When created |
| `created_by` | uuid | Who created this admin |

### How Super Admins Are Identified

**Primary mechanism**: `is_platform_admin()` function:
```sql
SELECT EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid()
  AND role = 'admin'
  AND tenant_id IS NULL  -- Key differentiator
);
```

Platform admins are identified by having `role = 'admin'` AND `tenant_id IS NULL` in the `profiles` table. This distinguishes them from tenant-level admins who have `role = 'admin'` with a non-null `tenant_id`.

### Admin Helper Functions
| Function | Logic |
|---|---|
| `is_admin()` | `profiles.role = 'admin'` (does NOT distinguish platform vs tenant admin) |
| `is_admin_user()` | Same as `is_admin()` but also checks `is_active = true` |
| `is_platform_admin()` | `role = 'admin' AND tenant_id IS NULL` |
| `is_hr_or_admin()` | `role IN ('admin', 'hr')` |

### Security Concern
`is_admin()` does NOT check `tenant_id`, meaning a tenant admin could potentially be treated as a platform admin in policies that use `is_admin()` instead of `is_platform_admin()`. Policies should use `is_platform_admin()` for platform-level operations.

---

## 4. Roles & Permissions System

### Role Definition
Roles are stored as **text values** in `profiles.role`. There is no separate roles table — roles are implicitly defined.

**Known roles** (from function definitions):
- `admin` — Full access (tenant admin or platform admin based on tenant_id)
- `technician` — Technical staff
- `sales` — Sales staff
- `accounts` — Accounting staff
- `hr` — Human resources

### Permission Assignment: `role_module_permissions`

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid | PK |
| `role` | text | Role name string |
| `module_id` | uuid | FK to modules |
| `can_access` | boolean | Access flag (default true) |

This is a **flat role-module matrix** — no hierarchy, no granular CRUD permissions per module.

### Role Helper Functions
| Function | Returns | Logic |
|---|---|---|
| `get_my_role()` | text | `profiles.role` for current user |
| `get_user_role()` | text | Same, with COALESCE to 'none' |
| `is_admin()` | boolean | role = 'admin' |
| `is_staff_user()` | boolean | role IN ('admin', 'technician', 'sales', 'accounts') AND is_active |
| `is_portal_user()` | boolean | Checks JWT for portal_token claim |
| `is_hr_or_admin()` | boolean | role IN ('admin', 'hr') |
| `get_user_case_access_level()` | text | Returns `case_access_level` from profiles |

### Role Hierarchy
There is **no explicit hierarchy**. The implicit hierarchy based on function definitions:
1. **Platform Admin**: `role = 'admin'` + `tenant_id IS NULL`
2. **Tenant Admin**: `role = 'admin'` + `tenant_id IS NOT NULL`
3. **Staff**: `admin`, `technician`, `sales`, `accounts` (checked by `is_staff_user()`)
4. **HR**: Separate check via `is_hr_or_admin()`
5. **Portal Users**: Customer portal access (JWT-based, not role-based)

### User-Role-Tenant Relationship
```
auth.users (1) → profiles (1) → tenants (N:1)
                    ↓
              role (text field)
              tenant_id (uuid FK)
```
Each user has exactly one role and belongs to at most one tenant.

---

## 5. Tenant Isolation Implementation

### RLS Status
- **ALL 200 tables have RLS enabled** — no tables without RLS
- **2 tables have RLS enabled but NO policies**: `service_catalog_categories`, `service_line_items_catalog` — these are completely locked out (no access possible)

### RLS Policy Patterns

**Pattern 1: Tenant-scoped via `get_current_tenant_id()`** (~100 tables)
```sql
-- SELECT
USING (tenant_id = get_current_tenant_id())
-- INSERT
WITH CHECK (tenant_id = get_current_tenant_id())
```
Used on: Most core business tables (cases, invoices, customers, employees, etc.)

**Pattern 2: User-scoped via `auth.uid()`** (~50 tables)
```sql
USING (user_id = auth.uid())
-- or
USING (created_by = auth.uid())
```
Used on: User preferences, activity logs, some older tables

**Pattern 3: Open read via `USING(true)`** (~90 policies)
```sql
USING (true)  -- Any authenticated user can read
```
Used on: Lookup tables, master data, status tables

**Pattern 4: Role-gated**
```sql
USING (is_admin())
-- or
USING (is_staff_user())
```
Used on: Cases (staff/admin check), sensitive operations

### CRITICAL SECURITY FINDINGS: `USING(true)` Policies

**Over 150 policies use `USING(true)` or `WITH CHECK(true)`**. While acceptable for global lookup tables (brands, countries, device_types), many tenant-scoped tables have overly permissive policies:

#### HIGH RISK — Tenant-Scoped Tables with `USING(true)` SELECT
These tables HAVE `tenant_id` but allow ANY authenticated user to read ALL rows across ALL tenants:

| Table | Has tenant_id | USING(true) on SELECT | Risk |
|---|---|---|---|
| `asset_assignments` | YES | YES | Cross-tenant data leak |
| `asset_categories` | YES | YES | Cross-tenant data leak |
| `asset_depreciation` | YES | YES | Cross-tenant data leak |
| `asset_maintenance` | YES | YES | Cross-tenant data leak |
| `assets` | YES | YES | Cross-tenant data leak |
| `branches` | YES | YES | Cross-tenant data leak |
| `chain_of_custody` | YES | YES | **CRITICAL** — sensitive forensic data |
| `chain_of_custody_access_log` | YES | YES | **CRITICAL** — audit trail exposed |
| `chain_of_custody_integrity_checks` | YES | YES | **CRITICAL** |
| `chain_of_custody_transfers` | YES | YES | **CRITICAL** |
| `clone_drives` | YES | YES | Cross-tenant data leak |
| `company_documents` | YES | YES | Cross-tenant data leak |
| `company_settings` | YES | YES | Cross-tenant config leak |
| `departments` | YES | YES | Cross-tenant data leak |
| `document_templates` | YES | YES | Cross-tenant data leak |
| `inventory_*` (multiple) | YES | YES | Cross-tenant data leak |
| `purchase_orders` | YES | YES | Financial data leak |
| `purchase_order_items` | YES | YES | Financial data leak |
| `stock_*` (multiple) | YES | YES | Cross-tenant data leak |
| `supplier_*` (multiple) | YES | YES | Cross-tenant data leak |

#### HIGH RISK — `WITH CHECK(true)` on INSERT/UPDATE
These allow ANY authenticated user to insert/update rows in ANY tenant's data:

| Table | Operations with true | Risk |
|---|---|---|
| `clone_drives` | INSERT(true), UPDATE(true) | Data tampering |
| `chain_of_custody` | INSERT(true) | **CRITICAL** — evidence chain tampering |
| `chain_of_custody_integrity_checks` | INSERT(true) | **CRITICAL** |
| `chain_of_custody_transfers` | INSERT(true) | **CRITICAL** |
| `inventory_items` | INSERT(true), UPDATE(true) | Data tampering |
| `inventory_assignments` | INSERT(true), UPDATE(true) | Data tampering |
| `supplier_*` | Full CRUD with true | Data tampering |
| `purchase_orders` | Full CRUD with true | Financial tampering |

#### ANON ACCESS
- `company_settings` has `USING(true)` for `anon` role — allows unauthenticated users to read company settings

#### PUBLIC ROLE ACCESS
- `usage_records` and `usage_snapshots` have `INSERT WITH CHECK(true)` for `public` role — allows unauthenticated inserts

### Dual Policy Pattern Issue
Many tables have BOTH tenant-scoped policies AND `USING(true)` policies. Since Supabase uses **permissive OR** logic by default, the `USING(true)` policy overrides the tenant-scoped one, making the tenant check useless.

Example on `accounting_locales`:
- Policy A: `USING(tenant_id = get_current_tenant_id())` (tenant-scoped)
- Policy B: `USING(true)` (open read)
- **Result**: Policy B wins, all data visible to any authenticated user

### Tenant Context Mechanism
```sql
-- Primary function
CREATE FUNCTION get_current_tenant_id() RETURNS uuid AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$;
```
This is a `SECURITY DEFINER` function that looks up the current user's tenant from their profile. It's used in ~100 RLS policies.

---

## 6. Recommendations

### P0 — Critical Security Fixes

1. **Remove all `USING(true)` policies on tenant-scoped tables**
   - Every table with `tenant_id` should use `USING(tenant_id = get_current_tenant_id())` for SELECT
   - Every table with `tenant_id` should use `WITH CHECK(tenant_id = get_current_tenant_id())` for INSERT/UPDATE
   - Affected: ~50+ tables with cross-tenant data exposure

2. **Fix dual-policy conflicts**
   - When a table has both `USING(true)` and `USING(tenant_id = ...)`, remove the `USING(true)` policy
   - Supabase permissive policies use OR logic, so the open policy always wins

3. **Remove `public` role INSERT on `usage_records` and `usage_snapshots`**
   - These allow unauthenticated data insertion
   - Should be restricted to `service_role` or authenticated with tenant check

4. **Fix `company_settings` anon access**
   - Remove `anon` SELECT policy or restrict to specific non-sensitive columns
   - Currently exposes all tenant company settings to unauthenticated users

5. **Distinguish `is_admin()` vs `is_platform_admin()`**
   - Many policies use `is_admin()` which does NOT check `tenant_id IS NULL`
   - Platform-level operations should use `is_platform_admin()`

### P1 — Important Improvements

6. **Add policies to locked-out tables**
   - `service_catalog_categories` and `service_line_items_catalog` have RLS enabled but NO policies
   - These are completely inaccessible — add appropriate read policies

7. **Add `tenant_id` to missing tables**
   - `leave_balances` — employee-specific, needs tenant scope
   - `support_ticket_messages` — should inherit from parent ticket or have own tenant_id
   - `number_sequences_audit` — audit trail should be tenant-scoped
   - `database_backups` — should be tenant-scoped

8. **Deduplicate redundant policies**
   - Many tables have 2-3 identical SELECT policies (e.g., `case_priorities` has 3 SELECT USING(true) policies)
   - Clean up to reduce confusion and maintenance burden

### P2 — Naming Convention Fixes

9. **Standardize audit table naming**
   - Current: `audit_trails`, `supplier_audit_trail`, `financial_audit_logs`, `tenant_activity_log`
   - Proposed: Use consistent `*_audit_log` suffix

10. **Singular table names**
    - `chain_of_custody` → consider `chain_of_custody_entries`
    - `onboarding_progress` → consider `onboarding_progress_records`

### P3 — Architecture Improvements

11. **Add NOT NULL constraint to `tenant_id`**
    - Most `tenant_id` columns are nullable (`is_nullable: YES`)
    - For tenant-scoped tables, `tenant_id` should be NOT NULL with a default of `get_current_tenant_id()`
    - This prevents orphaned rows without tenant association

12. **Add composite indexes on `(tenant_id, id)` for frequently queried tables**
    - Improves RLS policy performance since every query filters by `tenant_id`

13. **Consider RESTRICTIVE policies for tenant check**
    - Instead of permissive policies, use a single RESTRICTIVE policy for tenant isolation
    - This ensures tenant check is always enforced regardless of other permissive policies

14. **Formalize role definitions**
    - Create a `roles` table instead of using text strings
    - Add a `role_hierarchy` table for explicit permission inheritance
    - This prevents typos and allows runtime role management

---

## Summary Statistics

| Metric | Count |
|---|---|
| Total base tables | ~200 |
| Tables with `tenant_id` | 148 |
| Tables without `tenant_id` | 65 |
| Tables with RLS enabled | 200 (100%) |
| Tables with RLS but no policies | 2 |
| Total RLS policies | ~900+ |
| Policies using `get_current_tenant_id()` | ~300 |
| Policies using `auth.uid()` | ~200 |
| Policies using `USING(true)` | ~150+ |
| Policies using `is_admin()` | ~30 |
| Policies using `is_staff_user()` | ~20 |
| Platform admin functions | 1 (`is_platform_admin()`) |
| Role helper functions | 7 |
