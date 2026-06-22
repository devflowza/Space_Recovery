-- EXP-062: Guarantee amount_base / tax_amount_base are populated on expense write
-- paths that don't compute them (import, raw SQL, legacy backfill). The form path
-- (createExpense/updateExpense) already passes them, so this fills ONLY when NULL —
-- a no-op there. Mirrors convertToBase = round(amount*rate, base.decimals).
-- NOTE: fills on INSERT and for NULL-base rows; it does NOT recompute base on an
-- UPDATE that mutates amount while amount_base is already non-NULL (don't over-trust
-- the net on the UPDATE path — that's the EXP-031 route-through-RPC concern).
CREATE OR REPLACE FUNCTION public.set_expenses_base_amounts()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_base text;
  v_dec  integer;
  v_rate numeric;
BEGIN
  -- tenant_id is set by set_expenses_tenant_and_audit (fires first; this trigger is
  -- named zz_* so it sorts last among BEFORE row triggers).
  v_base := public._fin_base_currency(NEW.tenant_id);
  v_dec  := public._fin_currency_decimals(v_base);
  v_rate := COALESCE(NEW.exchange_rate, 1);

  IF NEW.amount_base IS NULL THEN
    NEW.amount_base := round(COALESCE(NEW.amount, 0) * v_rate, v_dec);
  END IF;
  IF NEW.tax_amount_base IS NULL THEN
    NEW.tax_amount_base := round(COALESCE(NEW.tax_amount, 0) * v_rate, v_dec);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_expenses_base_amounts() FROM public;

DROP TRIGGER IF EXISTS zz_set_expenses_base_amounts ON public.expenses;
CREATE TRIGGER zz_set_expenses_base_amounts
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_expenses_base_amounts();

-- One-time additive backfill of any pre-existing NULL-base rows (no hard delete).
UPDATE public.expenses e
SET amount_base = round(COALESCE(e.amount,0) * COALESCE(e.exchange_rate,1),
                        public._fin_currency_decimals(public._fin_base_currency(e.tenant_id))),
    tax_amount_base = round(COALESCE(e.tax_amount,0) * COALESCE(e.exchange_rate,1),
                        public._fin_currency_decimals(public._fin_base_currency(e.tenant_id)))
WHERE (e.amount_base IS NULL OR e.tax_amount_base IS NULL)
  AND e.deleted_at IS NULL;
