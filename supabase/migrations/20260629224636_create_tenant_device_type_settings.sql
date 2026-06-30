-- Inventory V2 P5: per-tenant per-device-type settings. The global catalog_device_types can't hold
-- a tenant's default storage location (locations are tenant-scoped), so tenant overrides live here.
CREATE TABLE IF NOT EXISTS public.tenant_device_type_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  device_type_id uuid NOT NULL REFERENCES public.catalog_device_types(id) ON DELETE CASCADE,
  default_location_id uuid REFERENCES public.inventory_locations(id),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.tenant_device_type_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_device_type_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_device_type_settings_tenant_isolation" ON public.tenant_device_type_settings
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_platform_admin())
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_platform_admin());

CREATE POLICY "tenant_device_type_settings_select" ON public.tenant_device_type_settings
  FOR SELECT TO authenticated USING (is_staff_user());
CREATE POLICY "tenant_device_type_settings_insert" ON public.tenant_device_type_settings
  FOR INSERT TO authenticated WITH CHECK (has_role('manager'));
CREATE POLICY "tenant_device_type_settings_update" ON public.tenant_device_type_settings
  FOR UPDATE TO authenticated USING (has_role('manager')) WITH CHECK (has_role('manager'));
CREATE POLICY "tenant_device_type_settings_delete" ON public.tenant_device_type_settings
  FOR DELETE TO authenticated USING (has_role('admin'));

CREATE TRIGGER set_tenant_device_type_settings_tenant_and_audit
  BEFORE INSERT OR UPDATE ON public.tenant_device_type_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_and_audit_fields();
CREATE TRIGGER set_tenant_device_type_settings_audit_actor
  BEFORE INSERT OR UPDATE ON public.tenant_device_type_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_actor_fields();

CREATE INDEX idx_tenant_device_type_settings_tenant_id
  ON public.tenant_device_type_settings (tenant_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_tenant_device_type_settings_type
  ON public.tenant_device_type_settings (tenant_id, device_type_id) WHERE deleted_at IS NULL;
