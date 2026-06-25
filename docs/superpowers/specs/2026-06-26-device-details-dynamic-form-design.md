# Dynamic Device Details Form — Design Spec

- **Date:** 2026-06-26
- **Status:** Approved for implementation (matrices + architecture signed off by product owner)
- **Supabase project:** `ssmbegiyjivrcwgcqutu` (live)
- **Skill gate:** UI/UX + architecture (mixed) → `ui-ux-pro-max` + `frontend-design` + Superpowers (`brainstorming` → this spec → `writing-plans`).
- **Domain:** Stage 5 (Initial Inspection / Condition) and Stage 6 (Diagnosis / Recoverability) of the 16-stage data-recovery lifecycle — the technician's post-intake **Edit/Add Device** surface.

---

## 1. Problem

After a device is received, technicians open the device editor to record detailed hardware information used for recovery, firmware repair, PCB replacement, **donor-drive matching**, and recovery reporting. Today that editor (`DeviceFormModal.tsx`, ~1069 lines) is a single hand-written form with a fixed 3-column grid that shows **the same fields for every device type**. An SSD shows platter/head/pre-amp fields that don't physically exist on it; a memory card shows HDD mechanics. Result: long scrolling, irrelevant fields, slow and error-prone data entry, poor onboarding, and an architecture that does not scale as device types are added.

This refactor replaces the static form with a **configuration-driven dynamic form** whose visible Technical and Component-Diagnostics fields change by **device family**, while a small fixed Basic section is always shown.

**This is a UI/UX + architecture refactor of the Edit/Add Device experience only.** The Create-Case intake wizard is explicitly **out of scope and frozen**.

## 2. Ground truth (verified against live DB + codebase, 2026-06-26)

### 2.1 Target & boundary
- **Target:** `src/components/cases/DeviceFormModal.tsx` — the one Add/Edit device modal (`isEditMode = !!deviceData`, `:56`). Holds two flat `useState` objects: `formData`→`case_devices` (`:66-81`) and `diagnosticsFormData`→`device_diagnostics.result` jsonb (`:89-109`). Fixed `grid grid-cols-3` (`:568`). Device create/update/soft-delete is **inline** in this file (`:410` update, `:421` insert, `:508` soft-delete) — there is **no** `caseDeviceService`.
- **Parents:** `src/components/cases/detail/CaseDevicesTab.tsx` (cards + Edit/Add buttons; Edit icon mis-aliased `CreditCard as Edit`, `:3`); mounted by `src/pages/cases/CaseDetail.tsx:448-463`; modal state in `src/components/cases/detail/useCaseModals.ts`.
- **FROZEN (do not touch):** `src/components/cases/CreateCaseWizard.tsx` (1091 lines; device intake is inline) and `src/components/cases/ServerBulkDrivesModal.tsx`. Verified: `CreateCaseWizard` does **not** import `DeviceFormModal`; **no shared device-form component exists**. The Edit refactor cannot affect intake.
- **Read paths that must not regress** (columns selected today): `src/lib/useCaseQueries.ts:165-196` (query key `['case_devices', id]`), `src/lib/pdf/dataFetcher.ts:336-369` (`select('*')`), `src/lib/caseService.ts:56-72` (duplicate-case), `src/components/cases/DeviceCheckoutModal.tsx`, `src/lib/reportPDFService.ts`.

### 2.2 `case_devices` columns relevant to the form (`database.types.ts:1532-1576`)
- **Basic:** `device_type_id`→`catalog_device_types`, `brand_id`→`catalog_device_brands`, `model`, `serial_number`, `capacity_id`→`catalog_device_capacities`, `condition_id`→`catalog_device_conditions`, `accessories` (text[]).
- **Structural (kept, not part of the 3 sections):** `device_role_id`→`catalog_device_roles` (required gate; "clone" filtered), `is_primary` (set via RPC `promote_device_to_primary`, not direct write), `role_notes`, `password`, `symptoms` (free-text "Device Problem"), `notes`, `storage_location`.
- **Existing-but-UNUSED spec columns (wire these up — free wins):** `pcb_number` (text), `interface_id`→**`catalog_interfaces`** (NOT `catalog_device_interfaces`), `made_in_id`→`catalog_device_made_in`, `form_factor_id`→`catalog_device_form_factors`, `head_count_id`→`catalog_device_head_counts`, `platter_count_id`→`catalog_device_platter_counts`, `firmware_version` (text), `encryption_id`→`catalog_device_encryption`.
- **Collisions to resolve:** `case_devices.firmware_version` (column, unused) vs `device_diagnostics.result.firmware_version` (what the form writes today). `case_devices.physical_damage` (unused) vs `result.physical_damage_notes`. Canonical homes chosen in §5.

