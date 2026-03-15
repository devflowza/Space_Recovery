/*
  # Add PayPal Integration Columns

  This migration adds PayPal-specific columns to support subscription billing integration.

  ## Changes

  1. **subscription_plans table**
     - Add `paypal_product_id` - PayPal Product ID reference
     - Add `paypal_plan_monthly_id` - PayPal Plan ID for monthly billing
     - Add `paypal_plan_yearly_id` - PayPal Plan ID for yearly billing

  2. **tenant_subscriptions table**
     - Add `paypal_subscription_id` - PayPal Subscription ID with UNIQUE constraint
     - Add `paypal_payer_id` - PayPal customer/payer ID for tracking

  3. **billing_events table**
     - Add `paypal_event_id` - PayPal webhook event ID with UNIQUE constraint

  4. **billing_invoices table**
     - Add `paypal_transaction_id` - PayPal transaction/sale ID for payment correlation

  5. **Indexes**
     - Create index on `paypal_subscription_id` for fast lookups
     - Create index on `paypal_event_id` for fast webhook processing

  ## Notes
  - All PayPal ID columns are nullable to support manual/non-PayPal subscriptions
  - UNIQUE constraints prevent duplicate webhook processing
  - Indexes improve performance for webhook event lookups
*/

-- Add PayPal columns to subscription_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'paypal_product_id'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN paypal_product_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'paypal_plan_monthly_id'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN paypal_plan_monthly_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'paypal_plan_yearly_id'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN paypal_plan_yearly_id text;
  END IF;
END $$;

-- Add PayPal columns to tenant_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_subscriptions' AND column_name = 'paypal_subscription_id'
  ) THEN
    ALTER TABLE tenant_subscriptions ADD COLUMN paypal_subscription_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_subscriptions' AND column_name = 'paypal_payer_id'
  ) THEN
    ALTER TABLE tenant_subscriptions ADD COLUMN paypal_payer_id text;
  END IF;
END $$;

-- Add UNIQUE constraint on paypal_subscription_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_subscriptions_paypal_subscription_id_key'
  ) THEN
    ALTER TABLE tenant_subscriptions 
    ADD CONSTRAINT tenant_subscriptions_paypal_subscription_id_key 
    UNIQUE (paypal_subscription_id);
  END IF;
END $$;

-- Add PayPal columns to billing_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_events' AND column_name = 'paypal_event_id'
  ) THEN
    ALTER TABLE billing_events ADD COLUMN paypal_event_id text;
  END IF;
END $$;

-- Add UNIQUE constraint on paypal_event_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'billing_events_paypal_event_id_key'
  ) THEN
    ALTER TABLE billing_events 
    ADD CONSTRAINT billing_events_paypal_event_id_key 
    UNIQUE (paypal_event_id);
  END IF;
END $$;

-- Add PayPal columns to billing_invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_invoices' AND column_name = 'paypal_transaction_id'
  ) THEN
    ALTER TABLE billing_invoices ADD COLUMN paypal_transaction_id text;
  END IF;
END $$;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_paypal_subscription_id 
  ON tenant_subscriptions(paypal_subscription_id) 
  WHERE paypal_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_events_paypal_event_id 
  ON billing_events(paypal_event_id) 
  WHERE paypal_event_id IS NOT NULL;
