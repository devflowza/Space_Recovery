# Platform Admin Setup Guide

## Quick Start

### Step 1: Find Your User ID

First, you need to find the UUID of the user account you want to make a platform admin.

**Option A: Via Supabase Dashboard**
1. Go to your Supabase project
2. Navigate to Authentication > Users
3. Find your user and copy their User UID

**Option B: Via SQL**
```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

### Step 2: Create Platform Admin Record

Run this SQL in the Supabase SQL Editor:

```sql
-- Replace YOUR_USER_ID with the actual UUID from Step 1
INSERT INTO platform_admins (user_id, email, full_name, is_active)
VALUES (
  'YOUR_USER_ID',      -- UUID from auth.users
  'admin@example.com', -- Your email
  'Platform Admin',    -- Your full name
  true
);
```

### Step 3: Verify Access

1. Log out and log back in (to refresh your session)
2. Navigate to: `http://localhost:5173/platform-admin`
3. You should see the Platform Dashboard

If you see a "403 Access Denied" page, double-check that:
- The user_id matches your auth.users ID
- The platform_admins record was inserted successfully
- You've logged out and back in to refresh your session

## Testing the Platform Admin Features

### 1. Dashboard
Navigate to `/platform-admin` to see:
- Total tenants, active tenants, MRR, ARR
- Total users and active users today
- MRR trend chart (last 30 days)
- Plan distribution chart
- At-risk tenants table

### 2. Tenants List
Navigate to `/platform-admin/tenants` to:
- View all tenants
- Filter by status, plan, or churn risk
- Search by company name or email
- Suspend or reactivate tenants
- View individual tenant details

### 3. Generate Test Health Metrics

To populate the dashboard with realistic data, calculate health scores for all tenants:

```sql
-- This will calculate and record health metrics for all active tenants
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN
    SELECT id FROM tenants WHERE status = 'active'
  LOOP
    -- Note: This calls a service function that would need to be implemented
    -- For now, insert sample data:
    INSERT INTO tenant_health_metrics (
      tenant_id,
      health_score,
      churn_risk,
      engagement_level,
      active_users_count,
      cases_created_last_30d,
      revenue_last_30d,
      support_tickets_open
    )
    VALUES (
      tenant_record.id,
      75 + (random() * 25)::int,  -- Score between 75-100
      'low',
      'high',
      1,
      5,
      1000.00,
      0
    );
  END LOOP;
END $$;
```

### 4. Generate Sample Platform Metrics

To populate the MRR trend chart:

```sql
-- Insert last 30 days of platform metrics
DO $$
DECLARE
  day_offset INTEGER;
  metric_day DATE;
BEGIN
  FOR day_offset IN 0..30 LOOP
    metric_day := CURRENT_DATE - day_offset;

    INSERT INTO platform_metrics (
      metric_date,
      total_tenants,
      active_tenants,
      trial_tenants,
      paying_tenants,
      total_users,
      active_users,
      mrr,
      arr,
      new_tenants,
      churned_tenants,
      open_tickets
    )
    VALUES (
      metric_day,
      5 + day_offset,
      4 + (day_offset % 3),
      2,
      3,
      20 + (day_offset * 2),
      15 + day_offset,
      5000 + (day_offset * 100),
      (5000 + (day_offset * 100)) * 12,
      CASE WHEN day_offset % 5 = 0 THEN 1 ELSE 0 END,
      CASE WHEN day_offset % 10 = 0 THEN 1 ELSE 0 END,
      2
    )
    ON CONFLICT (metric_date) DO NOTHING;
  END LOOP;
END $$;
```

## Managing Multiple Platform Admins

To add more platform admins:

```sql
INSERT INTO platform_admins (user_id, email, full_name, is_active)
SELECT
  u.id,
  u.email,
  p.full_name,
  true
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email IN (
  'admin1@example.com',
  'admin2@example.com'
);
```

To deactivate a platform admin:

```sql
UPDATE platform_admins
SET is_active = false
WHERE email = 'admin@example.com';
```

To reactivate:

```sql
UPDATE platform_admins
SET is_active = true
WHERE email = 'admin@example.com';
```

## Security Best Practices

1. **Limit Platform Admins**: Only create platform admin accounts for trusted personnel who need full platform visibility.

2. **Audit Regularly**: Check who has platform admin access:
   ```sql
   SELECT * FROM platform_admins WHERE is_active = true;
   ```

3. **Use Strong Passwords**: Platform admin accounts should have strong, unique passwords and ideally MFA enabled.

4. **Monitor Activity**: The `tenant_activity_log` table can track significant actions (to be implemented in Phase 3B).

5. **No Impersonation**: Platform admins should never impersonate tenants. Use screen sharing for support instead.

## Troubleshooting

### "Access Denied" Error

**Problem**: You see the 403 Access Denied page when trying to access `/platform-admin`.

**Solutions**:
1. Verify the platform_admins record exists:
   ```sql
   SELECT * FROM platform_admins WHERE user_id = 'YOUR_USER_ID';
   ```
2. Check that `is_active = true`
3. Log out and log back in to refresh your session
4. Check browser console for errors

### Dashboard Shows No Data

**Problem**: Dashboard loads but all metrics show 0 or charts are empty.

**Solutions**:
1. Check that you have tenants in the database:
   ```sql
   SELECT COUNT(*) FROM tenants;
   ```
2. Generate test data using the scripts above
3. Wait a few seconds for queries to complete (check Network tab in DevTools)

### Health Scores Not Showing

**Problem**: Tenants list shows "N/A" for health scores.

**Solution**: Health scores need to be calculated and recorded:
```sql
-- Insert sample health metrics (use the script from section 3 above)
```

## Next Steps

Once you have platform admin access working:

1. **Explore the Dashboard**: Review the metrics and charts
2. **Test Tenant Management**: Try filtering, searching, suspending tenants
3. **Plan for Production**: Decide who needs platform admin access
4. **Implement Phase 3B**: Add tenant detail page, support tickets, and announcements

## Support

If you encounter issues:
1. Check the implementation summary: `PHASE_3_IMPLEMENTATION_SUMMARY.md`
2. Review the database migration: `supabase/migrations/20260315140000_phase_3_platform_admin_infrastructure.sql`
3. Check RLS policies are correctly configured
4. Verify the `is_platform_admin()` function exists and works

## Production Deployment Checklist

Before deploying to production:

- [ ] Create platform admin accounts for appropriate personnel
- [ ] Test all platform admin routes and features
- [ ] Verify RLS policies block non-admin access
- [ ] Set up monitoring for platform admin activities
- [ ] Document platform admin procedures for your team
- [ ] Train platform admins on features and best practices
- [ ] Establish guidelines for when to suspend/reactivate tenants
- [ ] Plan health score calculation schedule (daily via Edge Function)
- [ ] Consider implementing remaining Phase 3B features (tickets, announcements)