### 2.3 `device_diagnostics` (`database.types.ts:5215-5227`)
Thin table; all detail in `result` jsonb. Pack/unpack in `src/lib/diagnosticsTransform.ts` (`RESULT_FIELDS`, `:52-75`); service in `src/lib/diagnosticsService.ts` (incl. `getComponentStatuses()`, `determineDeviceCategory()` `:167-189`). Component statuses come from `catalog_device_component_statuses` (5 rows: **Good / Damaged / Missing / Not Tested / Replaced**). **Known bugs to fix:** (a) diagnostics save is gated to Patient role only (`:347,:456`); (b) `hasDiagnosticsData()` ignores firmware/ROM/NAND/checkbox-only entries, silently dropping them.

### 2.4 Catalogs (live, global, soft-delete via `is_active`)
`catalog_device_types` = **18 rows**, keyed by `name` (columns: `id, name, description, is_active, sort_order`; **no** `category`/`code`/`slug`/`deleted_at`). Counts: conditions 20, accessories 18, `catalog_interfaces` ~15, encryption 18, made_in 16, form_factors 10, head_counts 10, platter_counts 9, capacities 55, brands 24, component_statuses 5. Loaders today are ad-hoc inline `useQuery` with string keys; centralized `masterDataKeys` in `src/lib/queryKeys.ts:184-186` exist but are unused. **No device-facing loader exists** for `catalog_interfaces`, `catalog_device_made_in`, `catalog_device_head_counts`, `catalog_device_platter_counts`, `catalog_device_form_factors`.

### 2.5 Reusable primitives (`src/components/ui/`, all share `useFieldA11y`)
`Input`, `Textarea`, `SearchableSelect` (FK combobox; `value:string`, `options:{id,name}[]`, ARIA listbox), `MultiSelectDropdown` (`value:string[]`), `Checkbox`, `RadioGroup`, `FormField` (render-prop), **`CollapsibleSection`** (`title, icon, color, defaultOpen?, fieldCount?` — already renders `t('ui.fieldCount',{count})`), `Modal`. No `NumberInput` (use `<Input type="number">`), no shared `Tabs`. `cn()` in `src/lib/utils.ts`; `cva` present; status tones in `src/lib/ui/variants.ts`. **No config→render engine exists** — closest precedent is the `TableColumnDef` + `resolveTableView` registry (`src/lib/tables/types.ts`).

## 3. Decisions (locked with product owner, 2026-06-26)

1. **Storage = Hybrid.** Wire the 8 existing-but-unused columns. Add **3 typed columns** for the donor-matching keys (`dom date`, `part_number text`, `dcm text`) and **one** `technical_details jsonb` for the sparse, type-specific remainder. (Rejected: jsonb-only — loses donor-search queryability on P/N + DCM; all-typed — heaviest migration, many null columns.)
2. **Config keying = TS family registry.** A version-controlled TypeScript config keyed by **device family**, with a `name → family` resolver mapping all 18 catalog rows. Zero migration; adding a type = one config line. (Rejected: DB `category` column — cleaner long-term but needs a global-catalog migration + Settings UI; deferred.)
3. **Component Diagnostics = all device roles.** Remove the Patient-only gate; available for patient, backup, and donor devices (a lab assesses donor components before harvest). Fix the silent-save dirty-check.
4. **FK fields stay FK.** `# Heads`, `# Platters`, `Interface`, `Made In`, `Encryption`, `Form Factor` use their existing seeded catalogs via `SearchableSelect` (no free-number columns added).
5. **Frozen wizard.** No change to `CreateCaseWizard` / `ServerBulkDrivesModal`.

## 4. Device families & resolver

`src/lib/devices/deviceFamily.ts` — `DeviceFamily = 'hdd'|'ssd'|'usb_flash'|'memory_card'|'mobile'|'raid'|'nas'|'other'`. `resolveDeviceFamily(typeName: string): DeviceFamily` uses an explicit name→family map, a normalized-substring fallback, and `'other'` default.

