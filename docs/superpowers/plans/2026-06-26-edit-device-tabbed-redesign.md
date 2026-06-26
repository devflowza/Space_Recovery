# Edit Device — Dense Tabbed Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn the Edit/Add Device dialog into a dense, 4-tab, low-scroll workspace (Dialog flex shell + sticky footer + reusable Tabs primitive + `size="sm"` inputs), with a config-driven Diagnostic tab and the existing component grid moved to a Components tab. Reuse the config registry / renderer / serializer / family resolver.

**Architecture:** Build a `Tabs` primitive and a `size` cva variant on the input primitives, extend the field-config with `DIAGNOSTIC_FIELDS` + `staticOptions` + a `service_problems` catalog (zero migration — Diagnostic fields use dormant `case_devices` columns + the existing `device_diagnostics.result` write path), then rebuild `DeviceFormModal` as a `Dialog` flex column hosting four tab panels.

**Tech Stack:** React 19 + TS + Vite + TanStack Query v5 + Tailwind v3.4 (semantic tokens) + class-variance-authority + Headless UI `Dialog` + react-i18next + vitest/jsdom + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-06-26-edit-device-tabbed-redesign-design.md`

## Global Constraints

- **Branch:** `feat/device-details-dynamic-form` (continuation). **NEVER `git push` / open a PR** — user does one manual push at the very end. Local commits per task expected.
- **tsc baseline = 0 errors** (`npm run typecheck`). CI gate. `noUnusedLocals`/`noUnusedParameters` ON.
- **Tests:** `npm test` = `vitest run`. Co-locate: `*.test.ts` (node project, pure logic), `*.test.tsx` (dom/jsdom, components). i18n globally initialized in `src/test/setup.ts` — `t(key,{defaultValue})` resolves to fallback, no provider.
- **Theming (DESIGN.md):** semantic tokens only. Tabs use `cat-1..cat-4`; dividers `border-border`; surfaces `bg-surface`/`bg-surface-muted`; focus `ring-ring`; labels `text-sm font-medium text-slate-700`; required `text-danger`. NO `purple-*`/`indigo-*`/`violet-*`; NO status palette for tabs; NO raw hex. lucide icons only (NOT emojis). `DM Sans`. Tailwind v3.4 — no upgrade.
- **Types:** import `Database` from `src/types/database.types.ts` only. `maybeSingle()` not `single()`.
- **Frozen — do not edit:** `src/components/cases/CreateCaseWizard.tsx`, `src/components/cases/ServerBulkDrivesModal.tsx`. Do NOT edit `src/components/ui/Modal.tsx` (we bypass it).
- **Preserve in `DeviceFormModal`:** device-role gate, donor-from-inventory override, `setPrimaryDevice` RPC, `is_primary`, soft-delete, the hidden-field-preserve serialize contract (state ONLY from `hydrateDeviceForm`; serialize with default `ALL_FIELD_DEFS`), diagnostics upsert for all roles.

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/components/ui/Input.tsx` `Select.tsx` `SearchableSelect.tsx` `Textarea.tsx` `MultiSelectDropdown.tsx` | Edit | Add `size?: 'sm'\|'md'` cva variant (default `md` = current look). |
| `src/components/ui/Tabs.tsx` | Create | Accessible underline Tabs primitive (cat-colored, lucide icon, error-dot, disabled, arrow-key nav). |
| `src/lib/devices/deviceFieldConfig.ts` | Edit | `staticOptions` on `DeviceFieldDef`; `'service_problems'` CatalogKey; `DIAGNOSTIC_FIELDS`; include in `ALL_FIELD_DEFS`; updated integrity invariants. |
| `src/lib/diagnosticsTransform.ts` | Edit | Add `symptoms`,`diagnostic_status`,`recovery_chance`,`diagnostic_notes` to `RESULT_FIELDS` + `DeviceDiagnostics`. |
| `src/lib/devices/deviceCatalogQueries.ts` | Edit | `service_problems` source (`catalog_service_problems`, `valueField:'name'`). |
| `src/lib/queryKeys.ts` | Edit | `deviceServiceProblems` masterDataKey. |
| `src/components/cases/device-form/DeviceFieldRenderer.tsx` | Edit | `size="sm"`; `staticOptions ?? options`. |
| `src/components/cases/device-form/DeviceDetailsForm.tsx` | Edit | → Tab 1 body: dense 4-col merged Basic+Technical; drop collapsibles + components; add password + role_notes. |
| `src/components/cases/device-form/DeviceComponentsForm.tsx` | Create | Tab 3 body: component-status grid (dense). |
| `src/components/cases/device-form/DeviceDiagnosticForm.tsx` | Create | Tab 2 body: 3-col DIAGNOSTIC_FIELDS + full-width notes. |
| `src/components/cases/DeviceFormModal.tsx` | Edit | Dialog flex shell + context header + Tabs + sticky footer + tab panels + cross-tab validation. |

