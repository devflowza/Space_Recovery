# Tenant Isolation Testing Guide

## Overview
This guide helps you verify that tenant isolation is working correctly after Phase 2A.

---

## Test Setup

### Step 1: Create Test Tenants

1. **Navigate to**: `http://localhost:5173/signup/tenant`

2. **Create Tenant A** (Data Recovery Lab Inc.):
   - Company Name: `Data Recovery Lab Inc.`
   - Email: `admin@tenant-a.test`
   - Password: `TestPass123!`
   - Plan: Professional

3. **Create Tenant B** (Forensics Solutions Ltd.):
   - Company Name: `Forensics Solutions Ltd.`
   - Email: `admin@tenant-b.test`
   - Password: `TestPass123!`
   - Plan: Professional

---

## Test Scenarios

### Test 1: Basic Data Isolation

**Objective**: Verify users can only see their own tenant's data

1. **Login as Tenant A** (`admin@tenant-a.test`)
2. **Create test data**:
   - Create a customer: "ACME Corp"
   - Create a case: "Case 001 - Hard Drive Recovery"
   - Create an invoice: "INV-001"

3. **Logout and login as Tenant B** (`admin@tenant-b.test`)
4. **Verify**:
   - ❌ Should NOT see "ACME Corp" customer
   - ❌ Should NOT see "Case 001" case
   - ❌ Should NOT see "INV-001" invoice

5. **Create Tenant B data**:
   - Create a customer: "TechStart Inc"
   - Create a case: "Case 002 - SSD Recovery"
   - Create an invoice: "INV-002"

6. **Logout and login as Tenant A**
7. **Verify**:
   - ✅ Should see "ACME Corp", "Case 001", "INV-001"
   - ❌ Should NOT see "TechStart Inc", "Case 002", "INV-002"

---

### Test 2: Cross-Module Isolation

**Objective**: Verify isolation across all major modules

**Test each module** (as both Tenant A and Tenant B):

| Module | Tenant A Data | Tenant B Data | Isolated? |
|--------|---------------|---------------|-----------|
| Cases | Create 2 cases | Create 2 cases | ✅ / ❌ |
| Customers | Create 2 customers | Create 2 customers | ✅ / ❌ |
| Invoices | Create 2 invoices | Create 2 invoices | ✅ / ❌ |
| Quotes | Create 2 quotes | Create 2 quotes | ✅ / ❌ |
| Inventory | Add 2 items | Add 2 items | ✅ / ❌ |
| Stock | Add 2 products | Add 2 products | ✅ / ❌ |
| Employees | Add 2 employees | Add 2 employees | ✅ / ❌ |
| Suppliers | Add 2 suppliers | Add 2 suppliers | ✅ / ❌ |

**Expected Result**: Each tenant should only see their own data in every module.

---

### Test 3: Database Level Isolation

**Objective**: Verify RLS is enforced at database level

**Run these SQL queries** (requires database access):

```sql
-- Set tenant context for Tenant A
SET LOCAL app.current_tenant_id = 'TENANT_A_UUID_HERE';

-- Try to query cases
SELECT count(*) FROM cases;
-- Should only return Tenant A's cases

-- Set tenant context for Tenant B
SET LOCAL app.current_tenant_id = 'TENANT_B_UUID_HERE';

-- Try to query cases
SELECT count(*) FROM cases;
-- Should only return Tenant B's cases

-- Try direct query without tenant context
SELECT count(*) FROM cases;
-- Should return 0 (RLS blocks access)
```

---

### Test 4: Platform Admin Access

**Objective**: Verify platform admin can see all tenants

1. **Create platform admin user**:
   ```sql
   -- In Supabase SQL Editor
   UPDATE profiles
   SET role = 'platform_admin'
   WHERE email = 'superadmin@xsuite.space';
   ```

2. **Login as platform admin**
3. **Navigate to**: `/admin/tenants`
4. **Verify**:
   - ✅ Should see both Tenant A and Tenant B
   - ✅ Can view data from both tenants
   - ✅ Can switch between tenants

---

### Test 5: Related Data Isolation

**Objective**: Verify cascading isolation (parent-child relationships)

**Test with Tenant A**:
1. Create a case: "Case A-001"
2. Add devices to the case
3. Add communications to the case
4. Create a quote for the case
5. Create an invoice from the quote

**Login as Tenant B**:
- ❌ Should NOT see Case A-001
- ❌ Should NOT see devices from Case A-001
- ❌ Should NOT see communications from Case A-001
- ❌ Should NOT see quote for Case A-001
- ❌ Should NOT see invoice for Case A-001

---

### Test 6: User Management Isolation

**Objective**: Verify user management is tenant-scoped

**As Tenant A admin**:
1. Create user: `user1@tenant-a.test`
2. Assign role: Technician
3. Navigate to User Management

**As Tenant B admin**:
1. Navigate to User Management
2. **Verify**:
   - ❌ Should NOT see `user1@tenant-a.test`
   - ✅ Should only see Tenant B users

---

### Test 7: Financial Data Isolation

