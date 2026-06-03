-- Persist the Quote/Invoice "document" fields the edit forms collect but the
-- schema could not store — eliminating edit-time data loss for Title, Client
-- Reference, Discount Type (a financial-correctness fix: a % discount no longer
-- silently reloads as fixed) and the quote Bank Account. Additive +
-- nullable/defaulted; existing rows backfill safely (discount_type -> 'fixed',
-- matching the prior implicit behavior).

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS client_reference text,
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS client_reference text,
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'fixed';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_discount_type_check') THEN
    ALTER TABLE public.quotes ADD CONSTRAINT quotes_discount_type_check
      CHECK (discount_type IN ('fixed','percentage','amount'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_discount_type_check') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_discount_type_check
      CHECK (discount_type IN ('fixed','percentage','amount'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quotes_bank_account_id
  ON public.quotes(bank_account_id) WHERE deleted_at IS NULL;
