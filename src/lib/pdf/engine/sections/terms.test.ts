import { describe, it, expect } from 'vitest';
import { renderTerms } from './terms';
import type { EngineContext, EngineDocData } from '../types';
import type { DocumentTemplateConfig, SectionConfig } from '../../templateConfig';

function collectText(node: unknown, out: string[]): void {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach((c) => collectText(c, out));
  const o = node as Record<string, unknown>;
  if (typeof o.text === 'string') out.push(o.text);
  Object.values(o).forEach((v) => collectText(v, out));
}

const DATA = {
  terms: {
    title: { en: 'Terms & Conditions', ar: 'الشروط والأحكام' },
    blocks: [{ title: { en: 'Terms & Conditions', ar: 'الشروط والأحكام' }, body: '50% advance to start.' }],
  },
  bank: {
    title: { en: 'Bank Account', ar: 'تفاصيل البنك' },
    rows: [{ label: { en: 'Account Name:', ar: 'اسم الحساب:' }, value: 'Future Space LLC' }],
  },
} as unknown as EngineDocData;

function engineWithSections(sections: Pick<SectionConfig, 'key' | 'visible' | 'order'>[]): EngineContext {
  return {
    config: { language: { mode: 'en', primary: 'en' }, sections } as unknown as DocumentTemplateConfig,
  } as EngineContext;
}

describe('renderTerms — movable bank section coordination', () => {
  it('renders the bank box inline when the standalone bank section is hidden (default layout)', () => {
    const out = renderTerms(
      engineWithSections([
        { key: 'terms', visible: true, order: 7 },
        { key: 'bank', visible: false, order: 8 },
      ]),
      DATA,
    );
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.some((t) => t.includes('Future Space LLC'))).toBe(true);
  });

  it('omits the inline bank box when the standalone bank section is visible (no double-render)', () => {
    const out = renderTerms(
      engineWithSections([
        { key: 'terms', visible: true, order: 7 },
        { key: 'bank', visible: true, order: 8 },
      ]),
      DATA,
    );
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.some((t) => t.includes('Future Space LLC'))).toBe(false);
    // Terms still render — only the bank moved out.
    expect(texts.some((t) => t.includes('50% advance to start.'))).toBe(true);
  });
});
