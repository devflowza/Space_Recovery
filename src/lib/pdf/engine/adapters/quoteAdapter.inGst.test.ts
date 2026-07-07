// Acceptance (spec §4-S4): the IN quote PDF renders per-head GST rows. The quote
// adapter maps stored document_tax_lines rollups verbatim (AD-3, no recompute) —
// pin that CGST/SGST land as two distinct totals rows for the in_gst_invoice profile.
import { describe, it, expect } from 'vitest';
import { toEngineData as toQuoteEngineData } from './quoteAdapter';
import type { QuoteDocumentData, DocumentTaxLine } from '../../types';
import type { DocumentTemplateConfig } from '../../templateConfig';

const rollups: DocumentTaxLine[] = [
  { line_item_id: null, component_code: 'CGST', component_label: 'CGST', rate: 9, taxable_base: 1000, tax_amount: 90, tax_treatment: 'standard', treatment_reason_code: null, sequence: 1, backfilled: false, rule_trace: null },
  { line_item_id: null, component_code: 'SGST', component_label: 'SGST', rate: 9, taxable_base: 1000, tax_amount: 90, tax_treatment: 'standard', treatment_reason_code: null, sequence: 2, backfilled: false, rule_trace: null },
];

const config: DocumentTemplateConfig = {
  sections: [{ key: 'lineItems', columns: [] }, { key: 'totals', lines: {} }],
  statutoryProfileKey: 'in_gst_invoice',
} as unknown as DocumentTemplateConfig;

const data = {
  quoteData: {
    quote_number: 'QUO/25-26/0003', quote_date: '2026-05-01',
    subtotal: 1000, tax_rate: 18, tax_amount: 180, total_amount: 1180,
    currency_symbol: '₹', currency_position: 'before', decimal_places: 2,
    items: [], tax_lines: rollups,
  },
  companySettings: { basic_info: {} },
} as unknown as QuoteDocumentData;

describe('IN quote — per-head GST on the PDF', () => {
  it('emits CGST and SGST as two distinct totals rows', () => {
    const out = toQuoteEngineData(data, config);
    // The quote adapter renders per-head rollups already (WP-S3); its stored-label
    // convention carries a trailing colon ("CGST:"), so match on the head prefix.
    const heads = (out.totals ?? []).filter((t) => /^(CGST|SGST)\b/.test(t.label.en));
    expect(heads.map((h) => h.label.en.replace(/:$/, ''))).toEqual(['CGST', 'SGST']);
    expect(heads).toHaveLength(2);
  });
});
