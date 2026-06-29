-- Inventory V2 P2: atomic per-device-type inventory numbering.
-- Each device type owns an independent sequence keyed 'inventory:<device_type_id>'. The first call
-- lazy-seeds a number_sequences row from the device type's catalog default prefix/padding, then
-- delegates to the existing atomic get_next_number() (no client-side race).
CREATE OR REPLACE FUNCTION public.get_next_inventory_number(p_device_type_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid := get_current_tenant_id();
  v_scope  text := 'inventory:' || p_device_type_id::text;
  v_prefix text;
  v_padding integer;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant context for inventory numbering';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM number_sequences WHERE tenant_id = v_tenant AND scope = v_scope) THEN
    SELECT COALESCE(inventory_prefix, UPPER(LEFT(regexp_replace(name, '[^A-Za-z0-9]', '', 'g'), 4))),
           COALESCE(inventory_padding, 4)
      INTO v_prefix, v_padding
      FROM catalog_device_types
      WHERE id = p_device_type_id;

    IF v_prefix IS NULL THEN
      RAISE EXCEPTION 'Unknown device type %', p_device_type_id;
    END IF;

    INSERT INTO number_sequences (tenant_id, scope, prefix, current_value, padding)
      VALUES (v_tenant, v_scope, v_prefix, 0, v_padding)
      ON CONFLICT (tenant_id, scope) DO NOTHING;
  END IF;

  RETURN get_next_number(v_scope);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_next_inventory_number(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_next_inventory_number(uuid) TO authenticated;
