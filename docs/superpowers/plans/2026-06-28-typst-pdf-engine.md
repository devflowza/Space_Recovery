# Typst PDF Engine — Implementation Plan (Phase 0 + invoice vertical slice)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or superpowers:subagent-driven-development to implement task-by-task. Steps use `- [ ]` checkboxes.

**Goal:** Stand up a client-side Typst rendering pipeline behind a flag and render a real bilingual (EN+AR) invoice end-to-end through it, proving the architecture in the live codebase.

**Architecture:** Keep `EngineDocData` → adapter → provability/email exactly as-is. Add a new renderer path: `EngineDocData` → **Typst markup assembler** → `typst.ts` (WASM) → PDF `Blob`. Typst (rustybuzz + Unicode bidi) does all shaping/RTL — so the assembler is far simpler than the pdfmake renderer (no `reverseArabicText`, no column mirroring, no font pinning). Gate behind a flag; pdfmake stays default.

**Tech Stack:** `@myriaddreamin/typst.ts` (browser WASM compiler) for production; `@myriaddreamin/typst-ts-node-compiler` (devDep) for vitest. Vite, TS, vitest. Reference: [spec](../specs/2026-06-28-typst-pdf-engine-design.md).

## Global Constraints

- tsc must stay at 0 errors (`npm run typecheck`); CI-enforced.
- Do not edit `database.types.ts`; no schema changes in this plan.
- Tokens/theme rules still apply to any UI; PDFs stay neutral (Typst templates carry their own fixed colors, like the pdfmake `PDF_COLORS`).
- Labels resolve through the EXISTING `resolveLabel`/`secondaryText`/`LabelText` — do NOT duplicate i18n. The Typst assembler consumes already-resolved strings.
- Lazy-load the Typst WASM (~10.4 MB gzip) — never in the initial bundle; load on first render/preview only.
- Local commits only; no push.

---

### Task 0: Install toolchain + add fonts

**Files:**
- Modify: `package.json` (add `@myriaddreamin/typst.ts`; devDep `@myriaddreamin/typst-ts-node-compiler`)
- Create: `public/fonts/NotoSansThai.ttf` (copy from scratchpad). NotoSansKR (~10 MB) deferred — note in spec; Korean renders once added (font-only, pipeline is font-agnostic).

- [ ] **Step 1:** `npm install @myriaddreamin/typst.ts@0.7.0 && npm install -D @myriaddreamin/typst-ts-node-compiler@0.7.0`
- [ ] **Step 2:** Copy `NotoSansThai.ttf` into `public/fonts/`.
- [ ] **Step 3:** `npm run typecheck` → 0 errors. Commit: `chore(pdf): add typst.ts toolchain + Noto Thai font`.

---

### Task 1: Typst markup assembler from EngineDocData (pure, unit-tested)

**Files:**
- Create: `src/lib/pdf/typst/escape.ts` — `escapeTypst(s: string): string` (escape Typst-significant chars: `\\ # $ [ ] * _ \` < > @ =` and newlines).
- Create: `src/lib/pdf/typst/assemble.ts` — `assembleTypst(data: EngineDocData, config: DocumentTemplateConfig, ctx: TranslationContext): string`.
- Test: `src/lib/pdf/typst/escape.test.ts`, `src/lib/pdf/typst/assemble.test.ts`

**Interfaces:**
- Consumes: `EngineDocData` (`src/lib/pdf/engine/types.ts`), `DocumentTemplateConfig`/`resolveLabel`/`resolveSecondary` (`src/lib/pdf/templateConfig.ts` + `engine/labels.ts`), `engineLayoutDirection` (`engine/rtl.ts`).
- Produces: `assembleTypst(...) => string` (a complete `.typ` document), `escapeTypst(s) => string`.

- [ ] **Step 1: Write failing test for escapeTypst**

```ts
import { describe, it, expect } from 'vitest';
import { escapeTypst } from './escape';

describe('escapeTypst', () => {
  it('escapes Typst markup metacharacters', () => {
    expect(escapeTypst('a #b $c [d]')).toBe('a \\#b \\$c \\[d\\]');
    expect(escapeTypst('100%')).toBe('100%'); // % is not special in content
    expect(escapeTypst('a*b_c')).toBe('a\\*b\\_c');
  });
  it('passes Arabic + numbers through unchanged', () => {
    expect(escapeTypst('المجموع الفرعي: 2,000.000 OMR')).toBe('المجموع الفرعي: 2,000.000 OMR');
  });
});
```

