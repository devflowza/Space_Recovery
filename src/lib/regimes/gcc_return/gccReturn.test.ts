import { describe, expect, it } from 'vitest';
import { CountryConfigError } from '../../country/resolveCountryConfig';
import type { VatRecordRow } from '../types';
import { gccReturnComposer } from './index';

const row = (record_type: 'sale' | 'purchase', vat_amount_base: number, tax_period: string): VatRecordRow =>
  ({ record_type, vat_amount_base, tax_period } as unknown as VatRecordRow);

describe('gccReturnComposer.periodBounds', () => {
  it('calendar quarterly (anchor 01-01): Jul 2 falls in Q3', () => {
    expect(gccReturnComposer.periodBounds('quarterly', '01-01', '2026-07-02', 'Asia/Muscat')).toEqual({
      periodStart: '2026-07-01',
      periodEnd: '2026-09-30',
      taxPeriods: ['2026-07', '2026-08', '2026-09'],
    });
  });
  it('quarter boundary day stays in its own quarter (the toISOString bug class)', () => {
    expect(gccReturnComposer.periodBounds('quarterly', '01-01', '2026-07-01', 'Asia/Muscat').periodStart).toBe('2026-07-01');
    expect(gccReturnComposer.periodBounds('quarterly', '01-01', '2026-06-30', 'Asia/Muscat').periodEnd).toBe('2026-06-30');
  });
  it('fiscal anchor 04-01 quarterly: Jan 15 is fiscal Q4 of the prior anchor year', () => {
    expect(gccReturnComposer.periodBounds('quarterly', '04-01', '2026-01-15', 'Asia/Muscat')).toEqual({
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      taxPeriods: ['2026-01', '2026-02', '2026-03'],
    });
  });
  it('monthly and annual frequencies', () => {
    expect(gccReturnComposer.periodBounds('monthly', '01-01', '2026-02-10', 'Asia/Muscat')).toEqual({
      periodStart: '2026-02-01', periodEnd: '2026-02-28', taxPeriods: ['2026-02'],
    });
    expect(gccReturnComposer.periodBounds('annual', '04-01', '2026-05-01', 'Asia/Muscat').taxPeriods).toHaveLength(12);
  });
  it('rejects non-month-aligned anchors (UK stagger belongs to uk_mtd_9box)', () => {
    expect(() => gccReturnComposer.periodBounds('quarterly', '04-06', '2026-05-01', 'Europe/London'))
      .toThrow(CountryConfigError);
  });
});

describe('gccReturnComposer.compose', () => {
  const input = {
    tenantId: 't1', legalEntityId: 'le1', taxPeriods: ['2026-07', '2026-08', '2026-09'],
    ledgerRows: [row('sale', 50.005, '2026-07'), row('sale', 12.5, '2026-08'), row('purchase', 10, '2026-09')],
    jurisdictionCurrency: 'OMR', baseCurrency: 'OMR',
  };
  it('sums vat_amount_base into the 3 GCC boxes', () => {
    const composed = gccReturnComposer.compose(input);
    expect(composed.boxes).toEqual([
      { boxCode: 'BOX_1_OUTPUT', boxLabel: 'Output VAT on sales', amountBase: 62.505, sequence: 1 },
      { boxCode: 'BOX_2_INPUT', boxLabel: 'Recoverable input VAT on purchases', amountBase: 10, sequence: 2 },
      { boxCode: 'BOX_3_NET', boxLabel: 'Net VAT payable / (refundable)', amountBase: 52.505, sequence: 3 },
    ]);
    expect(composed.meta.recordCount).toBe(3);
  });
  it('throws ConfigError when base currency differs from the jurisdiction filing currency (graft 7)', () => {
    expect(() => gccReturnComposer.compose({ ...input, baseCurrency: 'USD' })).toThrow(CountryConfigError);
  });
});
