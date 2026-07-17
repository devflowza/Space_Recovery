import { describe, it, expect, vi } from 'vitest';
import type { RateContext } from './currencyService';
import type { TaxComputation } from './regimes/types';

// The builder is pure, but taxDocumentService imports supabaseClient at module load
// (which throws without env vars) — mock it away.
vi.mock('./supabaseClient', () => ({ supabase: {} }));

import { buildDocumentTaxLineRefRows } from './taxDocumentService';

// documentCurrency EUR, base OMR@3dp, rate 0.42: a line tax of 5 → base 2.1.
const rc: RateContext = {
  documentCurrency: 'EUR', documentDecimals: 2, baseCurrency: 'OMR', baseDecimals: 3, rate: 0.42, rateSource: 'manual',
};

const computation: TaxComputation = {
  lines: [
    { lineItemId: 'idx:0', componentCode: 'VAT', componentLabel: 'VAT 5%', jurisdictionRef: null, rate: 5, taxableBase: 100, taxAmount: 5, taxTreatment: 'standard', treatmentReasonCode: null, sequence: 1 },
    { lineItemId: 'idx:1', componentCode: 'VAT', componentLabel: 'VAT 5%', jurisdictionRef: null, rate: 5, taxableBase: 200, taxAmount: 10, taxTreatment: 'standard', treatmentReasonCode: null, sequence: 2 },
  ],
  rollups: [
    { lineItemId: null, componentCode: 'VAT', componentLabel: 'VAT 5%', jurisdictionRef: null, rate: 5, taxableBase: 300, taxAmount: 15, taxTreatment: 'standard', treatmentReasonCode: null, sequence: 0 },
  ],
  totals: { taxableBase: 300, taxTotal: 15, grandTotal: 315, roundingAdjustment: null },
  expectedWithholding: null, notations: [],
  trace: { regimeKey: 'simple_vat', pluginVersion: '1.0', packVersionId: 'pack-1', schemeMode: 'single', steps: [] },
};

describe('buildDocumentTaxLineRefRows (atomic save_invoice_with_lines payload)', () => {
  it('anchors each per-line row to its line index via line_item_ref; rollups get null', () => {
    const rows = buildDocumentTaxLineRefRows(computation, rc);
    // rollup first (ref null), then the two per-line rows (ref 0, 1)
    expect(rows.map((r) => r.line_item_ref)).toEqual([null, 0, 1]);
    expect(rows[1]).toMatchObject({
      line_item_ref: 0, component_code: 'VAT', tax_amount: 5, tax_amount_base: 2.1,
    });
  });

  it('carries the document-level trace only on the rollup (line_item_id-less) rows', () => {
    const rows = buildDocumentTaxLineRefRows(computation, rc);
    expect(rows[0].rule_trace).not.toBeNull(); // rollup
    expect(rows[1].rule_trace).toBeNull();      // per-line
  });

  it('appends a Round off row (ref null) when there is a rounding adjustment', () => {
    const rows = buildDocumentTaxLineRefRows(
      { ...computation, totals: { ...computation.totals, roundingAdjustment: -0.01 } }, rc,
    );
    const ro = rows.find((r) => r.component_code === 'ROUND_OFF');
    expect(ro).toMatchObject({ line_item_ref: null, tax_amount: -0.01, tax_treatment: 'out_of_scope' });
  });

  it('never emits tenant_id / document linkage / a resolved line_item_id (the RPC injects those)', () => {
    for (const r of buildDocumentTaxLineRefRows(computation, rc)) {
      expect(r).not.toHaveProperty('tenant_id');
      expect(r).not.toHaveProperty('document_id');
      expect(r).not.toHaveProperty('document_type');
      expect(r).not.toHaveProperty('line_item_id');
    }
  });
});
