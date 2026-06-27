# Document Engine — 13-Language Generalization (Design)

> Status: **approved** (owner: full generalization, before Phase 8). Branch `feat/document-studio`.
> Part of the Document Studio program (`2026-06-27-document-studio-design.md`).

## Context

The PDF document engine's bilingual model is **English+Arabic-baked**, but the platform supports **13 secondary
languages** (`SUPPORTED_LANGUAGES` in `documentTranslations.ts`: ar, pl, ru, fr, de, it, es, tr, ko, pt, uk, cs, th).
Three layers hardcode Arabic and must generalize — they are shared by **all 12 document types**:

1. **`LanguageConfig`** (`templateConfig.ts`): `mode: 'en'|'ar'|'bilingual_stacked'|'bilingual_sidebyside'` +
   `primary: 'en'|'ar'` — no field for *which* secondary language.
2. **Studio language picker** (`OtherDetailsTab.tsx`): four hardcoded Arabic options.
3. **Authored bilingual content** (Terms & Conditions, custom section labels, organization identity): stored as
   `LabelText = { en, ar }` — the second field is always Arabic.

Render-path split: layout direction comes from `config.language`; the translation `ctx`
(`createTranslationContext`) is built from the **tenant** setting only. So per-template language can't drive
translation, and only Arabic can be expressed per-template.

Already delivered (keep): standard labels translate to all 13 via `DOCUMENT_TRANSLATIONS` + `ctx.t`; the
tenant-level setting (Settings → Document) already supports 13 and drives document output. The gap is the
**per-template override** + **authored content** in non-Arabic languages, and **fonts** for non-Latin secondaries.

## Model changes

### `LanguageConfig` (generalize, backward-compatible)
```ts
type LanguageMode = 'en' | 'secondary' | 'bilingual_stacked' | 'bilingual_sidebyside';
interface LanguageConfig {
  mode: LanguageMode;
  secondary?: LanguageCode;        // which of the 13 (undefined ⇒ none / english_only)
  primary: 'en' | 'secondary';     // which language leads (RTL when secondary is RTL and leads)
}
```
- **Compat normalizer** `normalizeLanguageConfig()`: legacy `{mode:'ar'}` → `{mode:'secondary', secondary:'ar', primary:'secondary'}`; legacy `primary:'ar'` → `primary:'secondary', secondary:'ar'`; legacy `bilingual_*` with no secondary → `secondary:'ar'` (preserves today's behavior). Every read goes through it, so stored configs keep working with no JSONB migration.
- RTL = `isRTLLanguage(secondary)` (only `ar` today; model stays general).

### `LabelText` (generalize authored content)
```ts
interface LabelText { en: string; i18n?: Partial<Record<LanguageCode, string>>; }
```
- **Compat normalizer** `secondaryText(label, lang)`: returns `label.i18n?.[lang]` and, for backward-compat, treats a legacy `label.ar` as `i18n.ar`. A legacy reader accepts `{en, ar}` and exposes it as `{en, i18n:{ar}}`. No JSONB migration; new writes use `i18n`.
- All engine consumers that read `label.ar` switch to `secondaryText(label, ctx.secondary)`.

## Render path
- **Derive `ctx` from the resolved config**, not tenant-only: a new `ctxFromLanguageConfig(language)` builds the
  `TranslationContext` (mode + secondary + isRTL + font) from the per-template-resolved `LanguageConfig`. The
  `build*ViaEngine` orchestrators create `ctx` from the resolved+language-applied config so the per-template
  choice drives BOTH layout and translation. `applyTenantLanguage` keeps tenant as the fallback when the
  template is english-default, and now carries `secondary`.
- `bilingualLabelRuns` / `formatBilingualText` / `mirrorColumns` use `config.secondary` + `secondaryText(label, secondary)`.
- **Fonts**: extend `engineDefaultFont` + `initializePDFFonts` to load/select the font for the chosen secondary
  (ko→NotoSansKR, th→NotoSansThai, ja/zh if added, ar→Tajawal, Cyrillic ru/uk + Latin pl/cs/tr/etc.→Roboto).
  Preview preloads the active secondary's font.

## Studio UI
- **Language picker** (`OtherDetailsTab`): a **secondary-language dropdown (all 13 from `SUPPORTED_LANGUAGES`)** +
  a **layout mode** select (Single language / Bilingual — stacked / Bilingual — side by side). RTL auto from the
  secondary. "Arabic only" generalizes to "Secondary only".
- **Authored content fields** (Terms & Conditions, custom section labels, organization identity): EN field + a
  **secondary field whose label is the chosen language** ("Terms (French)", RTL when the secondary is RTL). Writes
  to `label.i18n[secondary]`.
- **Preview**: fix "Could not render the preview" — ensure the preview derives ctx from the config language,
  preloads the secondary font, and never throws on a missing translation/font (graceful EN fallback).

## Compatibility & migration
- **No JSONB data migration.** Runtime normalizers read legacy `{en, ar}` / `mode:'ar'` shapes; new writes use the
  generalized shape. Existing deployed templates + company_settings render unchanged.

## Test strategy
- All existing **doc-type parity tests stay green** (invoice/quote/receipt/label/payslip/CoC/report) — the
  normalizers guarantee legacy configs render identically.
- Add tests: `normalizeLanguageConfig` (legacy→general), `secondaryText` (legacy ar + new i18n), a non-Arabic
  bilingual render (e.g. EN+French label runs), and ctx-from-config precedence.
- `npm run typecheck` 0; `npx vitest run src/lib/pdf` green.

## Execution order (verified increments)
1. **Core model + normalizers** (`templateConfig.ts` LanguageConfig/LabelText, `locale`/helpers, `rtl.ts`,
   `applyTenantLanguage`, `ctxFromLanguageConfig`) — keep all parity green via normalizers. Commit.
2. **Render + fonts** (engine consumers read `secondaryText`; `engineDefaultFont`/`initializePDFFonts` per
   secondary; preview preload). Commit.
3. **Studio UI** (picker 13 + layout; authored-content secondary fields; preview fix). Commit.
4. **Verify** end-to-end on localhost across several languages; parity + typecheck green.