- [ ] **Step 2:** Run `npx vitest run src/lib/pdf/typst/escape.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement `escape.ts`**

```ts
// Escape characters Typst treats as markup so arbitrary data renders literally.
const SPECIAL = /[\\#$\[\]*_`<>@=]/g;
export function escapeTypst(s: string): string {
  return (s ?? '').replace(SPECIAL, (c) => `\\${c}`);
}
```

- [ ] **Step 4:** Run the test → PASS.
- [ ] **Step 5: Write `assemble.test.ts`** — assert the generated markup (a) sets a page + the font stack (`Tajawal`, `Noto Sans Arabic`, `Noto Sans Thai`, `Roboto`), (b) sets `text(dir: rtl)` when `engineLayoutDirection` is rtl, (c) contains the resolved title, a party title, a meta row label+value, a line-item value, and a totals label, (d) escapes a value containing `#`.

```ts
import { describe, it, expect } from 'vitest';
import { assembleTypst } from './assemble';
import { ctxFromLanguageConfig } from '../engine/translationContext';
import { BUILT_IN_TEMPLATE_CONFIGS, resolveTemplateConfig } from '../templateConfig';
import type { EngineDocData } from '../engine/types';

const data: EngineDocData = {
  documentTitle: { en: 'TAX INVOICE', ar: 'فاتورة ضريبية' },
  identity: { basic_info: { company_name: 'Acme' } },
  parties: { to: { title: { en: 'Customer Information', ar: 'معلومات العميل' }, name: 'Jane', rows: [{ label: { en: 'Phone:', ar: 'الهاتف:' }, value: '+1' }] } },
  meta: [{ label: { en: 'Invoice No:', ar: 'رقم الفاتورة:' }, value: 'INV-0032' }],
  totals: [{ label: { en: 'Total:', ar: 'الإجمالي:' }, value: '2,100.000 OMR', emphasis: true }],
} as EngineDocData;

function cfg(lang) { return resolveTemplateConfig(BUILT_IN_TEMPLATE_CONFIGS.invoice, undefined, { language: lang }); }

describe('assembleTypst', () => {
  it('emits a Typst doc with fonts, title, and resolved bilingual labels (AR primary → rtl)', () => {
    const language = { mode: 'bilingual_sidebyside', primary: 'ar', secondary: 'ar' } as const;
    const c = cfg(language);
    const out = assembleTypst(data, c, ctxFromLanguageConfig(c.language));
    expect(out).toContain('Tajawal');
    expect(out).toContain('dir: rtl');
    expect(out).toContain('فاتورة ضريبية');
    expect(out).toContain('معلومات العميل');
    expect(out).toContain('INV-0032');
    expect(out).toContain('الإجمالي');
  });
  it('escapes data metacharacters', () => {
    const d2 = { ...data, meta: [{ label: { en: 'Ref:' }, value: 'A#1[x]' }] } as EngineDocData;
    const c = cfg({ mode: 'en', primary: 'en' });
    const out = assembleTypst(d2, c, ctxFromLanguageConfig(c.language));
    expect(out).toContain('A\\#1\\[x\\]');
  });
});
```

- [ ] **Step 6:** Run `assemble.test.ts` → FAIL.
- [ ] **Step 7: Implement `assemble.ts`** — a function that builds a `.typ` string: page setup + `#set text(font: (...), dir: <ltr|rtl from engineLayoutDirection>)`, then emit each present section of `EngineDocData` (title, identity/company header, parties via a 2-col grid, meta rows, line-items `#table`, totals, terms, bank, payment history) using `resolveLabel(label, config.language)` for every label and `escapeTypst()` for every value. Keep it section-guarded (skip absent sections). No RTL/shaping logic — Typst handles it. (Full code written during execution; mirrors `engine/renderTemplate.ts` section order.)
- [ ] **Step 8:** Run `assemble.test.ts` → PASS. `npm run typecheck` → 0.
- [ ] **Step 9: Commit** `feat(pdf): Typst markup assembler from EngineDocData`.

---

### Task 2: Node-compiler smoke test — markup → valid, reproducible PDF with fonts

**Files:**
- Create: `src/lib/pdf/typst/typstEngine.node.test.ts` (node env)

- [ ] **Step 1: Write the test** — build `assembleTypst` markup for the bilingual AR invoice fixture, compile via `NodeCompiler` with `fontPaths` = `public/fonts`, assert: bytes start with `%PDF-`, length > 1000, and two compiles produce identical sha256 (reproducible).

```ts
import { describe, it, expect } from 'vitest';
import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { assembleTypst } from './assemble';
/* build `data` + bilingual AR config as in Task 1 */

describe('typst node render', () => {
  it('compiles the assembler output to a valid, reproducible PDF', () => {
    const markup = assembleTypst(/* data, cfg, ctx */);
    const c = NodeCompiler.create({ fontArgs: [{ fontPaths: [path.resolve('public/fonts')] }] });
    const a = Buffer.from(c.pdf({ mainFileContent: markup }));
    const b = Buffer.from(c.pdf({ mainFileContent: markup }));
    expect(a.slice(0, 5).toString()).toBe('%PDF-');
    expect(a.length).toBeGreaterThan(1000);
    expect(createHash('sha256').update(a).digest('hex')).toBe(createHash('sha256').update(b).digest('hex'));
  });
});
```

- [ ] **Step 2:** Run it → PASS (proves the assembler output is compilable + reproducible).
- [ ] **Step 3: Commit** `test(pdf): typst node-compiler render + reproducibility smoke test`.

---

### Task 3: Browser engine module (lazy WASM) + flag

**Files:**
- Create: `src/lib/pdf/typst/typstEngine.ts` — `renderTypstPdf(markup: string): Promise<Blob>` (lazy-init `@myriaddreamin/typst.ts`, load font bytes from `/fonts/*`, compile, return `application/pdf` Blob).
- Modify: `src/lib/featureFlag.ts` (or equivalent) — add `pdfEngineTypst` flag (build-time now; TODO: per-tenant runtime per spec).

**Interfaces:**
- Produces: `renderTypstPdf(markup) => Promise<Blob>`, `isTypstEngineEnabled() => boolean`.

- [ ] **Step 1:** Implement `typstEngine.ts`: dynamic `import('@myriaddreamin/typst.ts')`, configure the compiler/renderer WASM via Vite `?url` imports of the web-compiler/renderer `.wasm`, `fetch` the four font files from `/fonts/`, `addFont`/`addSource` per the typst.ts API, `compile → pdf` → `new Blob([bytes], { type: 'application/pdf' })`. Memoize init.
- [ ] **Step 2:** Add `isTypstEngineEnabled()` reading the flag (default off).
- [ ] **Step 3:** `npm run typecheck` → 0. Commit `feat(pdf): lazy browser Typst engine + flag`.

---

### Task 4: Wire Typst behind the flag in the preview path + verify

**Files:**
- Modify: `src/lib/pdf/engine/previewTemplate.ts` — when `isTypstEngineEnabled()`, render via `assembleTypst` + `renderTypstPdf` instead of `renderTemplate` + `createPdfWithFonts`.

- [ ] **Step 1:** Branch `previewTemplate` on the flag (Typst path returns the same `PreviewResult` `{ url, warnings }`).
- [ ] **Step 2:** `npm run typecheck` → 0; `npx vitest run src/lib/pdf` → green (existing tests unaffected; Typst path is flag-gated).
- [ ] **Step 3: Manual verify (localhost):** enable the flag, open Document Studio → invoice → EN+AR → confirm the preview renders correctly (Arabic shaped + bidi correct, currency grouped). Also render the assembler output to PNG via the Typst CLI for a self-check.
- [ ] **Step 4: Commit** `feat(pdf): route invoice preview through Typst behind flag`.

---

## Later phases (see spec §4)
Port remaining doc types' sections into the assembler (Phase 2, type-by-type behind the flag), paged-media + ZATCA QR (Phase 3), test re-baseline + preview cutover (Phase 4), decommission pdfmake + add NotoSansKR (Phase 5). Each is its own plan/iteration.
