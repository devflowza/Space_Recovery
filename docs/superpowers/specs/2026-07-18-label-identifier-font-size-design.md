# Label Studio: Adjustable Identifier Font Size — Design

**Date**: 2026-07-18 · **Status**: Approved (user chose named presets)

## Problem

The identifier (e.g. `INV-00013`) auto-sizes to the largest that fits the label width, capped per layout (strip 11 pt, square 9 pt, card 12 pt) and floored at a legibility minimum. Tenants want to **bias that size** — bigger to fill the label, or smaller — without the code ever clipping or overflowing.

## Approach: a per-entity `idScale` multiplier

Add a per-entity **`idScale`** (a multiplier on the identifier's size **cap**), surfaced in Label Studio as a segmented **Small · Normal · Large · Extra-large** control. It biases the existing width-fitter rather than setting an absolute point size, so the fitter still shrinks a long code to fit the width — the identifier can never overflow horizontally, and (see below) never clips vertically.

- Presets → multipliers: **Small 0.85 · Normal 1.0 (default) · Large 1.25 · Extra-large 1.5**.
- Stored as a number in `label_printing` metadata; normalization clamps to `[0.5, 2.0]` and falls back to `1.0` for anything non-finite. **No DB migration.**
- Per-entity and rides the shared compact engine, so the control appears for case / stock / inventory (matches the alignment control). Default `1.0` = today's behavior, so existing tenants are unchanged.

**Why a multiplier, not an absolute pt:** absolute sizes clip on tiny stock or on long codes; the auto-fitter exists to prevent that. Scaling the *cap* keeps all that safety and just lets the tenant say "bigger/smaller".

## Overflow safety

Scaling *up* raises the width-fit cap, which is width-safe by construction (the fitter picks `min(scaledCap, widthThatFits)`, so a long code stays width-bounded and a short code grows only until width runs out). The remaining risk is **height**: a larger single code line could exceed a short strip (e.g. 40×12 mm). So every layout **height-clamps** the identifier so its line box never exceeds the available label height, keeping the legibility floor:

`idSize = max(minPt, min(widthFit(base × idScale), floor((availH / LINE_FACTOR) × 2) / 2))`

where `availH` is the height available to the code line (strip: `contentH`; card: `textZoneH`; square: `contentH`). Meta-line budgets already adapt to a larger id (fewer lines fit), and the vertical-centering added in the prior change absorbs the leftover space. Net: no clipping at any scale, on any stock.

## Config model — `company_settings.metadata.label_printing`

`labelPrefsService.ts`:
- `LabelPrintingPrefs.idScale: Record<LabelEntity, number>` (new; default `1.0`).
- `LabelEntityConfig.idScale: number` (new; projected).
- `buildDefaults` sets `idScale[e] = 1`; `normalizeLabelPrintingPrefs` reads `raw.idScale?.[e]` through `normalizeIdScale` (finite → clamp `[0.5, 2.0]`; else `1.0`).
- `labelEntityConfig` projects `idScale`; `mergeEntityConfig` (LabelStudio) writes `idAlign`-style `{ ...prefs.idScale, [entity]: cfg.idScale }`.

## Engine threading — `compactLabelDocument.ts`

- `CompactLabelOptions` gains `idScale?: number`; `buildCompactLabelDocument` resolves `const idScale = opts.idScale ?? 1` and passes it into `buildStrip` / `buildSquare` / `buildCard`.
- Each build function multiplies the identifier base it feeds to `idRowSize` / `fitFontSize` by `idScale`, then height-clamps the result (helper `heightCap(availH) = floor((availH / LINE_FACTOR) × 2) / 2`, applied as `max(minPt, min(idSize, heightCap(availH)))`).
  - **strip** (side-by-side, QR-on-top, and no-QR variants) → `availH = contentH` (the QR-on-top variant already height-bounds; keep it and apply the same clamp uniformly).
  - **square** → `availH = contentH`.
  - **card** → `availH = textZoneH`.
- `buildLabelBlobUrl` / `buildLabelBase64` / `buildAndEmit` already forward `CompactLabelOptions`, so `idScale` flows through unchanged. Print + preview derive it: `{ ...existing opts, idScale: cfg.idScale }` in `emitOptions` (print service) and `previewOptions` (preview).

## UI — `LabelStudio.tsx`

A segmented control under **Identifier alignment** (or beside it), labelled **Identifier size**, four buttons **S · Normal · L · XL** mapping to `0.85 / 1 / 1.25 / 1.5`, bound to `cfg.idScale`, styled with the same chrome as the alignment control (DESIGN.md tokens; `frontend-design` + `ui-ux-pro-max` at build). The preview effect deps gain `cfg.idScale` so the live preview re-renders on change.

## Files

| File | Change |
|---|---|
| `src/lib/labelPrefsService.ts` | `idScale` map + `LabelEntityConfig.idScale`; defaults/normalization (`normalizeIdScale`); projection; `mergeEntityConfig` |
| `src/lib/pdf/labels/compactLabelDocument.ts` | `idScale` in `CompactLabelOptions`; thread + height-clamp in `buildStrip`/`buildSquare`/`buildCard` |
| `src/lib/pdf/labels/labelPrintService.ts` | `emitOptions` adds `idScale: cfg.idScale` |
| `src/lib/pdf/labels/labelPreview.ts` | `previewOptions` adds `idScale`; preview forwards it |
| `src/components/settings/labels/LabelStudio.tsx` | Identifier-size segmented control + preview dep |

## Testing (TDD)

- `labelPrefsService.test.ts`: `idScale` defaults to `1` per entity; `normalizeIdScale` clamps `[0.5, 2.0]` and coerces non-finite → `1`; `labelEntityConfig` projects it.
- `compactLabelDocument.test.ts`: a scaled-up `idScale` yields a larger id `fontSize` than `idScale: 1` for a short code on the default strip; the size never exceeds the height cap on a short strip (40×12) at `idScale: 2`; `idScale < 1` shrinks it; a long code stays width-bounded regardless of scale.
- `LabelStudio.test.tsx`: choosing a size updates `cfg.idScale` and appears in the save payload (`idScale.inventory`).

## Boundaries

- **In:** `idScale` config + engine threading (all layouts, with height-clamp) + Studio control + tests.
- **Out:** absolute point sizes; per-field size control (only the identifier); changing the meta/QR sizing model.
- **Unchanged:** date fields, alignment, icon, QR/Code128, `download`/`open`, the QZ transport, `database.types.ts`.
- **PR:** lands on `claude/inventory-label-printer-v67p66`, folded into the open #426 (both are identifier-rendering refinements); #426 retitled to cover both.

## Verification (gate)

`npm run typecheck` (0); new + existing label suites green; full suite no new failures; eslint clean on touched files; build succeeds. Manual: in Label Studio, cycle Identifier size S→XL and confirm the preview grows/shrinks the code without clipping; check a short strip (40×12) at XL does not clip.
