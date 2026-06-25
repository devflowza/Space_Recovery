# Device Catalog Consolidation — Design Spec (Tier 2 / structural)

- **Date:** 2026-06-25
- **Status:** Approved for implementation
- **Supabase project:** `ssmbegiyjivrcwgcqutu` (live)
- **Origin:** the Device/Media-Type terminology audit (2026-06-25). Tier 1 = label renames (separate). This spec covers **Tier 2 = structural** findings B1, B2, B4 (+ optional B3).

---

## 1. Problem

The audit surfaced two pairs of catalog tables where the table wired into the app is **not** the one shown/curated in Settings, plus an import field-mapping collision:

| ID | Issue |
|----|-------|
| **B1** | Two interface catalogs. `catalog_interfaces` is the real FK target (`case_devices`, `inventory_items`, `resource_clone_drives`); `catalog_device_interfaces` has **zero** FK references but is the one Settings exposes as "Device Interface". |
| **B2** | Two inventory-category catalogs. `master_inventory_categories` is the FK target (`inventory_items.category_id`); `master_inventory_item_categories` (FK `item_category_id`) is a separate, disconnected taxonomy. |
| **B4** | `suggestFieldMapping` aliases collide: `device_type_id` and `category_id` both claim `'category'`/`'type'`, so a CSV column named `category` or `type` silently maps to Device Type. |
| **B3** *(optional)* | `InventoryListPage` reads `item.inventory_code`, a column that does not exist (only `item_number`), so the "INV#" badge never renders. |

## 2. Ground truth (live DB, verified 2026-06-25)

- These catalogs use **`is_active` boolean** as the soft-delete flag (NOT `deleted_at`); they are global (no `tenant_id`).
- `catalog_device_interfaces` has **no `updated_at`**; `master_inventory_item_categories` has **no `color_code`**.
- **Row counts / usage:**
  - `catalog_interfaces`: 15 active (coarse: USB, SATA, NVMe, M.2, PCIe, FireWire, SD/MMC, Ethernet, eSATA, IDE/PATA, Lightning, mSATA, SAS, SCSI, Thunderbolt)
  - `catalog_device_interfaces`: 30 active (granular: USB 2.0/3.0/3.1/3.2/USB-C, SATA I/II/III, M.2 NVMe, M.2 SATA, PCIe x1/x4/x8/x16, FireWire 400/800, Thunderbolt/2/3/4, CF/SD/MicroSD, eSATA, IDE/PATA, Lightning, mSATA, SAS, SCSI, Ethernet (RJ45))
  - `master_inventory_categories`: 7 (Hard Drives, SSDs, Parts, PCB, Tools, Supplies, Other)
  - `master_inventory_item_categories`: 7 (Donor Drives, Head Assemblies, Motors, PCBs, Spare Parts, Consumables, Tools)
  - **`case_devices.interface_id` = 0, `inventory_items.interface_id` = 0, `resource_clone_drives.interface_id` = 0, `inventory_items.category_id` = 0, `inventory_items.item_category_id` = 0.** No row references any of these — **zero data-migration risk**.

## 3. Decisions (locked with product owner)

1. **Interfaces:** keep `catalog_interfaces` (the wired table); adopt the **granular** vocabulary; retire `catalog_device_interfaces`. *(No FK/code repoint — chosen over making the richer table canonical precisely to avoid FK + code churn.)*
2. **Categories:** keep `master_inventory_categories` as the single taxonomy; merge in the 3 genuinely-new parts terms **Donor Drives, Head Assemblies, Motors** (overlaps PCBs/Tools/Spare Parts/Consumables intentionally NOT merged); retire `master_inventory_item_categories` + soft-deprecate `inventory_items.item_category_id`.

## 4. Design

### 4.1 Interfaces (B1)
Reconcile `catalog_interfaces` **by name** so the active set equals the 30 granular values:

- **Keep active (already present, in target):** eSATA, IDE/PATA, Lightning, mSATA, SAS, SCSI, Thunderbolt (7)
- **Deactivate (coarse parents superseded by granular children):** Ethernet, FireWire, M.2, NVMe, PCIe, SATA, SD/MMC, USB (8 → `is_active=false`)
- **Insert active (granular, not yet present):** CF, Ethernet (RJ45), FireWire 400, FireWire 800, M.2 NVMe, M.2 SATA, MicroSD, PCIe x1, PCIe x4, PCIe x8, PCIe x16, SATA I (1.5 Gb/s), SATA II (3 Gb/s), SATA III (6 Gb/s), SD, Thunderbolt 2, Thunderbolt 3, Thunderbolt 4, USB 2.0, USB 3.0, USB 3.1, USB 3.2, USB-C (23)
- Result: 30 active (7 kept + 23 inserted), 8 deactivated. `sort_order` assigned to group by family (USB/SATA/PCIe/etc.).
- **Retire `catalog_device_interfaces`:** all rows `is_active=false`; `COMMENT ON TABLE catalog_device_interfaces IS 'DEPRECATED 2026-06-25 — consolidated into catalog_interfaces';` remove from Settings + seed.