---

## Task 1: `size` cva variant on input primitives

**Files:** Edit `src/components/ui/Input.tsx`, `Select.tsx`, `SearchableSelect.tsx`, `Textarea.tsx`, `MultiSelectDropdown.tsx`; Test `src/components/ui/Input.test.tsx` (add cases).

**Interfaces:** Produces `size?: 'sm' | 'md'` on each primitive's props. `md` reproduces today's exact control classes (no visual change for existing callers). `sm` = denser.

- [ ] **Step 1: Read each primitive's current control className** to capture today's padding/text classes (e.g. `Input.tsx:42` `px-3 py-2`). The `md` variant MUST equal the current classes so existing usages are pixel-identical.

- [ ] **Step 2: Write the failing test** (append to `src/components/ui/Input.test.tsx`)

```tsx
import { render, screen } from '@testing-library/react';
import { Input } from './Input';

it('size="sm" applies dense control padding', () => {
  render(<Input aria-label="f" size="sm" />);
  expect(screen.getByLabelText('f').className).toMatch(/py-1\.5/);
});
it('default size keeps the standard control padding (no regression)', () => {
  render(<Input aria-label="g" />);
  expect(screen.getByLabelText('g').className).toMatch(/py-2/);
});
```

- [ ] **Step 3: Run → fail** `npm test -- Input` → FAIL (`size` not applied).

- [ ] **Step 4: Implement** — in each primitive, introduce a cva (or a `sizeClasses` map) for the control element:
```ts
const inputSize = { sm: 'px-3 py-1.5 text-sm', md: 'px-3 py-2 text-sm' } as const;
// component: size: 'sm' | 'md' = 'md'; apply cn(base, inputSize[size], ...stateClasses, className)
```
Apply the same `{sm,md}` map to `Select`, `SearchableSelect` (its trigger button), `Textarea`, `MultiSelectDropdown` (its trigger). Keep `md` equal to each component's current classes. `size` defaults to `'md'`. Place `className` LAST in `cn(...)` so callers can still override.

- [ ] **Step 5: Run → pass** `npm test -- Input SearchableSelect` → PASS (and existing primitive tests still green).

- [ ] **Step 6: Typecheck** `npm run typecheck` → 0.

- [ ] **Step 7: Commit**
```bash
git add src/components/ui/Input.tsx src/components/ui/Select.tsx src/components/ui/SearchableSelect.tsx src/components/ui/Textarea.tsx src/components/ui/MultiSelectDropdown.tsx src/components/ui/Input.test.tsx
git commit -m "feat(ui): add size sm/md variant to input primitives (md = current)"
```

---

## Task 2: `Tabs` primitive

**Files:** Create `src/components/ui/Tabs.tsx`, Test `src/components/ui/Tabs.test.tsx`.

**Interfaces:** Produces
```ts
export interface TabDef { id: string; label: string; icon?: React.ComponentType<{ className?: string }>; colorToken?: string; hasError?: boolean; disabled?: boolean }
export interface TabsProps { tabs: TabDef[]; activeId: string; onChange: (id: string) => void; className?: string }
export function Tabs(props: TabsProps): JSX.Element
```
`colorToken` is a token name like `'cat-1'` → active border/text `border-cat-1 text-cat-1` (default `primary`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/Tabs.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, type TabDef } from './Tabs';

const tabs: TabDef[] = [
  { id: 'a', label: 'Alpha', colorToken: 'cat-1' },
  { id: 'b', label: 'Beta', colorToken: 'cat-2', hasError: true },
  { id: 'c', label: 'Gamma', disabled: true },
];