| Family | Catalog types |
|---|---|
| `hdd` | 2.5" HDD, 3.5" HDD, Hybrid Drive |
| `ssd` | 2.5" SSD, M.2 SSD, NVMe SSD, SSD External |
| `usb_flash` | USB Drive, Memory Stick |
| `memory_card` | SD Card, MicroSD Card, CF Card |
| `mobile` | Mobile Phone, Tablet |
| `raid` | RAID Array, Server |
| `nas` | NAS Device |
| `other` | DVR/Camera (+ any future unmapped type) |

## 5. Config registry & storage map

`src/lib/devices/deviceFieldConfig.ts`:

```ts
export type FieldControl =
  | 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'textarea' | 'component-status';

export type FieldStorage =
  | { table: 'case_devices'; kind: 'column'; column: string }
  | { table: 'case_devices'; kind: 'json'; jsonKey: string }            // → technical_details
  | { table: 'device_diagnostics'; kind: 'json'; jsonKey: string };     // → result

export interface DeviceFieldDef {
  key: string;                 // stable id (== jsonKey/column where natural)
  labelKey: string;            // i18n key under the `devices` namespace
  labelFallback: string;       // English literal (byte-identical to today where applicable)
  control: FieldControl;
  storage: FieldStorage;
  optionsSource?: CatalogKey;  // for select/multiselect: which catalog loader
  componentKey?: string;       // for control:'component-status' (e.g. 'heads','pcb')
  colSpan?: 1 | 2;             // grid span; default 1, textarea/notes = 2
  required?: boolean;          // enforced ONLY when the field is visible
  hint?: string;
}

export interface DeviceFamilyConfig {
  family: DeviceFamily;
  technical: DeviceFieldDef[];   // Section 2
  components: DeviceFieldDef[];   // Section 3 (control:'component-status'); [] hides the section
}
```

- **Basic section** is a shared constant `BASIC_FIELDS` (identical for all families): Device Type, Brand, Model, Serial Number, Capacity/Storage, Condition, Accessories. Device Type is the discriminant.
- **`firmware_version` canonical home = `case_devices.firmware_version`** (column). On load, prefer the column; fall back to legacy `result.firmware_version` when the column is empty (backward compat). The diagnostic *findings* `firmware_corruption` / `rom_version` remain Section-3 diagnostics.
- `dom`, `part_number`, `dcm` → new typed columns. `Storage` (mobile) and `NAS Brand` reuse `capacity_id` / `brand_id` (no new columns).

### 5.1 Section 2 — Technical (per family)
Legend: `col`=existing column, `col🆕`=new typed column, `FK`=catalog `SearchableSelect`, `json`=`technical_details` jsonb.

| Family | Technical fields (key → storage) |
|---|---|
| **hdd** | pcb_number→col, interface_id→FK, made_in_id→FK, dom→col🆕(date), part_number→col🆕, dcm→col🆕, firmware_version→col, encryption_id→FK, platter_count_id→FK, head_count_id→FK, physical_head_map→json, pre_amp→json |
| **ssd** | controller→json, firmware_version→col, dom→col🆕, made_in_id→FK, interface_id→FK, pcb_number→col, encryption_id→FK, chipset→json |
| **usb_flash** | controller→json, firmware_version→col, part_number→col🆕 |
| **memory_card** | controller→json, firmware_version→col, part_number→col🆕 |
| **mobile** | (Storage = capacity_id in Basic), encryption_id→FK, chipset→json, imei→json, os→json |
| **raid** | raid_level→json, num_drives→json(number), controller→json, file_system→json, firmware_version→col |
| **nas** | (NAS Brand = brand_id in Basic), raid_level→json, num_drives→json(number), os→json, file_system→json, firmware_version→col |
| **other** | interface_id→FK, made_in_id→FK, firmware_version→col, encryption_id→FK, file_system→json |

### 5.2 Section 3 — Component Diagnostics (per family)
Each row is `control:'component-status'` → a `SearchableSelect` over `catalog_device_component_statuses`, stored at `device_diagnostics.result.<componentKey>_status`. Section hidden when `components: []`.

| Family | Components (componentKey) |
|---|---|
| **hdd** | heads, pcb, motor, preamp, surface, service_area |
| **ssd** | controller, nand, pcb |
| **usb_flash** / **memory_card** | controller, nand, pcb |
| **mobile** | pcb, storage_chip |
| **raid** / **nas** | controller (+ free `technical_notes` for member drives, colSpan 2) |
| **other** | — (section hidden) |

