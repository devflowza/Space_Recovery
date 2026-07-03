import { describe, it, expect } from 'vitest';
import { computeDocumentTax } from './tax/kernel';
import type { GeoCountryTaxRateRow, TaxContext } from './regimes/types';
import type { RateContext } from './currencyService';

// Kernel parity pin (M-F): locks the canonical OMR (3-dp) representative invoice
// shape that invoiceService now routes through the fiscal kernel. Task 32 deleted
// the legacy calculateInvoiceTotals; the kernel is canonical. The kernel was proven
// byte-faithful to the old arithmetic for this exact shape in
// tax/kernel/computeDocumentTax.test.ts ("legacy invoice math parity": taxableBase
// 109.355, taxTotal 5.468, grandTotal 114.823), so this pin keeps the locked
// service-layer constants (VAT 5.468, total 114.823) under the invoiceService name.
//
// Shape mirrors the deleted calculateInvoiceTotals(items=[{3×40.5, 10%}, {1×0.105}],
// discount=0.100, 5%, dp=3): line1 121.500 − 12.150 = 109.350; line2 0.105; doc
// discount 0.100 → taxable 109.355; 5% → 5.468; total 114.823.

const omrRc: RateContext = {
  documentCurrency: 'OMR', documentDecimals: 3, baseCurrency: 'OMR', baseDecimals: 3,
  rate: 1, rateSource: 'derived',
};
const omVat5: GeoCountryTaxRateRow = {
  id: 'rate-om-vat-std', country_id: 'om', subdivision_id: null, component_code: 'VAT',
  component_label: 'VAT', tax_category: 'standard', rate: 5, applies_to: null,
  valid_from: '2021-04-16', valid_to: null, sort_order: 0,
};

describe('invoiceService cutover parity (kernel is canonical)', () => {
  it('kernel pins the OMR representative invoice shape (VAT 5.468, total 114.823)', () => {
    const ctx: TaxContext = {
      documentType: 'invoice',
      seller: { legalEntityId: 'le', countryId: 'om', subdivisionId: null, taxIdentifier: 'OM123', registrations: [] },
      buyer: { taxNumber: null, countryId: null, subdivisionId: null, isBusiness: false, addressSnapshot: null },
      taxPointDate: '2026-07-02', placeOfSupplySubdivisionId: null,
      lines: [
        { lineItemId: null, description: 'Logical recovery', quantity: 3, unitPrice: 40.5, lineDiscount: 12.15, unitCode: null, itemCode: null, treatment: 'standard', treatmentReasonCode: null },
        { lineItemId: null, description: 'Donor part', quantity: 1, unitPrice: 0.105, lineDiscount: 0, unitCode: null, itemCode: null, treatment: 'standard', treatmentReasonCode: null },
      ],
      documentDiscount: 0.1, taxInclusive: false,
      rateContext: omrRc, rates: [omVat5],
      roundingPolicy: { mode: 'half_up', level: 'document' }, scaleSystem: 'western',
    };
    const c = computeDocumentTax(ctx);
    expect(c.totals.taxTotal).toBe(5.468);
    expect(c.totals.grandTotal).toBe(114.823);
  });
});
