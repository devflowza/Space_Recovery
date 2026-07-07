import { describe, it, expect } from 'vitest';
import { negateComputation, assertOriginalInvoiceRef, checkCreditNoteCutoff } from './creditNote';
import type { TaxComputation } from '../types';

const comp = (): TaxComputation => ({
  lines: [
    { lineItemId: 'l1', componentCode: 'CGST', componentLabel: 'CGST', jurisdictionRef: null, rate: 9, taxableBase: 1000, taxAmount: 90, taxTreatment: 'standard', treatmentReasonCode: null, sequence: 1 },
  ],
  rollups: [
    { lineItemId: null, componentCode: 'CGST', componentLabel: 'CGST', jurisdictionRef: null, rate: 9, taxableBase: 1000, taxAmount: 90, taxTreatment: 'standard', treatmentReasonCode: null, sequence: 1 },
    { lineItemId: null, componentCode: 'SGST', componentLabel: 'SGST', jurisdictionRef: null, rate: 9, taxableBase: 1000, taxAmount: 90, taxTreatment: 'standard', treatmentReasonCode: null, sequence: 2 },
  ],
  totals: { taxableBase: 1000, taxTotal: 180, grandTotal: 1180, roundingAdjustment: null },
  expectedWithholding: null, notations: [],
  trace: { regimeKey: 'in_gst', pluginVersion: '1.0.0', packVersionId: null, schemeMode: 'split_by_place_of_supply', steps: [] },
});

describe('negateComputation (per-head reversal)', () => {
  it('negates every line/rollup amount and the totals — heads stay equal and paired', () => {
    const n = negateComputation(comp());
    expect(n.rollups.map((r) => r.taxAmount)).toEqual([-90, -90]);
    expect(n.rollups[0].taxableBase).toBe(-1000);
    expect(n.lines[0].taxAmount).toBe(-90);
    expect(n.totals).toEqual({ taxableBase: -1000, taxTotal: -180, grandTotal: -1180, roundingAdjustment: null });
    // component identity/labels/sequence preserved (only signs flip)
    expect(n.rollups.map((r) => r.componentCode)).toEqual(['CGST', 'SGST']);
    expect(n.trace.regimeKey).toBe('in_gst');
  });
});

describe('assertOriginalInvoiceRef (r.53 block requirement)', () => {
  it('throws when the credit note has no original invoice reference', () => {
    expect(() => assertOriginalInvoiceRef({ invoice_id: null })).toThrow(/original tax invoice/i);
    expect(() => assertOriginalInvoiceRef({ invoice_id: '' })).toThrow(/original tax invoice/i);
  });
  it('passes when an original invoice is referenced', () => {
    expect(() => assertOriginalInvoiceRef({ invoice_id: 'inv-1' })).not.toThrow();
  });
});

describe('checkCreditNoteCutoff (30-Nov following FY, s.34(2))', () => {
  it('warns when issued after 30 Nov of the year following the supply FY', () => {
    // supply FY 2024-25 (ends 2025-03-31) → cutoff 2025-11-30
    expect(checkCreditNoteCutoff('2025-12-01', 2025).warn).toBe(true);
    expect(checkCreditNoteCutoff('2025-12-01', 2025).message).toContain('30 Nov');
  });
  it('does not warn on or before the cutoff', () => {
    expect(checkCreditNoteCutoff('2025-11-30', 2025).warn).toBe(false);
    expect(checkCreditNoteCutoff('2025-06-10', 2025).warn).toBe(false);
  });
});