describe('Tabs', () => {
  it('renders a tablist with aria-selected on the active tab', () => {
    render(<Tabs tabs={tabs} activeId="a" onChange={() => {}} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Alpha/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Beta/ })).toHaveAttribute('aria-selected', 'false');
  });
  it('calls onChange when a tab is clicked', async () => {
    const onChange = vi.fn(); const user = userEvent.setup();
    render(<Tabs tabs={tabs} activeId="a" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: /Beta/ }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
  it('does not fire onChange for a disabled tab', async () => {
    const onChange = vi.fn(); const user = userEvent.setup();
    render(<Tabs tabs={tabs} activeId="a" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: /Gamma/ }));
    expect(onChange).not.toHaveBeenCalled();
  });
  it('moves selection with ArrowRight (roving tabindex)', async () => {
    const onChange = vi.fn(); const user = userEvent.setup();
    render(<Tabs tabs={tabs} activeId="a" onChange={onChange} />);
    screen.getByRole('tab', { name: /Alpha/ }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
```

- [ ] **Step 2: Run → fail** `npm test -- Tabs` → FAIL (module not found).

- [ ] **Step 3: Implement**

```tsx
// src/components/ui/Tabs.tsx
import { useRef } from 'react';
import { cn } from '../../lib/utils';

export interface TabDef {
  id: string; label: string;
  icon?: React.ComponentType<{ className?: string }>;
  colorToken?: string; hasError?: boolean; disabled?: boolean;
}
export interface TabsProps {
  tabs: TabDef[]; activeId: string; onChange: (id: string) => void; className?: string;
}

export function Tabs({ tabs, activeId, onChange, className }: TabsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = tabs.filter(t => !t.disabled);

  const onKey = (e: React.KeyboardEvent) => {
    const idx = enabled.findIndex(t => t.id === activeId);
    if (idx < 0) return;
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % enabled.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + enabled.length) % enabled.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = enabled.length - 1;
    else return;
    e.preventDefault();
    onChange(enabled[next].id);
  };

  return (
    <div ref={ref} role="tablist" onKeyDown={onKey}
      className={cn('flex border-b border-border', className)}>
      {tabs.map(t => {
        const active = t.id === activeId;
        const color = t.colorToken ?? 'primary';
        const Icon = t.icon;
        return (
          <button key={t.id} type="button" role="tab"
            aria-selected={active} aria-controls={`panel-${t.id}`}
            id={`tab-${t.id}`} disabled={t.disabled}
            tabIndex={active ? 0 : -1}
            onClick={() => !t.disabled && onChange(t.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              t.disabled && 'opacity-40 cursor-not-allowed',
              active
                ? `border-${color} text-${color}`
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
            )}>
            {Icon && <Icon className="w-4 h-4" />}
            <span>{t.label}</span>
            {t.hasError && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-danger" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
```
> Note: Tailwind must see the dynamic `border-cat-1`/`text-cat-1`… classes. If the project purges them, add `cat-1`..`cat-4` border/text classes to the Tailwind safelist OR map colorToken→full class via a static record. Verify the cat tokens render; if purged, replace the template-literal with an explicit `{ 'cat-1': 'border-cat-1 text-cat-1', ... }` lookup and safelist as needed. Confirm before committing.

- [ ] **Step 4: Run → pass** `npm test -- Tabs` → PASS (4/4).

- [ ] **Step 5: Typecheck** → 0.

- [ ] **Step 6: Commit**
```bash
git add src/components/ui/Tabs.tsx src/components/ui/Tabs.test.tsx
git commit -m "feat(ui): accessible Tabs primitive (cat-colored underline, error-dot, arrow-key)"
```

---

## Task 3: Config — `staticOptions`, `service_problems`, `DIAGNOSTIC_FIELDS`

**Files:** Edit `src/lib/devices/deviceFieldConfig.ts`; Edit its test `src/lib/devices/deviceFieldConfig.test.ts`.

**Interfaces:** Produces `DeviceFieldDef.staticOptions?: { id: string; name: string }[]`; `CatalogKey` adds `'service_problems'`; `DIAGNOSTIC_FIELDS: DeviceFieldDef[]` (8 fields); `ALL_FIELD_DEFS` includes them.

- [ ] **Step 1: Write the failing tests** (append to `deviceFieldConfig.test.ts`)

```ts
import { DIAGNOSTIC_FIELDS, BASIC_FIELDS, getDeviceFamilyConfig, ALL_FIELD_DEFS, type DeviceFieldDef } from './deviceFieldConfig';

const FAMILIES = ['hdd','ssd','usb_flash','memory_card','mobile','raid','nas','other'] as const;
const everyField = (): DeviceFieldDef[] => [
  ...BASIC_FIELDS, ...DIAGNOSTIC_FIELDS,
  ...FAMILIES.flatMap(f => { const c = getDeviceFamilyConfig(f); return [...c.technical, ...c.components]; }),
];

it('DIAGNOSTIC_FIELDS has the 8 diagnostic keys', () => {
  expect(DIAGNOSTIC_FIELDS.map(f => f.key)).toEqual([
    'device_problem','symptoms_detail','recovery_requirement','initial_diagnosis',
    'evaluation_result','diagnostic_status','recovery_chance','diagnostic_notes',
  ]);
});
it('DIAGNOSTIC_FIELDS are in ALL_FIELD_DEFS', () => {
  for (const k of ['device_problem','diagnostic_status','diagnostic_notes'])
    expect(ALL_FIELD_DEFS.map(f => f.key)).toContain(k);
});
it('select fields declare optionsSource OR staticOptions', () => {
  for (const f of everyField()) {
    if (f.control === 'select' || f.control === 'multiselect' || f.control === 'component-status')
      expect(Boolean(f.optionsSource) || Boolean(f.staticOptions), `${f.key}`).toBe(true);
  }
});
it('no two distinct field keys share a storage target', () => {
  const seen = new Map<string, string>();
  for (const f of everyField()) {
    const sig = JSON.stringify(f.storage);
    if (seen.has(sig)) expect(seen.get(sig), `storage clash on ${sig}`).toBe(f.key);
    else seen.set(sig, f.key);
  }
});
it('diagnostic_status and recovery_chance carry staticOptions', () => {
  for (const k of ['diagnostic_status','recovery_chance']) {
    const f = DIAGNOSTIC_FIELDS.find(x => x.key === k)!;
    expect(f.staticOptions && f.staticOptions.length).toBeTruthy();
  }
});
```
> The "no two distinct keys share a storage target" test will dedupe identical-key repeats (component keys repeat across families with the SAME key) — guard by only comparing when the stored key differs. (The assertion above asserts `seen.get(sig) === f.key`, which holds for same-key repeats and fails only on a true clash.)

- [ ] **Step 2: Run → fail** `npm test -- deviceFieldConfig` → FAIL.

- [ ] **Step 3: Implement** in `deviceFieldConfig.ts`:
  1. Add to `DeviceFieldDef`: `staticOptions?: { id: string; name: string }[];`
  2. Add `'service_problems'` to the `CatalogKey` union.
  3. Add builders/constants:
```ts
const opt = (...names: string[]) => names.map(n => ({ id: n, name: n }));

export const DIAGNOSTIC_FIELDS: DeviceFieldDef[] = [
  { key: 'device_problem', labelKey: 'devices.field.device_problem', labelFallback: 'Device Problem',
    control: 'select', storage: col('symptoms'), optionsSource: 'service_problems' },
  { key: 'symptoms_detail', labelKey: 'devices.field.symptoms_detail', labelFallback: 'Symptoms',
    control: 'textarea', storage: dj('symptoms'), colSpan: 2 },
  { key: 'recovery_requirement', labelKey: 'devices.field.recovery_requirement', labelFallback: 'Recovery Requirement',
    control: 'textarea', storage: col('notes'), colSpan: 2 },
  { key: 'initial_diagnosis', labelKey: 'devices.field.initial_diagnosis', labelFallback: 'Initial Diagnosis',
    control: 'textarea', storage: col('diagnosis'), colSpan: 2 },
  { key: 'evaluation_result', labelKey: 'devices.field.evaluation_result', labelFallback: 'Evaluation Result',
    control: 'text', storage: col('recovery_result') },
  { key: 'diagnostic_status', labelKey: 'devices.field.diagnostic_status', labelFallback: 'Diagnostic Status',
    control: 'select', storage: dj('diagnostic_status'),
    staticOptions: opt('Pending', 'In Progress', 'Completed', 'Inconclusive') },
  { key: 'recovery_chance', labelKey: 'devices.field.recovery_chance', labelFallback: 'Estimated Recovery Chance',
    control: 'select', storage: dj('recovery_chance'),
    staticOptions: opt('High', 'Medium', 'Low', 'None') },
  { key: 'diagnostic_notes', labelKey: 'devices.field.diagnostic_notes', labelFallback: 'Diagnostic Notes',
    control: 'textarea', storage: dj('diagnostic_notes'), colSpan: 3 },
];
```
  4. In the `ALL_FIELD_DEFS` IIFE, `DIAGNOSTIC_FIELDS.forEach(push)` after `BASIC_FIELDS.forEach(push)`.
  > `col`, `dj` helpers already exist in the file. `colSpan: 3` is used by the Tab-2 grid; the Tab-1 grid maps colSpan 2→`lg:col-span-2`; the renderer/forms will interpret `colSpan` per their grid (Task 7/9).

- [ ] **Step 4: Run → pass** `npm test -- deviceFieldConfig` → PASS (all, incl. the new + the pre-existing integrity tests).

- [ ] **Step 5: Typecheck** → 0 (`CatalogKey` now includes `service_problems`; Task 5 wires its source).

- [ ] **Step 6: Commit**
```bash
git add src/lib/devices/deviceFieldConfig.ts src/lib/devices/deviceFieldConfig.test.ts
git commit -m "feat(devices): DIAGNOSTIC_FIELDS + staticOptions + service_problems CatalogKey"
```

---

## Task 4: diagnosticsTransform — 4 new result keys

**Files:** Edit `src/lib/diagnosticsTransform.ts`.

- [ ] **Step 1: Add to `RESULT_FIELDS`** (after the prior additions): `'symptoms'`, `'diagnostic_status'`, `'recovery_chance'`, `'diagnostic_notes'`.
- [ ] **Step 2: Add to `DeviceDiagnostics`** interface: `symptoms?: string; diagnostic_status?: string; recovery_chance?: string; diagnostic_notes?: string;`.
- [ ] **Step 3: Typecheck** → 0.
- [ ] **Step 4: Run diagnostics tests** `npm test -- diagnostics` → PASS (additive, no regression).
- [ ] **Step 5: Commit**
```bash
git add src/lib/diagnosticsTransform.ts
git commit -m "feat(diagnostics): add symptoms/diagnostic_status/recovery_chance/diagnostic_notes result keys"
```

---

## Task 5: `service_problems` catalog source

**Files:** Edit `src/lib/devices/deviceCatalogQueries.ts`, `src/lib/queryKeys.ts`; Edit `deviceCatalogQueries.test.ts`.

- [ ] **Step 1: Add `deviceServiceProblems` to `masterDataKeys`** in `queryKeys.ts`:
```ts
  deviceServiceProblems: () => ['master', 'device-service-problems'] as const,
```
- [ ] **Step 2: Add the source** to `CATALOG_SOURCES` in `deviceCatalogQueries.ts`:
```ts
  service_problems: { table: 'catalog_service_problems', orderBy: 'name', valueField: 'name', queryKey: masterDataKeys.deviceServiceProblems() },
```
(`valueField:'name'` already exists from the prior component-status fix; reuse it.)
- [ ] **Step 3: Add a test** (append) asserting `CATALOG_SOURCES.service_problems` exists with `valueField === 'name'` and `table === 'catalog_service_problems'`; keep the coverage test.
- [ ] **Step 4: Run** `npm test -- deviceCatalogQueries` → PASS; **typecheck** → 0.
- [ ] **Step 5: Commit**
```bash
git add src/lib/devices/deviceCatalogQueries.ts src/lib/queryKeys.ts src/lib/devices/deviceCatalogQueries.test.ts
git commit -m "feat(devices): service_problems catalog source (name-valued) for Device Problem select"
```

---

## Task 6: DeviceFieldRenderer — `size="sm"` + `staticOptions`

**Files:** Edit `src/components/cases/device-form/DeviceFieldRenderer.tsx`; Edit `DeviceFieldRenderer.test.tsx`.

- [ ] **Step 1: Write the failing test** (append)
```tsx
import type { DeviceFieldDef } from '../../../lib/devices/deviceFieldConfig';
const staticDef: DeviceFieldDef = {
  key: 'diagnostic_status', labelKey: 'devices.field.diagnostic_status', labelFallback: 'Diagnostic Status',
  control: 'select', storage: { table: 'device_diagnostics', kind: 'json', jsonKey: 'diagnostic_status' },
  staticOptions: [{ id: 'Pending', name: 'Pending' }, { id: 'Completed', name: 'Completed' }],
};
it('uses staticOptions for a select with no catalog options', () => {
  render(<DeviceFieldRenderer def={staticDef} value="" onChange={() => {}} options={[]} />);
  expect(screen.getByRole('combobox')).toBeInTheDocument();
});
```
- [ ] **Step 2: Run → fail** `npm test -- DeviceFieldRenderer` (the new case fails or the combobox has no options).
- [ ] **Step 3: Implement** — in the `select`/`component-status` branch, compute `const opts = def.staticOptions ?? options;` and pass `options={opts}`. Pass `size="sm"` to `Input`, `Textarea`, `SearchableSelect`, `MultiSelectDropdown` in every branch.
- [ ] **Step 4: Run → pass** `npm test -- DeviceFieldRenderer` → PASS (existing 2 + new).
- [ ] **Step 5: Typecheck** → 0.
- [ ] **Step 6: Commit**
```bash
git add src/components/cases/device-form/DeviceFieldRenderer.tsx src/components/cases/device-form/DeviceFieldRenderer.test.tsx
git commit -m "feat(devices): DeviceFieldRenderer size=sm + staticOptions support"
```

---

## Task 7: DeviceDetailsForm → Tab 1 (dense 4-col)

**Files:** Edit `src/components/cases/device-form/DeviceDetailsForm.tsx`; Edit `DeviceDetailsForm.test.tsx`.

**Goal:** Tab-1 body only. Props gain the modal-owned password/role_notes controls passed in (or rendered by a small sub-section). Keep it a controlled component (state from parent).

**Interfaces:** `DeviceDetailsForm({ state, onChange, options, errors }: Props)` — same signature; now renders a dense single grid + a security/notes footer area. (Password + role_notes are modal-owned structural fields; render them via a `children` slot OR new props. Recommended: add `extraFooter?: React.ReactNode` prop the modal fills with the password + role_notes controls, so this component stays config-driven for the grid only.)

- [ ] **Step 1: Update the test** to assert the dense layout:
```tsx
it('renders merged Basic+Technical in one grid with no CollapsibleSection chrome', () => {
  render(<DeviceDetailsForm state={{ device_type_id: HDD_ID }} onChange={vi.fn()} options={options} />);
  // Basic + a HDD technical field both present, no "Component Diagnostics" section title
  expect(screen.getByText(/Serial Number/i)).toBeInTheDocument();
  expect(screen.getByText('Physical Head Map')).toBeInTheDocument();
  expect(screen.queryByText('Component Diagnostics')).not.toBeInTheDocument();
});
it('does not render component-status fields (moved to Components tab)', () => {
  render(<DeviceDetailsForm state={{ device_type_id: HDD_ID }} onChange={vi.fn()} options={options} />);
  // "Heads" component-status label should be absent here
  expect(screen.queryByText(/^Heads$/)).not.toBeInTheDocument();
});
```
(Reuse the existing test's `options`/`HDD_ID`/`SSD_ID` fixtures.)

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement** — replace the 3 `CollapsibleSection`s with one grid:
```tsx
const fields = [...BASIC_FIELDS, ...cfg.technical];
return (
  <div className="space-y-3">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
      {fields.map(def => (
        <div key={def.key} className={def.colSpan === 2 ? 'lg:col-span-2' : undefined}>
          <DeviceFieldRenderer def={def} value={state[def.key]} onChange={onChange}
            options={def.optionsSource ? (options[def.optionsSource] ?? []) : []} error={errors?.[def.key]} />
        </div>
      ))}
    </div>
    {extraFooter}
  </div>
);
```
Remove the `CollapsibleSection` import, the `diagOpen` state, and the components rendering. Keep `resolveDeviceFamily`/`getDeviceFamilyConfig`. Add `extraFooter?: React.ReactNode` to Props.

- [ ] **Step 4: Run → pass** `npm test -- DeviceDetailsForm` → PASS.
- [ ] **Step 5: Typecheck** → 0.
- [ ] **Step 6: Commit**
```bash
git add src/components/cases/device-form/DeviceDetailsForm.tsx src/components/cases/device-form/DeviceDetailsForm.test.tsx
git commit -m "feat(devices): DeviceDetailsForm -> dense 4-col Tab 1 (drop collapsibles + components)"
```

---

## Task 8: DeviceComponentsForm (Tab 3)

**Files:** Create `src/components/cases/device-form/DeviceComponentsForm.tsx`, Test `DeviceComponentsForm.test.tsx`.

**Interfaces:** `DeviceComponentsForm({ state, onChange, options, errors }: Props)` — same prop shape as DeviceDetailsForm; renders `getDeviceFamilyConfig(family).components` in a dense grid; family from `state.device_type_id` via `options.device_types`.

- [ ] **Step 1: Write the failing test**
```tsx
// renders HDD component statuses (Heads/PCB/Motor...) in a grid; empty for 'other'
it('renders component-status fields for an HDD family', () => {
  render(<DeviceComponentsForm state={{ device_type_id: HDD_ID }} onChange={vi.fn()} options={options} />);
  expect(screen.getByText('Heads')).toBeInTheDocument();
  expect(screen.getByText('PCB')).toBeInTheDocument();
});
it('renders an empty-state when the family has no components', () => {
  render(<DeviceComponentsForm state={{ device_type_id: OTHER_ID }} onChange={vi.fn()} options={{ ...options, device_types: [{ id: OTHER_ID, name: 'DVR/Camera' }] }} />);
  expect(screen.getByText(/no component/i)).toBeInTheDocument();
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** — mirror DeviceDetailsForm's grid but over `cfg.components`, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3`; if `cfg.components.length === 0`, render `<p className="text-sm text-slate-500">{t('devices.section.noComponents',{defaultValue:'No component checks for this device type.'})}</p>`.
- [ ] **Step 4: Run → pass.** **Step 5: Typecheck → 0.**
- [ ] **Step 6: Commit**
```bash
git add src/components/cases/device-form/DeviceComponentsForm.tsx src/components/cases/device-form/DeviceComponentsForm.test.tsx
git commit -m "feat(devices): DeviceComponentsForm (Tab 3 component-status grid)"
```

---

## Task 9: DeviceDiagnosticForm (Tab 2)

**Files:** Create `src/components/cases/device-form/DeviceDiagnosticForm.tsx`, Test `DeviceDiagnosticForm.test.tsx`.

**Interfaces:** `DeviceDiagnosticForm({ state, onChange, options, errors }: Props)` — renders `DIAGNOSTIC_FIELDS` in a 3-col grid; `colSpan:2`→`lg:col-span-2`, `colSpan:3`→`lg:col-span-3`. No password.

- [ ] **Step 1: Write the failing test**
```tsx
import { DeviceDiagnosticForm } from './DeviceDiagnosticForm';
const opts = { service_problems: [{ id: 'No power', name: 'No power' }] } as Record<string, {id:string;name:string}[]>;
it('renders the diagnostic fields incl. Device Problem combobox and full-width Diagnostic Notes', () => {
  render(<DeviceDiagnosticForm state={{}} onChange={vi.fn()} options={opts} />);
  expect(screen.getByText('Device Problem')).toBeInTheDocument();
  expect(screen.getByText('Diagnostic Status')).toBeInTheDocument();
  expect(screen.getByText('Diagnostic Notes')).toBeInTheDocument();
});
it('does not render a device password field', () => {
  render(<DeviceDiagnosticForm state={{}} onChange={vi.fn()} options={opts} />);
  expect(screen.queryByText(/password/i)).not.toBeInTheDocument();
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**
```tsx
import { useTranslation } from 'react-i18next';
import { DeviceFieldRenderer } from './DeviceFieldRenderer';
import { DIAGNOSTIC_FIELDS } from '../../../lib/devices/deviceFieldConfig';
import type { CatalogOption } from '../../../lib/devices/deviceCatalogQueries';

interface Props { state: Record<string, unknown>; onChange: (k: string, v: unknown) => void; options: Record<string, CatalogOption[]>; errors?: Record<string, string> }
export function DeviceDiagnosticForm({ state, onChange, options, errors = {} }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
      {DIAGNOSTIC_FIELDS.map(def => (
        <div key={def.key} className={def.colSpan === 3 ? 'lg:col-span-3' : def.colSpan === 2 ? 'lg:col-span-2' : undefined}>
          <DeviceFieldRenderer def={def} value={state[def.key]} onChange={onChange}
            options={def.optionsSource ? (options[def.optionsSource] ?? []) : []} error={errors[def.key]} />
        </div>
      ))}
    </div>
  );
}
```
- [ ] **Step 4: Run → pass.** **Step 5: Typecheck → 0.**
- [ ] **Step 6: Commit**
```bash
git add src/components/cases/device-form/DeviceDiagnosticForm.tsx src/components/cases/device-form/DeviceDiagnosticForm.test.tsx
git commit -m "feat(devices): DeviceDiagnosticForm (Tab 2, config-driven, no password)"
```

---

## Task 10: DeviceFormModal — Dialog shell + tabs + sticky footer

**Files:** Edit `src/components/cases/DeviceFormModal.tsx`; Edit `DeviceFormModal.test.tsx`.

This is the integration. Rebuild the shell while preserving all behavior from the prior feature.

- [ ] **Step 1: Read the current file fully.** Note: it currently uses `<Modal …>`; the structural payload writes `symptoms`/`notes` (move these to config — they're now in `DIAGNOSTIC_FIELDS`, so REMOVE them from the structural payload to avoid double-write); password + role_notes stay structural; `detailState` is hydrated via `hydrateDeviceForm`; save uses `serializeDeviceForm` + `upsertDeviceDiagnostics`.

- [ ] **Step 2: Replace the `<Modal>` shell with a `Dialog` flex column.** Import `Dialog` (Headless UI — match how `CreateCaseWizard.tsx` imports/uses it). Structure:
```tsx
<Dialog open={isOpen} onClose={onClose} className="relative z-50">
  <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <Dialog.Panel className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col rounded-xl bg-surface shadow-xl">
      {/* Fixed header */}
      <div className="shrink-0 border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <Dialog.Title className="text-lg font-semibold text-slate-900">{isEditMode ? 'Edit Device' : 'Add Device'}</Dialog.Title>
        </div>
        {/* context row: Device Role + is_primary (+ donor picker handled in Tab 1 body) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{/* device_role SearchableSelect size=sm + is_primary toggle */}</div>
        <Tabs tabs={tabDefs} activeId={activeTab} onChange={setActiveTab} />
      </div>
      {/* Scrolling body */}
      <div className="flex-1 overflow-y-auto px-4 py-3" id={`panel-${activeTab}`} role="tabpanel">
        {activeTab === 'details' && <DeviceDetailsForm state={detailState} onChange={onDetailChange} options={deviceCatalogs} errors={detailErrors} extraFooter={passwordAndRoleNotes} />}
        {activeTab === 'diagnostic' && <DeviceDiagnosticForm state={detailState} onChange={onDetailChange} options={deviceCatalogs} errors={detailErrors} />}
        {activeTab === 'components' && <DeviceComponentsForm state={detailState} onChange={onDetailChange} options={deviceCatalogs} errors={detailErrors} />}
        {activeTab === 'history' && <div className="text-sm text-slate-500 py-8 text-center">{t('devices.tab.historySoon',{defaultValue:'Device history & activity — coming soon.'})}</div>}
      </div>
      {/* Sticky footer */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-t border-border bg-surface-muted">
        <div>{isEditMode && <Button variant="danger" size="sm" onClick={()=>setShowDeleteConfirm(true)}>Delete</Button>}</div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>Save Changes</Button>
        </div>
      </div>
    </Dialog.Panel>
  </div>
</Dialog>
```
- [ ] **Step 3: Tab defs + donor disabling.**
```tsx
import { HardDrive, Stethoscope, Cpu, History } from 'lucide-react';
const tabDefs = [
  { id: 'details', label: t('devices.tab.details',{defaultValue:'Device Details'}), icon: HardDrive, colorToken: 'cat-1', hasError: detailErrors.device_type_id != null },
  { id: 'diagnostic', label: t('devices.tab.diagnostic',{defaultValue:'Diagnostic'}), icon: Stethoscope, colorToken: 'cat-2', disabled: isDonorRole },
  { id: 'components', label: t('devices.tab.components',{defaultValue:'Components'}), icon: Cpu, colorToken: 'cat-3', disabled: isDonorRole },
  { id: 'history', label: t('devices.tab.history',{defaultValue:'History / Activity'}), icon: History, colorToken: 'cat-4', disabled: true },
];
```
- [ ] **Step 4: Relocate Device Password into Tab 1** via the `extraFooter` slot: a `passwordAndRoleNotes` node = a full-width `Input type={showPw?'text':'password'} size="sm"` with an Eye/EyeOff toggle button + the `role_notes` `Textarea size="sm"`. Use the `Input`/`Textarea` primitives (replace the prior hand-rolled raw inputs). Keep the existing `formData.password`/`role_notes` state + writes.

- [ ] **Step 5: Shrink the structural payload** in `handleSubmit`: remove `symptoms` and `notes` from the structural object (they are now config fields written by `serializeDeviceForm`'s `devicePatch`). Keep `device_role_id`, `password`, `role_notes`. Everything else in the save handler (validate visible-only, serialize, donor override, update/insert, setPrimaryDevice, diagnostics upsert for all roles) stays. NOTE: `validateDeviceForm` visible set should now include the active concerns — keep `[...BASIC_FIELDS, ...getDeviceFamilyConfig(family).technical]` (Device Type required lives in Tab 1); diagnostic fields are not required.

- [ ] **Step 6: Cross-tab validation on Save.** Before aborting on invalid, if `detailErrors`/validation shows `device_type_id` missing, `setActiveTab('details')` so the error is visible. (Device Role lives in the always-visible header.)

- [ ] **Step 7: Update the smoke test** `DeviceFormModal.test.tsx` to the new shell: assert the 4 tab buttons render (`getByRole('tab', {name:/Device Details/})` etc.), the footer Save button is present, and switching to the Diagnostic tab shows a diagnostic field (when not donor). Keep it light (mock the same way the existing smoke test does).

- [ ] **Step 8: Typecheck** → 0 (cast supabase payloads at the boundary as before).
- [ ] **Step 9: Full suite** `npm test` → green except the 2 known pre-existing `invoicePilot.test.ts` failures. Report counts.
- [ ] **Step 10: Manual smoke (note for user):** browser check — open Edit Device, confirm tabs switch without scroll, dense 4-col grid on Tab 1, Diagnostic tab fields save, density visibly tighter. (Defer to user; not blocking.)
- [ ] **Step 11: Commit**
```bash
git add src/components/cases/DeviceFormModal.tsx src/components/cases/DeviceFormModal.test.tsx
git commit -m "feat(devices): Edit Device dense tabbed shell (Dialog + Tabs + sticky footer)"
```

---

## Task 11: Final gate

- [ ] **Step 1:** `npm run typecheck` → 0.
- [ ] **Step 2:** `npm test` → all pass except the 2 pre-existing `invoicePilot.test.ts`. Report exact counts + any new failure (investigate, don't mask).
- [ ] **Step 3:** `npm run lint` → fix any issue in files THIS work created/changed (devices/device-form/ui Tabs+primitives, DeviceFormModal). Pre-existing unrelated warnings: report only.
- [ ] **Step 4:** Verify density: spot-check that `DeviceDetailsForm` has no `CollapsibleSection` import and the grid uses `lg:grid-cols-4`; the modal footer is in a `shrink-0` region (sticky).
- [ ] **Step 5: Commit** any lint fixes:
```bash
git add -A && git commit -m "chore(devices): final gate — lint/typecheck for tabbed redesign"
```

---

## Self-Review (author)

**Spec coverage:** §4 shell (T10) · §5 Tabs (T2) · §6 size variant (T1, T6) · §7 Tab1 (T7) / Tab2 (T9) / Tab3 (T8) / Tab4 placeholder (T10) · §8 config+storage (T3,T4,T5) · §9 modal save/structural-shrink/validation (T10) · §11 theming (all UI tasks) · §12 tests (every task). Decisions: categorical cat-1..4 (T2/T10), lucide icons (T10), two distinct Problem/Symptoms (T3), component grid in Tab3 (T8), pragmatic zero-migration diagnostics (T3/T4 — no migration task exists, as intended).

**Placeholder scan:** none. The Tailwind dynamic-class caveat for `border-cat-N` (T2 Step 3 note) is called out with a concrete fallback (static lookup + safelist) to verify before commit.

**Type consistency:** `DeviceFieldDef.staticOptions`, `CatalogKey += 'service_problems'`, `DIAGNOSTIC_FIELDS`, `Tabs`/`TabDef`/`TabsProps`, `size:'sm'|'md'` used consistently across T1–T10. `serializeDeviceForm`/`hydrateDeviceForm` unchanged — diagnostic fields ride `ALL_FIELD_DEFS`. `diagnostic_notes` uses its OWN result key (not `technical_notes`) — no storage clash (guarded by T3's new invariant).

**Risk:** T10 is the large integration (Dialog shell rewrite preserving the donor/serialize/diagnostics behavior). Reviewed most carefully; gated by full suite + the structural-shrink double-write check.
