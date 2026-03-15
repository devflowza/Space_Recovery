# Phase 2B: Billing Infrastructure - Progress Report

## Completed (Phase 1 of 2)

### 1. Database Schema ✅
- Created 10 new billing tables with full RLS policies
- Tables created:
  - `tenant_subscriptions` - Main subscription tracking with PayPal sync
  - `billing_invoices` - Invoice records for subscription payments
  - `billing_invoice_items` - Line items for each invoice
  - `usage_records` - Usage tracking for metered billing
  - `usage_snapshots` - Daily/hourly usage snapshots for analytics
  - `tenant_payment_methods` - Payment method details
  - `billing_events` - Webhook event log for audit and replay
  - `billing_coupons` - Promotional codes and discounts
  - `coupon_redemptions` - Track coupon usage by tenants
  - `plan_features` - Feature flags per subscription plan

- Updated `subscription_plans` table with PayPal columns
- Added `billing_invoice` scope to number_sequences
- Created 30+ RLS policies for tenant isolation
- All tables have soft delete support (deleted_at column)

### 2. Plan Features Seeded ✅
- Starter Plan: 7 features (5 users, 50 cases/month, 10GB storage)
- Professional Plan: 12 features (20 users, 200 cases/month, 50GB storage)
- Enterprise Plan: 17 features (unlimited users, unlimited cases, unlimited storage)
- Features include limits, Arabic translations, and highlighted premium features

### 3. Billing Service Layer ✅
- Created `/src/lib/billingService.ts` with full type safety
- 25+ functions for billing operations:
  - Subscription management (get, create, change, cancel, reactivate)
  - Plan and feature retrieval
  - PayPal integration (checkout, webhook handling)
  - Invoice management (list, get, download)
  - Payment method management
  - Usage tracking and limit enforcement
  - Feature access checking
  - Coupon validation and application
  - Platform admin billing stats
  - Utility functions (formatPrice, status colors, etc.)

### 4. Query Keys ✅
- Added `billingKeys` to `/src/lib/queryKeys.ts`
- Keys for subscription, plans, features, invoices, usage, payment methods, stats
- Follows existing project patterns

### 5. Usage Tracking Function ✅
- Created `get_tenant_storage_bytes()` database function
- Calculates storage usage from case_attachments table
- Used by billingService for storage limit enforcement

## Remaining Work (Phase 2 of 2)

### 6. PayPal Edge Functions (Next)
- `paypal-create-subscription` - Generate PayPal subscription for plan selection
- `paypal-webhook` - Process PayPal webhook events
- `paypal-manage-subscription` - Handle plan changes, cancellations, reactivations

### 7. Frontend - Billing Settings Page
- Full subscription management dashboard
- Usage metrics with progress bars and warnings
- Payment method display
- Invoice history with download
- Subscription actions (upgrade, cancel, etc.)
- Coupon code input

### 8. Frontend - Plans Selection Page
- Three-column plan comparison
- Monthly vs yearly toggle with 20% discount
- Feature lists with limits
- "Get Started" buttons triggering PayPal flow
- Responsive design

### 9. Routing Integration
- Add billing routes to App.tsx
- `/settings/billing` - Main billing page
- `/settings/plans` - Plan selection
- `/settings/billing/success` - Post-payment success
- `/settings/billing/cancelled` - User cancelled payment

### 10. Build Verification
- Run `npm run build` to ensure no TypeScript errors
- Verify all imports resolve correctly
- Check for any missing dependencies

## Architecture Notes

### PayPal Integration Strategy
- Client-side: PayPal JavaScript SDK for button rendering
- Server-side: Edge Functions for subscription creation and webhook processing
- Webhook events stored in `billing_events` table for replay capability
- Subscription state synced to `tenant_subscriptions` table

### Trial Management
- 14-day trial period configured in `subscription_plans.trial_days`
- Trial dates tracked in `tenant_subscriptions.trial_start` and `trial_end`
- `trial_used` flag prevents trial abuse
- Trial expiration logic will be in frontend (warning modals, access restrictions)

### Usage Limits
- Limits defined in `plan_features` table per plan
- Real-time usage calculated in `billingService.getCurrentUsage()`
- Limit enforcement happens before actions (user creation, case creation, file upload)
- 90% threshold triggers warning modals
- 100% threshold blocks actions with upgrade prompt

### Feature Flags
- Features defined in `plan_features` table
- `hasFeatureAccess()` function checks if tenant has access to a feature
- Feature keys typed in TypeScript (`FeatureKey` type)
- Used throughout app to gate premium features

## Database Statistics
- 10 new tables created
- 30+ RLS policies added
- 144 total tables in system (from Phase 2A)
- 1,142+ total RLS policies (Phase 2A baseline)
- All billing tables have tenant isolation via RLS

## Next Steps
1. Create PayPal Edge Functions for subscription flow
2. Build BillingPage.tsx component
3. Build PlansPage.tsx component
4. Add routes and navigation
5. Test end-to-end PayPal flow
6. Run build and verify

## Environment Variables Needed
```
PAYPAL_CLIENT_ID=<from PayPal Developer Dashboard>
PAYPAL_CLIENT_SECRET=<from PayPal Developer Dashboard>
PAYPAL_WEBHOOK_ID=<from PayPal Webhook settings>
PAYPAL_MODE=sandbox
VITE_PAYPAL_CLIENT_ID=<from PayPal Developer Dashboard>
```

Note: These will be added after frontend is complete and ready for PayPal integration testing.
