import { describe, it, expect } from 'vitest';
import { assembleTypst } from './assemble';
import { ctxFromLanguageConfig } from '../translationContext';
import { BUILT_IN_TEMPLATE_CONFIGS, resolveTemplateConfig, type LanguageConfig } from '../templateConfig';
import type { EngineDocData } from '../engine/types';

const data = {
  documentTitle: { en: 'TAX INVOICE', ar: 'فاتورة ضريبية' },
  identity: { basic_info: { company_name: 'Acme Data Recovery' } },
  parties: {
    to: {
      title: { en: 'Customer Information', ar: 'معلومات العميل' },
      name: 'Jane Client',
      rows: [{ label: { en: 'Phone:', ar: 'الهاتف:' }, value: '+968 1234' }],
    },
  },
  meta: [{ label: { en: 'Invoice No:', ar: 'رقم الفاتورة:' }, value: 'INV-0032' }],
  lineItems: {
    columns: [
      { key: 'description', visible: true, label: { en: 'Description', ar: 'الوصف' }, align: 'left' },
      { key: 'lineTotal', visible: true, label: { en: 'Total', ar: 'المجموع' }, align: 'right' },
    ],
    rows: [{ description: 'RAID recovery', lineTotal: '2,000.000 OMR' }],
  },
  totals: [{ label: { en: 'Total:', ar: 'الإجمالي:' }, value: '2,100.000 OMR', emphasis: true }],
} as unknown as EngineDocData;

function cfg(language: LanguageConfig) {
  return resolveTemplateConfig(BUILT_IN_TEMPLATE_CONFIGS.invoice, undefined, { language });
}

describe('assembleTypst', () => {
  it('emits a Typst doc with fonts + LTR dir + resolved bilingual labels (Arabic secondary)', () => {
    const language = { mode: 'bilingual_sidebyside', primary: 'ar', secondary: 'ar' } as LanguageConfig;
    const c = cfg(language);
    const out = assembleTypst(data, c, ctxFromLanguageConfig(c.language));
    expect(out).toContain('Tajawal');
    // Always LTR layout (Typst still bidi-orders the Arabic within each run).
    expect(out).toContain('dir: ltr');
    expect(out).toContain('فاتورة ضريبية'); // title
    expect(out).toContain('معلومات العميل'); // party title
    expect(out).toContain('INV-0032'); // meta value
    expect(out).toContain('2,000.000 OMR'); // line item value
    expect(out).toContain('الإجمالي'); // totals label
    expect(out).toContain('#table('); // line-item table present
  });

  it('uses ltr dir for an English-only document', () => {
    const c = cfg({ mode: 'en', primary: 'en' } as LanguageConfig);
    const out = assembleTypst(data, c, ctxFromLanguageConfig(c.language));
    expect(out).toContain('dir: ltr');
    expect(out).toContain('TAX INVOICE');
  });

  it('escapes Typst metacharacters in data values', () => {
    const d2 = { ...data, meta: [{ label: { en: 'Ref:' }, value: 'A#1[x]' }] } as unknown as EngineDocData;
    const c = cfg({ mode: 'en', primary: 'en' } as LanguageConfig);
    const out = assembleTypst(d2, c, ctxFromLanguageConfig(c.language));
    expect(out).toContain('A\\#1\\[x\\]');
  });

  it('emits an #image when a logoPath is provided, and none otherwise', () => {
    const c = cfg({ mode: 'bilingual_sidebyside', primary: 'en', secondary: 'ar' } as LanguageConfig);
    const ctx = ctxFromLanguageConfig(c.language);
    expect(assembleTypst(data, c, ctx, { logoPath: '/logo.png' })).toContain('image("/logo.png"');
    expect(assembleTypst(data, c, ctx)).not.toContain('#align(center, image(');
  });
});
