// @vitest-environment jsdom
// Acceptance (spec §4-S4): the IN quote surface renders per-head GST rows on SCREEN.
// The hook maps document_tax_lines rollups → taxRows by component_label; for India
// the in_gst strategy (WP-S3) emits CGST + SGST (intra-state) or IGST (inter-state),
// so the panel shows two/one head rows, never a single blended 'GST 18%' row.
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../lib/pdf/engine/profileResolver', () => ({
  resolveComplianceRenderInputs: async () => ({
    facts: { code: 'IN', taxSystem: 'GST', taxLabel: 'GST', taxNumberLabel: 'GSTIN', taxInvoiceRequired: true, languageCode: 'en', decimalPlaces: 2, dateFormat: 'DD/MM/YYYY', decimalSeparator: '.', thousandsSeparator: ',', digitGrouping: '3;2', einvoiceRegimeKey: 'no_einvoice' },
    profile: (await import('../lib/regimes/in_gst/documents')).inGstInvoiceProfile,
    sellerRegistered: true, sellerTaxNumber: '27ABCDE1234F1Z5',
  }),
}));
vi.mock('../lib/pdf/dataFetcher', () => ({
  fetchDocumentTaxLines: async () => ([
    { line_item_id: null, component_code: 'CGST', component_label: 'CGST', rate: 9, taxable_base: 1000, tax_amount: 90, tax_treatment: 'standard', treatment_reason_code: null, sequence: 1, backfilled: false, rule_trace: null },
    { line_item_id: null, component_code: 'SGST', component_label: 'SGST', rate: 9, taxable_base: 1000, tax_amount: 90, tax_treatment: 'standard', treatment_reason_code: null, sequence: 2, backfilled: false, rule_trace: null },
  ]),
}));

import { useDocumentCompliance } from './useDocumentCompliance';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('IN quote — per-head GST on screen', () => {
  it('renders CGST + SGST rows, not a single blended row', async () => {
    const { result } = renderHook(
      () => useDocumentCompliance('quote', 'quote-1', { taxRate: 18, taxAmount: 180 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.taxRows).toEqual([
      { label: 'CGST', amount: 90 },
      { label: 'SGST', amount: 90 },
    ]);
    expect(result.current.taxBandLabel).toBe('GSTIN');
    expect(result.current.title.en).toBe('Quotation');
  });
});