**Storage-boundary rule (resolves the legacy-key ambiguity):**
- **Section 3 component statuses** → `device_diagnostics.result.<componentKey>_status`. Reuse existing `*_status` keys where present (`heads_status`, `pcb_status`, `motor_status`, `surface_status`, `controller_status`); add new ones (`preamp_status`, `service_area_status`, `storage_chip_status`, `nand_status`) — additive jsonb, no migration. A free `technical_notes` textarea (existing key) may trail Section 3.
- **Section 2 Technical `json` fields** → `case_devices.technical_details.<key>` (the clean rule: Technical→`case_devices`, Diagnostics→`device_diagnostics`). New keys: `pre_amp`, `controller`, `chipset`, `imei`, `os`, `raid_level`, `num_drives`, `file_system`, `physical_head_map`.
- **Legacy-key fallback (load only):** where a legacy `device_diagnostics.result.*` key already holds the same datum — `head_map`→`physical_head_map`, `controller_model`→`controller` — the loader reads it as a fallback when `technical_details.<key>` is empty, but **writes always target `technical_details`** going forward. Same backward-compat pattern as `firmware_version`. (`nand_type` is a NAND class, not a chipset/controller identifier, and is NOT used as a fallback for `chipset`.)

## 6. Renderer

- `src/components/cases/device-form/DeviceDetailsForm.tsx` — given the resolved `DeviceFamilyConfig` + hydrated state, renders **3 `CollapsibleSection`s** (Basic + Technical `defaultOpen`, Diagnostics collapsed), each an internal `grid grid-cols-1 md:grid-cols-2 gap-4`, honoring per-field `colSpan`. Field-count badges via the section's existing `fieldCount`.
- `src/components/cases/device-form/DeviceFieldRenderer.tsx` — the **single** `switch (control)` mapping to existing primitives (`Input`/number/date, `SearchableSelect`+catalog loader, `MultiSelectDropdown`, `Textarea`, component-status select). Adding a control type touches **one** file. No `switch` on device type anywhere in the UI — type only selects the config.
- Changing **Device Type** re-resolves the family and re-renders Sections 2/3. **Hidden fields retain their state** (never cleared) so their DB values survive.

## 7. State, hydration & serialization

`src/lib/devices/deviceFormSerialization.ts` (pure, unit-tested):
- **`hydrateDeviceForm(device, diagnostics)`** → one flat record keyed by field `key`, reading each field from its storage target (column / `technical_details[key]` / `result[key]`), including fields not currently visible. Applies the firmware column→legacy-jsonb fallback.
- **`serializeDeviceForm(state, loaded)`** → `{ devicePatch, diagnosticsResultPatch }`:
  - `devicePatch`: typed columns (Basic + existing + `dom`/`part_number`/`dcm`) **plus** `technical_details` built by **merging** the json-kind values onto the loaded `technical_details` (never drop keys for hidden fields).
  - `diagnosticsResultPatch`: Section-3 component statuses + diagnostics json fields, merged onto the loaded `result`.
- **`validateDeviceForm(state, visibleFieldDefs)`** → required rules applied to **visible** fields only.

