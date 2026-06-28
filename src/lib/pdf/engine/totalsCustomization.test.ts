import { describe, it, expect } from 'vitest';
import { BUILT_IN_TEMPLATE_CONFIGS, resolveTemplateConfig } from '../templateConfig';
import { buildPreviewEngineData } from './sampleData';
import { renderTotals } from './sections/totals';
import { PDF_COLORS } from '../styles';
import type { EngineContext, EngineDocData } from './types';
import type { TranslationContext } from '../types';

const ctx: TranslationContext = { t: (_k, en) => en, isRTL: false, isBilingual: false, languageCode: null, fontFamily: 'Roboto' };

/** A minimal EngineContext carrying a per-template `totals` config. */
function engineFor(totals: unknown): EngineContext {
  const config = resolveTemplateConfig(BUILT_IN_TEMPLATE_CONFIGS.invoice, undefined, { totals } as never);
  return { config, ctx } as EngineContext;
}

const DATA: EngineDocData = {
  totals: [
    { key: 'subtotal', label: { en: 'Subtotal:', ar: 'المجموع الفرعي:' }, value: '100' },
    { key: 'tax', label: { en: 'VAT 5%:', ar: 'ضريبة:' }, value: '5' },
    { key: 'total', label: { en: 'Total:', ar: 'الإجمالي:' }, value: '105', emphasis: true },
    { key: 'balanceDue', label: { en: 'Balance Due:', ar: 'الرصيد:' }, value: '55' },
  ],
} as EngineDocData;

type Layout = {
  fillColor: (i: number) => string | null;
  hLineWidth: (i: number) => number;
  vLineWidth: () => number;
};
const layoutOf = (out: unknown): Layout => (out as { layout: Layout }).layout;

describe('totals customization — label overrides (adapter)', () => {
  it('overrides the English label while the secondary keeps its default', () => {
    const config = resolveTemplateConfig(BUILT_IN_TEMPLATE_CONFIGS.invoice, undefined, {
      totals: { labels: { total: 'Grand Total', subtotal: 'Sub-total' } },
    } as never);
    const data = buildPreviewEngineData('invoice', config);
    const total = data.totals?.find((l) => l.key === 'total');
    const subtotal = data.totals?.find((l) => l.key === 'subtotal');
    expect(total?.label.en).toBe('Grand Total');
    expect(total?.label.ar).toBe('الإجمالي:'); // secondary default preserved
    expect(subtotal?.label.en).toBe('Sub-total');
  });

  it('leaves the default wording when no override is set', () => {
    const data = buildPreviewEngineData('invoice', BUILT_IN_TEMPLATE_CONFIGS.invoice);
    expect(data.totals?.find((l) => l.key === 'total')?.label.en).toBe('Total:');
  });
});

describe('totals customization — per-row colours', () => {
  it('applies the configured backgrounds by row key', () => {
    const layout = layoutOf(
      renderTotals(
        engineFor({ rowColors: { total: { background: '#162660' }, balanceDue: { background: '#FEF2F2' }, tax: { background: '#EFF6FF' } } }),
        DATA,
      ),
    );
    expect(layout.fillColor(0)).toBeNull();        // subtotal — neutral
    expect(layout.fillColor(1)).toBe('#EFF6FF');   // tax
    expect(layout.fillColor(2)).toBe('#162660');   // grand total
    expect(layout.fillColor(3)).toBe('#FEF2F2');   // balance due
  });

  it('ignores a malformed hex (stays neutral)', () => {
    const layout = layoutOf(renderTotals(engineFor({ rowColors: { tax: { background: 'not-a-color' } } }), DATA));
    expect(layout.fillColor(1)).toBeNull();
  });

  it('default highlights the grand total only', () => {
    const layout = layoutOf(renderTotals(engineFor(undefined), DATA));
    expect(layout.fillColor(2)).toBe(PDF_COLORS.background);
    expect(layout.fillColor(0)).toBeNull();
  });

  it('highlightTotal:false drops the grand-total band', () => {
    const layout = layoutOf(renderTotals(engineFor({ highlightTotal: false }), DATA));
    expect(layout.fillColor(2)).toBeNull();
  });
});

describe('totals customization — table style', () => {
  it('plain: only a rule above the grand total', () => {
    const layout = layoutOf(renderTotals(engineFor({ style: 'plain' }), DATA));
    expect(layout.hLineWidth(2)).toBe(0.5); // rule above the total (index 2)
    expect(layout.hLineWidth(1)).toBe(0);
    expect(layout.vLineWidth()).toBe(0);
  });

  it('bordered: hairlines around every cell', () => {
    const layout = layoutOf(renderTotals(engineFor({ style: 'bordered' }), DATA));
    expect(layout.hLineWidth(0)).toBe(0.5);
    expect(layout.vLineWidth()).toBe(0.5);
  });

  it('striped: tints even subtotal rows', () => {
    const layout = layoutOf(renderTotals(engineFor({ style: 'striped' }), DATA));
    expect(layout.fillColor(0)).toBe(PDF_COLORS.background); // even → striped
  });
});
