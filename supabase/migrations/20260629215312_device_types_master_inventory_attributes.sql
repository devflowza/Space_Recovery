-- Inventory V2 P0: turn the shared global catalog_device_types into the "Master Device Type".
-- Adds GLOBAL inventory attributes (family/icon/default category/numbering prefix/barcode+qr prefix).
-- Per-TENANT defaults (e.g. default storage location) are intentionally NOT here (this table is
-- global) — they go in a tenant_device_type_settings table in P5.
ALTER TABLE public.catalog_device_types
  ADD COLUMN IF NOT EXISTS family text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS default_category_id uuid REFERENCES public.master_inventory_categories(id),
  ADD COLUMN IF NOT EXISTS inventory_prefix text,
  ADD COLUMN IF NOT EXISTS inventory_padding integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS barcode_prefix text,
  ADD COLUMN IF NOT EXISTS qr_prefix text,
  ADD COLUMN IF NOT EXISTS is_inventory_tracked boolean NOT NULL DEFAULT true;

-- New device types named in the redesign spec (PCB + Head Stack are intake/inventory units).
INSERT INTO public.catalog_device_types (name, description, sort_order)
SELECT v.name, v.descr, v.so
FROM (VALUES ('PCB', 'Printed circuit board (logic board)', 100),
             ('Head Stack', 'Head stack assembly (HSA)', 101)) AS v(name, descr, so)
WHERE NOT EXISTS (SELECT 1 FROM public.catalog_device_types t WHERE lower(t.name) = lower(v.name));

-- Backfill family (explicit, finer-grained than the legacy resolver: NVMe/PCB/Head Stack split out).
UPDATE public.catalog_device_types SET family = CASE lower(name)
  WHEN '3.5" hdd' THEN 'hdd' WHEN '2.5" hdd' THEN 'hdd' WHEN 'hybrid drive' THEN 'hdd'
  WHEN '2.5" ssd' THEN 'ssd' WHEN 'm.2 ssd' THEN 'ssd' WHEN 'ssd external' THEN 'ssd'
  WHEN 'nvme ssd' THEN 'nvme'
  WHEN 'usb drive' THEN 'usb_flash' WHEN 'memory stick' THEN 'usb_flash'
  WHEN 'sd card' THEN 'memory_card' WHEN 'microsd card' THEN 'memory_card' WHEN 'cf card' THEN 'memory_card'
  WHEN 'mobile phone' THEN 'mobile' WHEN 'tablet' THEN 'mobile'
  WHEN 'raid array' THEN 'raid' WHEN 'server' THEN 'raid'
  WHEN 'nas device' THEN 'nas'
  WHEN 'pcb' THEN 'pcb' WHEN 'head stack' THEN 'head_stack'
  ELSE 'other' END
WHERE family IS NULL;

-- Backfill inventory_prefix (warehouse rack families; matches the spec's BIG/SMALL/SSD/... examples).
UPDATE public.catalog_device_types SET inventory_prefix = CASE lower(name)
  WHEN '3.5" hdd' THEN 'BIG' WHEN '2.5" hdd' THEN 'SMALL' WHEN 'hybrid drive' THEN 'SSHD'
  WHEN '2.5" ssd' THEN 'SSD' WHEN 'm.2 ssd' THEN 'M2' WHEN 'nvme ssd' THEN 'NVME' WHEN 'ssd external' THEN 'SSDX'
  WHEN 'usb drive' THEN 'USB' WHEN 'memory stick' THEN 'MS'
  WHEN 'sd card' THEN 'SD' WHEN 'microsd card' THEN 'MSD' WHEN 'cf card' THEN 'CF'
  WHEN 'mobile phone' THEN 'MOB' WHEN 'tablet' THEN 'TAB'
  WHEN 'raid array' THEN 'RAID' WHEN 'server' THEN 'SRV' WHEN 'nas device' THEN 'NAS'
  WHEN 'pcb' THEN 'PCB' WHEN 'head stack' THEN 'HEAD'
  WHEN 'dvr/camera' THEN 'DVR'
  ELSE UPPER(LEFT(regexp_replace(name, '[^A-Za-z0-9]', '', 'g'), 4)) END
WHERE inventory_prefix IS NULL;

-- Barcode/QR prefixes default to the inventory prefix; admin can override later.
UPDATE public.catalog_device_types SET barcode_prefix = inventory_prefix WHERE barcode_prefix IS NULL;
UPDATE public.catalog_device_types SET qr_prefix = inventory_prefix WHERE qr_prefix IS NULL;

-- Default inventory category by family (best-effort; admin-editable).
UPDATE public.catalog_device_types dt SET default_category_id = c.id
FROM public.master_inventory_categories c
WHERE dt.default_category_id IS NULL AND c.name = CASE dt.family
  WHEN 'hdd' THEN 'Hard Drives'
  WHEN 'ssd' THEN 'SSDs' WHEN 'nvme' THEN 'SSDs'
  WHEN 'pcb' THEN 'PCB'
  WHEN 'head_stack' THEN 'Head Assemblies'
  ELSE 'Other' END;

-- Icons (lucide names; cosmetic, admin-editable).
UPDATE public.catalog_device_types SET icon = CASE family
  WHEN 'hdd' THEN 'HardDrive' WHEN 'ssd' THEN 'HardDrive' WHEN 'nvme' THEN 'Cpu'
  WHEN 'usb_flash' THEN 'Usb' WHEN 'memory_card' THEN 'MemoryStick'
  WHEN 'mobile' THEN 'Smartphone' WHEN 'raid' THEN 'Server' WHEN 'nas' THEN 'Server'
  WHEN 'pcb' THEN 'CircuitBoard' WHEN 'head_stack' THEN 'Cpu'
  ELSE 'Box' END
WHERE icon IS NULL;