### 4.2 Categories (B2)
- **Insert into `master_inventory_categories`** (active): Donor Drives, Head Assemblies, Motors (3) → 10 active.
- **Retire `master_inventory_item_categories`:** all rows `is_active=false`; `COMMENT ON TABLE … IS 'DEPRECATED 2026-06-25 — consolidated into master_inventory_categories';`.
- **Soft-deprecate `inventory_items.item_category_id`:** no DROP (per rules); `COMMENT ON COLUMN inventory_items.item_category_id IS 'DEPRECATED 2026-06-25 — use category_id (master_inventory_categories)';`. Stop reading/writing it in code.

### 4.3 Import alias collision (B4)
- `device_type_id` aliases → `['device_type','type','device']` (remove `'category'`).
- `category_id` aliases → `['category','item_category']` (remove `'type'`).
- ImportWizard "Basic Information" option `item_category` → target `category_id`.

### 4.4 B3 (optional, same area)
- `InventoryListPage.tsx`: `item.inventory_code` → `item.item_number` so the INV# badge renders.

## 5. Migration (DML-only; no DDL → `database.types.ts` unchanged, schema-drift stays green)

One `apply_migration` (idempotent, guarded by `name`/`is_active`):
1. `INSERT … ON CONFLICT`/`NOT EXISTS`-guarded inserts of the 23 granular interfaces.
2. `UPDATE catalog_interfaces SET is_active=false WHERE name IN (8 coarse parents)`.
3. `UPDATE catalog_device_interfaces SET is_active=false` + table comment.
4. Guarded inserts of the 3 parts categories.
5. `UPDATE master_inventory_item_categories SET is_active=false` + table comment.
6. Column comment on `inventory_items.item_category_id`.

No column/table is added or dropped → no type regeneration required.

## 6. Code changes

| File | Change |
|---|---|
| `src/config/settingsCategories.ts` | remove `catalog_device_interfaces` from the Device & Media tables list + `TABLE_LABELS`; keep `catalog_interfaces` labelled **"Interfaces"** |
| `src/config/seedData.ts` | add `catalog_interfaces` (granular set) to `DEVICE_MEDIA_SEED_DATA`; remove `catalog_device_interfaces`; add the 3 parts categories to the inventory-categories seed |
| `src/lib/seedService.ts` | mirror the seed/`checkIfSeeded` changes; reconcile the drifted local `tableLabels` for the affected tables (import/reuse `TABLE_LABELS` where practical) |
| `src/lib/inventoryService.ts` | rename exported type `InventoryItemCategory` → `InventoryCategory`; remove any `item_category_id` read/write |
| `src/lib/importExportService.ts` | alias fix (4.3); ensure `interface_id`/`category_id` reference fields point at the canonical tables |
| `src/lib/bulkImportService.ts` | preload `catalog_interfaces` / `master_inventory_categories` only (drop `catalog_device_interfaces` / item-categories) |
| `src/components/importExport/ImportWizard.tsx` | `item_category` option → `category_id` target |
| *(opt)* `src/pages/inventory/InventoryListPage.tsx` | `item.inventory_code` → `item.item_number` (B3) |

**Pre-flight grep:** before editing, confirm no other code references `catalog_device_interfaces` or `item_category_id` (DB shows zero FKs; audit found refs only in Settings/seed/import — verify with a repo grep so nothing is missed).

## 7. Testing / verification

- **Unit (TDD):** `suggestFieldMapping('category')` → `category_id`; `suggestFieldMapping('type')` → `device_type_id`; `('device_type')` → `device_type_id`. (Locks B4.)
- **Post-migration SQL assertions:** `catalog_interfaces` active = the 30 granular names; `catalog_device_interfaces` active = 0; `master_inventory_item_categories` active = 0; `master_inventory_categories` active includes the 3 new names.
- `npm run typecheck` = 0; `npm run lint`; existing test suite green.
- Manual: Settings → Device & Media shows a single "Interfaces" tab with the granular list; no "Device Interface" tab.

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Touching **live production** catalog data | All affected FK columns have 0 rows → no orphans; migration applied only on explicit go-ahead; assertions verify before/after |
| A hidden code/embed reference to a retired table | Pre-flight repo grep (§6) before retiring; DB confirms 0 FKs |
| Seed re-run re-introducing the retired table | Remove it from seed config + `checkIfSeeded` in the same change |
| `is_active` vs `deleted_at` confusion | Spec pins `is_active` as the flag for these globals; no `deleted_at` exists here |

## 9. Out of scope

- Tier 1 label renames (Media Type → Device Type, "Type" → "Device Type" in PDFs, Number→Count, placeholders, "Device & Media"→"Devices"). Tracked separately.
- Any DROP of tables/columns (forbidden); retirement is `is_active=false` + deprecation comments only.

## 10. Rollout

1. Write implementation plan (writing-plans).
2. Implement code + tests locally (TDD); `tsc`/lint/tests green.
3. **Apply migration to `ssmbegiyjivrcwgcqutu` only on explicit owner go-ahead**; run the §7 SQL assertions immediately after.
4. Keep all work local (no PR) until explicitly requested.
