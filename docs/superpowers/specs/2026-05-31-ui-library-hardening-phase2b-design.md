# UI Library Hardening — Phase 2b (Selects) Design

- **Date:** 2026-05-31
- **Status:** Draft for review
- **Program:** Phase 2b of the 5-phase hardening (Phase 2 = form controls, split 2a field-a11y / **2b selects**). Builds on Phase 0 (`cn`, jsdom harness, `ui.*`) and **Phase 2a** (`useFieldA11y`, `useAnchoredPosition`).
- **Evidence:** the Phase 2 mapping workflow (select profiles + `comboboxPattern` + sequencing) + firsthand reads.

---

## 1. Context & Goal

The three selects are the worst-a11y controls in the library: `<div onClick>` triggers with no combobox/listbox ARIA and partial/absent keyboard support. **MultiSelectDropdown is literally keyboard-unopenable** (`<div onClick>` trigger, no `tabIndex`/`onKeyDown`/`role`). Phase 2b makes all three real WAI-ARIA comboboxes, consuming the Phase 2a hooks plus one new focused keyboard hook, and de-dups the triplicated positioning + the SearchableSelect body.

**Consumer surface:** SearchableSelect **24**, PhoneInput **3** (7 sites), MultiSelectDropdown **3**. All refactors **preserve public APIs** (additive only) so consumers compile under `tsc=0`.

---

## 2. Scope

