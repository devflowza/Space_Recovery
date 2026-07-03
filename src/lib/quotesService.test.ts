import { describe, it, expect } from 'vitest';
import { computeDocumentTax } from './tax/kernel';
import type { GeoCountryTaxRateRow, TaxContext } from './regimes/types';
import type { RateContext } from './currencyService';

// Kernel parity pin (M-G): locks the canonical quote shape (12 × OMR 120.000 @5%,
// no discount, 3-dp) that quotesService now routes through the fiscal kernel.
// Task 32 deleted the legacy calculateQuoteTotals; the kernel is canonical. The
// same shape is the spec walkthrough in tax/kernel/computeDocumentTax.test.ts →
// taxable 1440.000, VAT 72.000, total 1512.000. This keeps those locked constants
// under the quotesService name.

const omrRc: RateContext = {
  documentCurrency: 'OMR', documentDecimals: 3, baseCurrency: 'OMR', baseDecimals: 3,
  rate: 1, rateSource: 'derived',
};
const omVat5: GeoCountryTaxRateRow = {
  id: 'rate-om-vat-std', country_id: 'om', subdivision_id: null, component_code: 'VAT',
  component_label: 'VAT', tax_category: 'standard', rate: 5, applies_to: null,
  valid_from: '2021-04-16', valid_to: null, sort_order: 0,
};

describe('quotesService cutover parity pin (kernel is canonical)', () => {
  it('kernel pins the OMR quote shape (subtotal 1440, VAT 72, total 1512)', () => {
    const ctx: TaxContext = {
      documentType: 'quote',
      seller: { legalEntityId: 'le', countryId: 'om', subdivisionId: null, taxIdentifier: 'OM123', registrations: [] },
      buyer: { taxNumber: null, countryId: null, subdivisionId: null, isBusiness: false, addressSnapshot: null },
      taxPointDate: '2026-07-02', placeOfSupplySubdivisionId: null,
      lines: [
        { lineItemId: null, description: 'Recovery service', quantity: 12, unitPrice: 120, lineDiscount: 0, unitCode: null, itemCode: null, treatment: 'standard', treatmentReasonCode: null },
      ],
      documentDiscount: 0, taxInclusive: false,
      rateContext: omrRc, rates: [omVat5],
      roundingPolicy: { mode: 'half_up', level: 'document' }, scaleSystem: 'western',
    };
    const c = computeDocumentTax(ctx);
    expect(c.totals.taxableBase).toBe(1440);
    expect(c.totals.taxTotal).toBe(72);
    expect(c.totals.grandTotal).toBe(1512);
  });
});
