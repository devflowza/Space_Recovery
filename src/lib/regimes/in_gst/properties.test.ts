import { describe, it, expect } from 'vitest';
import { allocateLargestRemainder } from '../../financialMath';
import { backOutInclusive } from '../../tax/kernel/backOutInclusive';
import { inGstStrategy } from './index';
import type { GeoCountryTaxRateRow, TaxContext } from '../types';

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const IN_RATES: GeoCountryTaxRateRow[] = [
  { id: 'in-cgst-18', country_id: 'in', subdivision_id: null, component_code: 'CGST', component_label: 'CGST', tax_category: 'standard', rate: 9, applies_to: 'gst_slab_18', valid_from: '2017-07-01', valid_to: null, sort_order: 10 },
  { id: 'in-sgst-18', country_id: 'in', subdivision_id: null, component_code: 'SGST', component_label: 'SGST', tax_category: 'standard', rate: 9, applies_to: 'gst_slab_18', valid_from: '2017-07-01', valid_to: null, sort_order: 20 },
  { id: 'in-igst-18', country_id: 'in', subdivision_id: null, component_code: 'IGST', component_label: 'IGST', tax_category: 'standard', rate: 18, applies_to: 'gst_slab_18', valid_from: '2017-07-01', valid_to: null, sort_order: 30 },
];

function intraCtx(unitPrice: number, cashIncrement?: number): TaxContext {
  return {
    documentType: 'invoice',
    seller: { legalEntityId: 'le', countryId: 'in', subdivisionId: 'sub-IN-KA', taxIdentifier: '29ABCDE1234F1ZW', registrations: [] },
    buyer: { taxNumber: null, countryId: 'in', subdivisionId: 'sub-IN-KA', isBusiness: false, addressSnapshot: null },
    taxPointDate: '2026-07-15', placeOfSupplySubdivisionId: 'sub-IN-KA',
    lines: [{ lineItemId: null, description: 'svc', quantity: 1, unitPrice, lineDiscount: 0, unitCode: 'C62', itemCode: '998319', treatment: 'standard', treatmentReasonCode: null }],
    documentDiscount: 0, taxInclusive: false,
    rateContext: { documentCurrency: 'INR', documentDecimals: 2, baseCurrency: 'INR', baseDecimals: 2, rate: 1, rateSource: 'manual' },
    rates: IN_RATES,
    roundingPolicy: cashIncrement ? { mode: 'half_up', level: 'head', cash_increment: cashIncrement } : { mode: 'half_up', level: 'head' },
    scaleSystem: 'indian',
  };
}

describe('in_gst kernel-parameter properties', () => {
  it('largest-remainder totality: Σ(parts) === whole at 2dp over 500 random splits', () => {
    const rand = rng(42);
    for (let i = 0; i < 500; i++) {
      const total = Math.round(rand() * 1_000_000) / 100;
      const parts = allocateLargestRemainder(total, [1, 1], 2);
      expect(parts[0] + parts[1]).toBeCloseTo(total, 9);
    }
  });

  it('inclusive back-out round-trips: base + tax === gross over 500 random @18% grosses', () => {
    const rand = rng(7);
    for (let i = 0; i < 500; i++) {
      const gross = Math.round(rand() * 1_000_000) / 100;
      const { base, tax } = backOutInclusive(gross, 18, 2);
      expect(base + tax).toBeCloseTo(gross, 9);
    }
  });

  it('equal dual-levy: CGST and SGST are each 9% of the SAME base and always equal (never asymmetric)', async () => {
    const rand = rng(99);
    for (let i = 0; i < 200; i++) {
      const price = Math.round(rand() * 1_000_000) / 100;
      const c = await inGstStrategy.compute(intraCtx(price));
      const cgst = c.rollups.find((r) => r.componentCode === 'CGST');
      const sgst = c.rollups.find((r) => r.componentCode === 'SGST');
      expect(cgst?.taxAmount).toBe(sgst?.taxAmount);
    }
  });

  it('the walk-in ₹5,000 case: equal 381.36 heads + Section-170 round-off to ₹5,000.00', async () => {
    const c = await inGstStrategy.compute(intraCtx(4237.29, 1));
    expect(c.rollups.find((r) => r.componentCode === 'CGST')?.taxAmount).toBe(381.36);
    expect(c.rollups.find((r) => r.componentCode === 'SGST')?.taxAmount).toBe(381.36);
    expect(c.totals.grandTotal).toBe(5000);
    expect(c.totals.roundingAdjustment).toBe(-0.01);
  });

  it('trace determinism: identical input → deep-equal computation + split scheme mode', async () => {
    const a = await inGstStrategy.compute(intraCtx(100000, 1));
    const b = await inGstStrategy.compute(intraCtx(100000, 1));
    expect(a).toEqual(b);
    expect(a.trace.schemeMode).toBe('split_by_place_of_supply');
  });
});