**In:** new **`useListboxKeyboard`** hook; adopt `useAnchoredPosition` (2a) + `useFieldA11y` (2a) + `useListboxKeyboard` in **PhoneInput**, **SearchableSelect**, **MultiSelectDropdown**; combobox/listbox ARIA + keyboard nav (fix the keyboard-unopenable MultiSelect); **de-dup** (SearchableSelect's ~75-line duplicated portal/inline body → one `renderListbox()`; the 3× positioning logic → `useAnchoredPosition`); token fixes (`bg-white`→`bg-surface` on dropdown surfaces, `ring-opacity-20`→`ring-primary/20`); copy → `t()`; behavior tests incl. keyboard nav.

**Out:** the field controls (done in 2a); any Phase 3 work.

**Guardrails:** public APIs additive-only (`Option` shape and `onChange(value)` semantics unchanged — numeric-id consumers depend on the string round-trip); `tsc=0` + 6 gates; neutral slate stays (no `surface-foreground`); the popups are **dismiss-on-outside-click, NOT focus-trapped** (a popup, not a modal — deliberately no `useFocusTrap`).

---

## 3. `useListboxKeyboard` (`src/hooks/useListboxKeyboard.ts`)

A focused roving-`aria-activedescendant` keyboard hook — the shared combobox keyboard contract, without owning open/filter/value state (which the three selects manage differently).

```ts
function useListboxKeyboard(opts: {
  open: boolean;
  itemCount: number;
  multiple?: boolean;          // multi: Enter/Space toggles & keeps panel open; single: selects & closes
  onOpen: () => void;
  onClose: () => void;         // also restores focus to the trigger (caller wires)
  onSelect: (index: number) => void;
  getOptionId: (index: number) => string;
}): {
  activeIndex: number;
  setActiveIndex: (i: number) => void;   // reset to -1 / 0 on filter change
  activeOptionId: string | undefined;    // for aria-activedescendant (undefined when -1)
  onKeyDown: (e: React.KeyboardEvent) => void;  // bind to the trigger and/or the in-panel search input
};
```

Behavior: ArrowDown/Up move active (clamp; ArrowDown when closed → `onOpen`); Home/End jump; Enter/Space → `onSelect(activeIndex)` (single → `onClose`; multi → stays open) with `preventDefault` to avoid form submit (Space inside a text search input types a literal space — the hook only intercepts Space when no search input owns it / caller decides); Escape → `onClose` + `setActiveIndex(-1)`; Tab → `onClose` (no trap). The component owns `scrollIntoView` via an effect on `activeIndex` (the hook is ref-free for jsdom-testability).

Tests (jsdom, `renderHook`): ArrowDown/Up move+clamp; ArrowDown-when-closed opens; Home/End; Enter selects (single closes via `onClose`, multi toggles + stays); Escape closes+resets; `activeOptionId` undefined at -1 else `getOptionId(active)`.

---

## 4. Shared combobox/listbox ARIA contract (applied in §5–§7)

- **Trigger:** `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded={open}`, `aria-controls={listboxId}`, `aria-activedescendant={activeOptionId}`, plus `useFieldA11y` label wiring (`id`, `aria-required`/`aria-invalid`/`aria-describedby`). MultiSelect/SearchableSelect triggers stay `<div>` + `tabIndex={disabled ? -1 : 0}` (lowest-risk for the `label=""` consumers) but become keyboard-operable.
- **Panel list:** `role="listbox"` `id={listboxId}` (+ `aria-multiselectable="true"` for MultiSelect).
- **Option rows:** `role="option"`, `id={listboxId + '-opt-' + option.id}` (keyed off `option.id`, **not** array index), `aria-selected`, `aria-disabled` when applicable.
- **In-panel search input:** keeps `aria-activedescendant`/`aria-controls`; DOM focus stays on it while the active option is tracked via activedescendant (focus does **not** move to options).
- **Empty state / counter:** `role="status"` (`aria-live="polite"`).
- **Icon-only buttons** (clear X, chip remove): `aria-label` via `t()`.

---

## 5. PhoneInput refactor (`src/components/ui/PhoneInput.tsx` — 3 consumers)

Per the mapping. Preserve the 9-prop API + the exported `PhoneCountry` interface (additive only); add `id?`, `hint?`, `name?` and **forward a ref to the `<input type=tel>`** (`forwardRef` — RHF). Adopt `useFieldA11y` (label↔tel input, error/required/hint). Replace the inline `calculatePosition`/listeners with **`useAnchoredPosition`** (`anchorRef` on the trigger button, `matchWidth:false, width:260, gap:4`); drop the `data-phone-trigger` querySelector. Apply the §4 combobox ARIA to the trigger + country listbox + options; wire `useListboxKeyboard` (single) to the search input (+ Home/End). Route the 4 hardcoded strings (`'Search country or code...'`, `'No countries found'`, `'+?'`, the country/countries count footer) through `t()` (`ui.phoneInput.*`, count interpolation). Migrate `ring-opacity-20`→`ring-primary/20`. **Preserve** `parsePhoneValue`/`buildFullValue`/`manualDialCode` round-trip exactly.

## 6. SearchableSelect refactor (`src/components/ui/SearchableSelect.tsx` — 24 consumers)

Preserve the full API (incl. `clearable` default **true**, `usePortal` default false, `Option {id,name,disabled?}`, `onChange(value:string)`); add `id?`, `error?`, `hint?`, `name?`, `className?`, and forward a ref to the trigger. **De-dup FIRST:** extract the duplicated search+list+add-new+count body into one `renderListbox()` rendered inline (placement-classed) when `!usePortal` or via `createPortal` when `usePortal` — collapse the two refs/search inputs to one. **Then** add §4 ARIA in the single body. Adopt `useAnchoredPosition` (`matchWidth:true, gap:0`) for the portal branch; `useFieldA11y` for label/error/hint/required; `useListboxKeyboard` (single) — keep the existing Arrow/Enter/Escape, add Home/End, and **restore focus to the trigger on close**. `aria-label` the clear X. Route default copy through `t()` as **defaults only** (`prop ?? t(key)` so overrides win): `'Select...'`, `'No options available'`, `'Add New'`, `'Search...'`, the count pluralization. `bg-white` dropdown surfaces → `bg-surface`.

## 7. MultiSelectDropdown refactor (`src/components/ui/MultiSelectDropdown.tsx` — 3 consumers)

The headline fix. Preserve API (`label` required, `value:string[]`, `onChange(string[])`, `Option{id,name}`, `placeholder?`, `required?`, `usePortal?`); add `id?`, `error?`, `hint?`, `name?`, `disabled?`, forward a ref. **Make the trigger keyboard-operable:** `<div>` → `role="combobox"` + `tabIndex={0}` + `onKeyDown` (Enter/Space/ArrowDown open, Escape close + restore focus), with §4 ARIA (`aria-haspopup`, `aria-expanded`, `aria-controls`, `aria-activedescendant`). Add `useListboxKeyboard` (**multiple:true** — Enter/Space toggles via the existing `toggleOption`, panel stays open); list `role="listbox"` `aria-multiselectable="true"`, options `role="option"` `aria-selected`. **`label="" → suppress the visible `<label>` but still mint `controlId` + an `aria-label` fallback** (CaseOverviewTab depends on this — no empty `<label>`). Adopt `useAnchoredPosition` (`matchWidth:true`); collapse the inline-vs-portal popup wrappers into one. Route copy through `t()` (`'Search...'`, `'No matching options'`/`'No options available'`, the `'{n} of {m} selected'` counter → `role="status"`); chip remove `aria-label` `t('ui.chipInput.removeEmail'…)`-style (generic `Remove {{name}}`). `bg-white` surfaces → `bg-surface`. Keep the `option.name?.toLowerCase()` null-guard.

## 8. i18n keys (en + ar, add-only)

New `ui.phoneInput.*` (`searchPlaceholder`, `noResults`, `dialCodePlaceholder`, `countryCount` w/ count) and `ui.select.*` (`placeholder`='Select...', `noOptions` [reuse `ui.noOptions`], `addNew`='Add New', `searchPlaceholder`='Search...', `optionCount` w/ count, `clear`='Clear', `selectedCount` [reuse `ui.selectedCount`], `removeItem`='Remove {{name}}', `noMatches`='No matching options', `selectItems`='Select items...'). Reuse existing `ui.*` where present.

## 9. Testing

`useListboxKeyboard.test.tsx` (§3). Per-component (`.test.tsx`):
- **MultiSelectDropdown** (critical): opens via **keyboard** (Enter/ArrowDown on the focused trigger) — proving the keyboard-unopenable defect is fixed; ArrowDown moves `aria-activedescendant`; Enter toggles selection (panel stays open, `aria-selected` flips); Escape closes + focus returns to trigger; `label=""` renders no `<label>` but the trigger has an accessible name; chip remove labeled.
- **SearchableSelect**: combobox roles + `aria-activedescendant`; keyboard select closes + commits + focus restore; `renderListbox` single source (one search input whether portal or not); clear-X labeled; default copy via `t()` over__ridden by prop.
- **PhoneInput**: combobox roles on the country picker; label↔tel-input association; forwarded ref reaches the tel input; dial-code round-trip preserved.

Existing suites stay green; `npm test` both projects.

## 10. Backward-compat & CI

Additive-only public APIs (new optional props + forwarded refs); `Option`/`onChange` semantics unchanged → all 30 select consumers compile (`tsc=0`). The new tabbable triggers change tab order inside modals — verify they cooperate with the Phase-1 `useFocusTrap` (the trigger is inside the dialog panel, so the trap includes it; the **select popup is not trapped**). No banned tokens.

## 11. Sequencing (one PR, ordered tasks)

1. `useListboxKeyboard` (+ tests).
2. `ui.phoneInput.*` + `ui.select.*` i18n keys.
3. PhoneInput refactor (exercises every `useAnchoredPosition` divergence + single combobox) (+ tests).
4. SearchableSelect: **de-dup body first**, then ARIA + hooks (+ tests).
5. MultiSelectDropdown: keyboard-operable combobox + multi (+ tests) — the critical fix.
6. Full verification (both projects, typecheck, lint) + manual-smoke notes.

## 12. Risks & mitigations

- **Portal positioning regressions** (DeviceFormModal/ServerBulkDrivesModal/CreateCaseWizard portal selects in scrollable modals): `useAnchoredPosition` must keep the fixed-position + capture-scroll/resize recompute — verified by its 2a tests + manual smoke.
- **`label=""` consumers** (MultiSelect CaseOverviewTab, SearchableSelect ChangeClientModal): suppress the empty `<label>`, keep an `aria-label` fallback + a real `controlId` — explicit test.
- **New tabbable trigger vs focus trap** in modals: trigger is inside the panel → included in the trap; popup not trapped — smoke-test DeviceFormModal.
- **De-dup before ARIA** in SearchableSelect: avoids editing every ARIA attr twice; do it as the first SearchableSelect step.
- **Numeric-id round-trip**: never change `onChange(value:string)` / `Option` shape.

## 13. Acceptance criteria

1. `useListboxKeyboard` built + tested.
2. All 3 selects are WAI-ARIA comboboxes (trigger `role=combobox` + `aria-expanded`/`haspopup`/`controls`/`activedescendant`; `role=listbox`/`option`/`aria-selected`); **MultiSelectDropdown opens and operates by keyboard** (the headline fix, tested).
3. `useAnchoredPosition` adopted in all 3 (positioning de-duped); SearchableSelect body de-duped to one `renderListbox`.
4. `useFieldA11y` label/error/hint association in all 3; `label=""` handled.
5. Public APIs additive-only; 30 select consumers compile (`tsc=0`); copy via `t()`; `bg-white`→`bg-surface`; no banned tokens.
6. All tests pass; existing suites green; lint clean; focus returns to the trigger on close; popups not focus-trapped.