**Objective**: Verify financial data is completely isolated

**Test Categories**:
- ✅ Invoices (Tenant A cannot see Tenant B invoices)
- ✅ Payments (Tenant A cannot see Tenant B payments)
- ✅ Expenses (Tenant A cannot see Tenant B expenses)
- ✅ Bank accounts (Tenant A cannot see Tenant B accounts)
- ✅ VAT records (Tenant A cannot see Tenant B VAT)

---

### Test 8: Stock & Inventory Isolation

**Objective**: Verify stock management is tenant-scoped

**As Tenant A**:
1. Add stock item: "Seagate 2TB HDD"
2. Record stock sale
3. Create stock transfer

**As Tenant B**:
- ❌ Should NOT see "Seagate 2TB HDD"
- ❌ Should NOT see Tenant A's stock sales
- ❌ Should NOT see Tenant A's stock transfers

---

### Test 9: HR & Payroll Isolation

**Objective**: Verify HR data is completely private

**As Tenant A**:
1. Add employee: "John Doe"
2. Record attendance
3. Process payroll

**As Tenant B**:
- ❌ Should NOT see "John Doe" employee
- ❌ Should NOT see Tenant A attendance
- ❌ Should NOT see Tenant A payroll

---

### Test 10: Settings & Configuration Isolation

**Objective**: Verify tenant-specific settings

**Test**:
- ✅ Number sequences (each tenant has own sequence)
- ✅ Tax rates (tenant-specific rates)
- ✅ Company settings (isolated)
- ✅ Accounting locales (tenant-specific)

---

## Browser DevTools Verification

### Check localStorage:
```javascript
// Open browser console
localStorage.getItem('tenant_id')
// Should return current user's tenant_id
```

### Check Network Requests:
1. Open DevTools → Network
2. Filter by "supabase"
3. Click any request
4. Check response data
5. **Verify**: All returned data belongs to current tenant

---

## SQL Verification Queries

Run these in Supabase SQL Editor:

```sql
-- 1. Count tables with tenant_id
SELECT COUNT(DISTINCT table_name) as tenant_id_tables_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'tenant_id';
-- Expected: 144

-- 2. Count RLS policies
SELECT
  COUNT(*) as total_policies,
  COUNT(DISTINCT tablename) as tables_with_policies
FROM pg_policies
WHERE schemaname = 'public';
-- Expected: 1142 policies across 198 tables

-- 3. Verify RLS is enabled on tenant tables
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE column_name = 'tenant_id'
  )
ORDER BY tablename;
-- All should have rls_enabled = true

-- 4. Check tenant-specific data count
SELECT
  t.tenant_name,
  (SELECT COUNT(*) FROM cases WHERE tenant_id = t.id) as cases,
  (SELECT COUNT(*) FROM customers_enhanced WHERE tenant_id = t.id) as customers,
  (SELECT COUNT(*) FROM invoices WHERE tenant_id = t.id) as invoices
FROM tenants t;
```

---

## Expected Results Summary

| Test | Expected Outcome |
|------|------------------|
| Test 1 | Data completely isolated between tenants |
| Test 2 | All modules respect tenant boundaries |
| Test 3 | RLS enforced at database level |
| Test 4 | Platform admin has cross-tenant access |
| Test 5 | Parent-child relationships respect isolation |
| Test 6 | User management is tenant-scoped |
| Test 7 | Financial data is completely private |
| Test 8 | Stock/inventory is tenant-specific |
| Test 9 | HR/payroll data is isolated |
| Test 10 | Settings are tenant-specific |

---

## Troubleshooting

### If data leaks between tenants:

1. **Check tenant_id in localStorage**:
   ```javascript
   localStorage.getItem('tenant_id')
   ```

2. **Verify RLS policies exist**:
   ```sql
   SELECT * FROM pg_policies
   WHERE schemaname = 'public'
   AND tablename = 'TABLE_NAME_HERE';
   ```

3. **Check if RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename = 'TABLE_NAME_HERE';
   ```

4. **Verify tenant_id is set on records**:
   ```sql
   SELECT id, tenant_id FROM TABLE_NAME_HERE LIMIT 10;
   ```

---

## Sign-Off Checklist

Before proceeding to Phase 2B, confirm:

- [ ] Created 2 test tenants successfully
- [ ] Test 1 (Basic Isolation) passed
- [ ] Test 2 (Cross-Module) passed for all modules
- [ ] Test 3 (Database Level) verified via SQL
- [ ] Test 4 (Platform Admin) verified
- [ ] Test 5 (Related Data) verified
- [ ] Test 6 (User Management) verified
- [ ] Test 7 (Financial) verified
- [ ] Test 8 (Stock) verified
- [ ] Test 9 (HR) verified
- [ ] Test 10 (Settings) verified
- [ ] No data leaks detected
- [ ] All SQL verification queries passed

**Once all tests pass, Phase 2A is confirmed secure and ready for Phase 2B!** ✅

---

**Testing Date**: _____________

**Tested By**: _____________

**Result**: ✅ PASS / ❌ FAIL

**Notes**:
