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

// The Typst (Arabic) path must honour config.typography — both the global font
// scale ("Fine-tune scale") and the per-section size overrides — exactly like the
// pdfmake path. Before this, every size was hardcoded so the controls no-opped.
describe('assembleTypst — typography (global scale + per-section sizes)', () => {
  const cfgT = (typography: unknown) =>
    resolveTemplateConfig(BUILT_IN_TEMPLATE_CONFIGS.invoice, undefined, {
      language: { mode: 'en', primary: 'en' } as LanguageConfig,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typography: typography as any,
    });
  const render = (typography: unknown) => {
    const c = cfgT(typography);
    return assembleTypst(data, c, ctxFromLanguageConfig(c.language));
  };

  it('renders the assembler base sizes at scale 1', () => {
    const out = render({ baseScale: 1 });
    expect(out).toContain('size: 16pt'); // document title (16 * 1)
    expect(out).toContain('size: 9pt'); // base / value (9 * 1)
  });

  it('honours the financial built-in default scale (1.2) on the Arabic path', () => {
    // The bug: the hardcoded Typst path ignored config.typography, so the Arabic
    // doc rendered at 1.0 while pdfmake used the built-in 1.2. Now it matches.
    const out = render(undefined);
    expect(out).toContain('size: 19.2pt'); // title 16 * 1.2
    expect(out).toContain('size: 10.8pt'); // base 9 * 1.2
  });

  it('applies the global font scale to every size', () => {
    const out = render({ baseScale: 2 });
    expect(out).toContain('size: 32pt'); // title  16 * 2
    expect(out).toContain('size: 18pt'); // base / value  9 * 2
  });

  it('clamps an out-of-legible-range scale to 2× (matches the pdfmake path)', () => {
    const out = render({ baseScale: 2.5 }); // 2.5 → clamp(2)
    expect(out).toContain('size: 32pt'); // title  16 * 2
  });

  it('honours a per-section size override as absolute pt, independent of scale', () => {
    const out = render({ baseScale: 2, sizes: { documentTitle: 21 } });
    expect(out).toContain('size: 21pt'); // title override wins over 16 * 2
    expect(out).toContain('size: 18pt'); // other sizes still scaled (9 * 2)
    expect(out).not.toContain('size: 32pt'); // title is no longer the scaled default
  });
});

// The Typst header divider must honour config.header — style, colour, insets and
// the vertical nudge — exactly like pdfmake's buildDivider. Before this it was a
// hardcoded 0.5pt navy rule, always drawn.
describe('assembleTypst — header divider', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderH = (header: any) => {
    const c = resolveTemplateConfig(BUILT_IN_TEMPLATE_CONFIGS.invoice, undefined, {
      language: { mode: 'en', primary: 'en' } as LanguageConfig,
      header,
    });
    return assembleTypst(data, c, ctxFromLanguageConfig(c.language));
  };

  it('draws a thin rule by default (0.5pt, no inset)', () => {
    const out = renderH({});
    expect(out).toContain('#pad(left: 0pt, right: 0pt, line(length: 100%, stroke: 0.5pt + rgb(');
  });

  it('draws a thick rule when divider = thick', () => {
    expect(renderH({ divider: 'thick' })).toContain('line(length: 100%, stroke: 2pt + rgb(');
  });

  it('omits the rule entirely when divider = none', () => {
    const out = renderH({ divider: 'none' });
    expect(out).not.toContain('#pad('); // the pad+line divider construct is gone
  });

  it('uses the opt-in divider colour over the accent', () => {
    expect(renderH({ dividerColor: '#ef4444' })).toContain('stroke: 0.5pt + rgb("#ef4444")');
  });

  it('applies endpoint insets', () => {
    expect(renderH({ dividerNudge: { start: 12, end: 6 } })).toContain('#pad(left: 12pt, right: 6pt,');
  });

  it('shifts the rule up/down with the vertical nudge (gap kept constant)', () => {
    const out = renderH({ dividerNudge: { vertical: 4 } }); // before 10+4, after 8-4
    expect(out).toContain('#v(14pt)');
    expect(out).toContain('#v(4pt)');
  });

  it('clamps an extreme vertical nudge so the after-gap never goes negative', () => {
    const out = renderH({ dividerNudge: { vertical: 50 } }); // clamped to +8 → after 8-8=0
    expect(out).not.toContain('#v(-'); // no negative spacer overlapping the title
    expect(out).toContain('#v(18pt)'); // before 10+8
    expect(out).toContain('#v(0pt)'); // after 8-8
  });
});