**Save orchestration** stays in `DeviceFormModal` (keeps modal shell, `device_role_id` gate, donor-from-inventory linkage, `setPrimaryDevice` RPC, soft-delete): write `devicePatch` to `case_devices`; **upsert** `device_diagnostics` for **all roles** when the result patch is non-empty (fixed dirty-check via the serializer's "has any diagnostics value" signal). Backward compatible: existing rows load unchanged; untouched/hidden values are preserved on save.

## 8. Migration (single additive DDL)

`apply_migration` name `add_case_devices_technical_fields`:
```sql
ALTER TABLE case_devices
  ADD COLUMN IF NOT EXISTS dom date,
  ADD COLUMN IF NOT EXISTS part_number text,
  ADD COLUMN IF NOT EXISTS dcm text,
  ADD COLUMN IF NOT EXISTS technical_details jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN case_devices.technical_details IS
  'Dynamic per-device-type technical fields (config-driven device form, 2026-06-26).';
```
- All nullable/defaulted → existing rows untouched; RLS/triggers unaffected (additive columns inherit existing policies). Then **regen `src/types/database.types.ts`** via `generate_typescript_types`, update the migration manifest, use the migration PR template. Schema-drift gate stays green after regen.

## 9. New / changed files

**New**
- `src/lib/devices/deviceFamily.ts` — family type + resolver.
- `src/lib/devices/deviceFieldConfig.ts` — field-def types, `BASIC_FIELDS`, per-family registry, `getDeviceFamilyConfig(family)`.
- `src/lib/devices/deviceCatalogQueries.ts` — wired loaders (via `masterDataKeys`) for interfaces / made_in / head_counts / platter_counts / form_factors.
- `src/lib/devices/deviceFormSerialization.ts` — hydrate / serialize / validate.
- `src/components/cases/device-form/DeviceDetailsForm.tsx` — 3-section renderer.
- `src/components/cases/device-form/DeviceFieldRenderer.tsx` — control switch.
- Tests: `deviceFamily.test.ts`, `deviceFieldConfig.test.ts`, `deviceFormSerialization.test.ts`, `DeviceDetailsForm.test.tsx`.

**Changed**
- `src/components/cases/DeviceFormModal.tsx` — replace imperative JSX body with `<DeviceDetailsForm>`; keep modal shell + save orchestration; consume serializer; remove Patient-only diagnostics gate; load new catalogs.
- `src/lib/queryKeys.ts` — use/extend `masterDataKeys` for the new loaders.
- `src/components/cases/detail/CaseDevicesTab.tsx` — fix mis-aliased Edit icon (lucide `Pencil`/`SquarePen`).
- `src/types/database.types.ts` — regenerated.
- i18n `devices` namespace resource (English) under the existing i18n setup.

**Frozen:** `CreateCaseWizard.tsx`, `ServerBulkDrivesModal.tsx`.

## 10. UX & theming (DESIGN.md + ui-ux-pro-max)

- Layout: collapsible sections, two-column responsive grid (`grid-cols-1 md:grid-cols-2`), single column on mobile; textareas/notes full width (`colSpan:2`); aligned labels. Minimal scrolling vs. today's 3-col scroll.
- Tokens only (no raw hex; no `purple/indigo/violet`): labels `text-sm font-medium text-slate-700`, required `text-danger`, input border `border-slate-300`/error `border-danger`, focus `ring-ring`, surfaces `bg-surface`/`bg-surface-muted`/`border-border`, section header per DESIGN.md. Component-status pills use status tones (`success/danger/warning/info/muted`) from `variants.ts`. lucide icons only; `DM Sans`; Tailwind v3.4.
- A11y: `useFieldA11y` already in primitives; required indicators; errors below the field; `SearchableSelect` keyboard/ARIA. Validation only on visible fields.
- i18n: every label via `t(labelKey, { defaultValue: labelFallback })`; English fallback identical to current copy. Closes the deferred-instrumentation gap rather than re-hardcoding.

## 11. Testing strategy (TDD; jsdom/vitest harness)

1. **Family resolver** — each of the 18 catalog names → expected family; unmapped name → `'other'`.
2. **Config integrity** — every `DeviceFieldDef.storage` is valid; no duplicate `key` within a family; component rows are `control:'component-status'` with a `componentKey`; `BASIC_FIELDS` has the 7 fields.
3. **Serializer round-trip** — hydrate→serialize preserves hidden-field column **and** jsonb values; `technical_details`/`result` merges never drop untouched keys; firmware column↔legacy-jsonb fallback; `validateDeviceForm` flags required only for visible fields; diagnostics patch non-empty triggers save for a non-patient role.
4. **Renderer** — given a family, renders exactly the configured fields; switching family hides irrelevant fields while state retains values; `colSpan` honored.
5. **Regression** — `npm run typecheck` = 0 (CI gate); the `select('*')` read paths still receive every column.

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Hidden fields nulled on save (data loss) | Serializer merges json + carries all loaded columns; covered by round-trip test. |
| Firmware value diverges across two homes | Single canonical column + legacy fallback on load; test. |
| Diagnostics silently not saved (existing bug) | Serializer's explicit non-empty signal; save for all roles; test. |
| `interface_id` wired to wrong catalog | Loader bound to `catalog_interfaces` (verified FK target), not `catalog_device_interfaces`. |
| Wizard regression | No shared component; wizard files untouched; boundary asserted in §2.1. |
| New device type unmapped | Resolver defaults to `'other'` (safe minimal Technical set); add one config line to promote. |

## 13. Out of scope (explicit)

Create-Case intake wizard; donor-search query changes (capture now, query later); per-RAID-member structured diagnostics (free notes for now); DB `category` column on `catalog_device_types` (deferred — TS registry chosen); migrating legacy `result.firmware_version` data (handled by load-time fallback, not a data migration).
