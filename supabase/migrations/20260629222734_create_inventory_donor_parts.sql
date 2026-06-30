-- Inventory V2 P4: device-type-driven donor parts (replaces the hardcoded 3-key
-- inventory_items.donor_parts_available JSONB). One row per (item, part_type); quantity holds count.
CREATE TABLE IF NOT EXISTS public.inventory_donor_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  part_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  condition_id uuid REFERENCES public.master_inventory_condition_types(id),
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.inventory_donor_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_donor_parts FORCE ROW LEVEL SECURITY;

-- RESTRICTIVE tenant isolation (ANDed with the permissive policies below).
CREATE POLICY "inventory_donor_parts_tenant_isolation" ON public.inventory_donor_parts
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_platform_admin())
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_platform_admin());

-- Permissive operation policies: staff read/write, admin delete.
CREATE POLICY "inventory_donor_parts_select" ON public.inventory_donor_parts
  FOR SELECT TO authenticated USING (is_staff_user());
CREATE POLICY "inventory_donor_parts_insert" ON public.inventory_donor_parts
  FOR INSERT TO authenticated WITH CHECK (is_staff_user());
CREATE POLICY "inventory_donor_parts_update" ON public.inventory_donor_parts
  FOR UPDATE TO authenticated USING (is_staff_user()) WITH CHECK (is_staff_user());
CREATE POLICY "inventory_donor_parts_delete" ON public.inventory_donor_parts
  FOR DELETE TO authenticated USING (has_role('admin'));

-- Tenant + audit stamping (same shared trigger functions as every other tenant table).
CREATE TRIGGER set_inventory_donor_parts_tenant_and_audit
  BEFORE INSERT OR UPDATE ON public.inventory_donor_parts
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_and_audit_fields();
CREATE TRIGGER set_inventory_donor_parts_audit_actor
  BEFORE INSERT OR UPDATE ON public.inventory_donor_parts
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_actor_fields();

-- Required partial tenant index + FK/lookup indexes.
CREATE INDEX idx_inventory_donor_parts_tenant_id
  ON public.inventory_donor_parts (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_donor_parts_item
  ON public.inventory_donor_parts (item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_donor_parts_part_type
  ON public.inventory_donor_parts (tenant_id, part_type) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_inventory_donor_parts_item_part
  ON public.inventory_donor_parts (item_id, part_type) WHERE deleted_at IS NULL;
