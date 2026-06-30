-- Inventory V2 P1: make inventory_items device-type-driven with JSON technical specs.
-- Additive; inventory_items is empty so no backfill needed. device_type_id stays nullable for
-- legacy safety (none exist); the new wizard requires it going forward.
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS device_type_id uuid REFERENCES public.catalog_device_types(id),
  ADD COLUMN IF NOT EXISTS technical_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS qr_value text;

-- Search: GIN over technical_details (PCB/firmware/controller/head_map/dcm/chipset live here).
CREATE INDEX IF NOT EXISTS idx_inventory_items_technical_details
  ON public.inventory_items USING gin (technical_details) WHERE deleted_at IS NULL;

-- Filter/group by device type.
CREATE INDEX IF NOT EXISTS idx_inventory_items_device_type
  ON public.inventory_items (device_type_id) WHERE deleted_at IS NULL;

-- Barcode lookup must be unique per tenant (scanner resolves exactly one item).
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_tenant_barcode
  ON public.inventory_items (tenant_id, barcode) WHERE barcode IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_qr_value
  ON public.inventory_items (tenant_id, qr_value) WHERE qr_value IS NOT NULL AND deleted_at IS NULL;
