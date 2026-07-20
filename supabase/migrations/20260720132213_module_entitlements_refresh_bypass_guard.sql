-- refresh_tenant_module_entitlements is a trusted SECURITY DEFINER system
-- materialization for the specified tenant (deterministic from plan_modules).
-- Its cross-tenant INSERT is legitimately not the caller's tenant, so set the
-- documented app.bypass_tenant_guard so it works from any trigger/caller context
-- (the tenants.plan_id trigger, provisioning, admin, or tests) — not only
-- service_role / platform-admin / own-tenant callers.
CREATE OR REPLACE FUNCTION public.refresh_tenant_module_entitlements(p_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_plan uuid;
BEGIN
  PERFORM set_config('app.bypass_tenant_guard','true', true);
  SELECT plan_id INTO v_plan FROM tenant_subscriptions
   WHERE tenant_id = p_tenant_id AND deleted_at IS NULL
     AND status IN ('active','trialing')
   ORDER BY updated_at DESC LIMIT 1;
  IF v_plan IS NULL THEN
    SELECT plan_id INTO v_plan FROM tenants WHERE id = p_tenant_id;
  END IF;

  INSERT INTO tenant_module_entitlements (tenant_id, module_slug, enabled, source)
  SELECT p_tenant_id, m.slug, COALESCE(bool_or(pm.is_included), false), 'plan'
  FROM master_modules m
  LEFT JOIN plan_modules pm ON pm.module_id = m.id AND pm.plan_id = v_plan
  WHERE m.is_gateable AND m.is_active
  GROUP BY m.slug
  ON CONFLICT (tenant_id, module_slug) DO UPDATE
    SET enabled = EXCLUDED.enabled, source = 'plan', updated_at = now(), deleted_at = NULL
    WHERE tenant_module_entitlements.source NOT IN ('grandfather','override');

  UPDATE tenant_module_entitlements SET enabled = true, updated_at = now()
   WHERE tenant_id = p_tenant_id AND module_slug = 'hr'
     AND source NOT IN ('grandfather','override')
     AND EXISTS (SELECT 1 FROM tenant_module_entitlements p
                 WHERE p.tenant_id = p_tenant_id AND p.module_slug='payroll' AND p.enabled);
END;
$$;
