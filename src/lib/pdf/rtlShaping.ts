/**
 * Arabic shaping + bidi reordering for pdfmake doc-definitions.
 *
 * ── WHY ──────────────────────────────────────────────────────────────────────
 * pdfmake/pdfkit has NO Unicode Bidirectional Algorithm pass. Multi-word Arabic
 * and mixed Arabic/Latin/number text therefore render with reversed words,
 * collapsed spaces and mis-placed punctuation (e.g. 'معلومات العميل' →
 * 'العميلمعلومات', 'المجموع الفرعي:' with the colon in the middle). The previous
 * mitigation (`reverseArabicText`, a naive word-reversal) fixed plain headers but
 * broke punctuated labels.
 *
 * ── HOW ──────────────────────────────────────────────────────────────────────
 * This replaces that hack with a real two-step pass, applied to the FINAL
 * doc-definition right before rasterization (so the logical doc-definition the
 * engine tests assert stays unchanged):
 *   1. {@link reshaper.convertArabic} — joins logical-order Arabic letters into
 *      Unicode PRESENTATION FORMS. pdfmake's fontkit shaping does not re-process
 *      presentation forms (they are GSUB *output*, not joining *input*), and the
 *      bundled Tajawal/Noto fonts include them, so no double-shaping occurs.
 *   2. {@link bidi.getReorderedString} — the Unicode BiDi Algorithm reorders the
 *      now-shaped text into VISUAL order for the paragraph base direction, so
 *      pdfmake's left-to-right glyph placement reads correctly. Numbers and Latin
 *      runs keep their own direction; punctuation lands on the correct side.
 *
 * Applied only when a document actually carries Arabic (the engine gates on the
 * resolved secondary being `ar`); non-Arabic strings are returned untouched.
 */

import bidiFactory from 'bidi-js';
import reshaper from 'arabic-reshaper';

const bidi = bidiFactory();

/** Matches any Arabic-script codepoint (base blocks + presentation forms). */
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export type BaseDir = 'ltr' | 'rtl';

/**
 * Reshape + bidi-reorder a single string into visual order. A no-op (returns the
 * input unchanged) when the string contains no Arabic, so it is safe to apply to
 * every run of a mixed-language document.
 *
 * @param baseDir The paragraph base direction — `'rtl'` for an Arabic-led
 *   document, `'ltr'` for an English-led document whose secondary is Arabic.
 *   Pure-Arabic segments reorder correctly under either base.
 */
export function shapeRtlString(text: string, baseDir: BaseDir = 'rtl'): string {
  if (!text || !ARABIC_RE.test(text)) return text;
  const reshaped = reshaper.convertArabic(text);
  const levels = bidi.getEmbeddingLevels(reshaped, baseDir);
  return bidi.getReorderedString(reshaped, levels);
}

/**
 * Deep-walk a pdfmake doc-definition and shape every `text` value in place
 * (handles a plain string, an array of inline runs, and string entries inside a
 * runs array). Recurses through every container (columns, stack, table.body, ul,
 * ol, …). Returns the same node for convenience. Mutates in place — the caller
 * owns a freshly-built per-render definition, so mutation is safe and avoids
 * deep-cloning a large tree.
 */
export function shapeDocDefinitionArabic<T>(node: T, baseDir: BaseDir = 'rtl'): T {
  walk(node, baseDir);
  return node;
}

function walk(node: unknown, baseDir: BaseDir): void {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, baseDir);
    return;
  }
  const obj = node as Record<string, unknown>;
  const t = obj.text;
  if (typeof t === 'string') {
    obj.text = shapeRtlString(t, baseDir);
  } else if (Array.isArray(t)) {
    obj.text = t.map((run) => {
      if (typeof run === 'string') return shapeRtlString(run, baseDir);
      if (run && typeof run === 'object' && typeof (run as { text?: unknown }).text === 'string') {
        return { ...run, text: shapeRtlString((run as { text: string }).text, baseDir) };
      }
      return run;
    });
  }
  for (const key of Object.keys(obj)) {
    if (key === 'text') continue;
    walk(obj[key], baseDir);
  }
}
