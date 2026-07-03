// scripts/localization/parity-replay.test.ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { computeDocumentTax } from '../../src/lib/tax/kernel';
import { buildTaxableLines, matchFormRate, totalsFromComputation } from '../../src/lib/taxDocumentService';
import type { GeoCountryTaxRateRow, TaxContext } from '../../src/lib/regimes/types';

const DB = process.env.SUPABASE_DB_URL;

interface DocRow {
  id: string; currency: string; decimals: number; tax_rate: number;
  discount_amount: number; discount_type: string | null;
  subtotal: number; tax_amount: number; total_amount: number;
  items: Array<{ description: string; quantity: number; unit_price: number; discount_percent: number }>;
  rates: GeoCountryTaxRateRow[];
}

function fetchDocs(kind: 'invoice' | 'quote'): DocRow[] {
  const table = kind === 'invoice' ? 'invoices' : 'quotes';
  const itemTable = kind === 'invoice' ? 'invoice_line_items' : 'quote_items';
  const fk = kind === 'invoice' ? 'invoice_id' : 'quote_id';
  const discountCol = kind === 'invoice' ? "d.discount_percent" : "d.discount";
  // Header date column is kind-aware: invoices carry invoice_date, quotes carry
  // quote_date (quotes have no invoice_date column). COALESCE→CURRENT_DATE covers nulls.
  const dateCol = kind === 'invoice' ? 'h.invoice_date' : 'h.quote_date';
  // One JSON blob per document with its items and the effective OM standard rate rows.
  const sql = `
    SELECT json_agg(row) FROM (
      SELECT json_build_object(
        'id', h.id, 'currency', COALESCE(h.currency,'OMR'),
        'decimals', COALESCE(mc.decimal_places, 3), 'tax_rate', COALESCE(h.tax_rate,0),
        'discount_amount', COALESCE(h.discount_amount,0),
        'discount_type', ${kind === 'quote' ? 'h.discount_type' : 'NULL'},
        'subtotal', COALESCE(h.subtotal,0), 'tax_amount', COALESCE(h.tax_amount,0),
        'total_amount', COALESCE(h.total_amount,0),
        'items', COALESCE((SELECT json_agg(json_build_object(
            'description', d.description, 'quantity', d.quantity, 'unit_price', d.unit_price,
            'discount_percent', COALESCE(${discountCol},0)) ORDER BY d.sort_order)
          FROM ${itemTable} d WHERE d.${fk} = h.id), '[]'::json),
        'rates', COALESCE((SELECT json_agg(json_build_object(
            'id', r.id, 'country_id', r.country_id, 'subdivision_id', r.subdivision_id,
            'component_code', r.component_code, 'component_label', r.component_label,
            'tax_category', r.tax_category, 'rate', r.rate, 'applies_to', r.applies_to,
            'valid_from', r.valid_from, 'valid_to', r.valid_to, 'sort_order', r.sort_order))
          FROM geo_country_tax_rates r
          JOIN legal_entities le ON le.id = (SELECT id FROM legal_entities WHERE tenant_id = h.tenant_id AND is_primary LIMIT 1)
          WHERE r.country_id = le.country_id AND r.tax_category='standard' AND r.subdivision_id IS NULL
            AND r.valid_from <= COALESCE(${dateCol}, CURRENT_DATE)
            AND (r.valid_to IS NULL OR r.valid_to >= COALESCE(${dateCol}, CURRENT_DATE))
            AND r.deleted_at IS NULL), '[]'::json)
      ) AS row
      FROM ${table} h
      LEFT JOIN master_currency_codes mc ON mc.code = h.currency
      WHERE h.deleted_at IS NULL
      ${kind === 'invoice' ? "" : ""}
    ) s`;
  const out = execSync(`psql "${DB}" -t -A -c "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).trim();
  return out && out !== '' ? JSON.parse(out) : [];
}

function replay(doc: DocRow): { subtotal: number; taxAmount: number; totalAmount: number } {
  const rates = matchFormRate(doc.rates, doc.tax_rate);
  const lines = buildTaxableLines(doc.items, doc.decimals);
  const documentDiscount = doc.discount_type === 'percentage'
    ? Math.round(((doc.subtotal * doc.discount_amount) / 100) * 10 ** doc.decimals) / 10 ** doc.decimals
    : doc.discount_amount;
  const ctx: TaxContext = {
    documentType: 'invoice',
    seller: { legalEntityId: 'x', countryId: doc.rates[0]?.country_id ?? 'x', subdivisionId: null, taxIdentifier: null, registrations: [] },
    buyer: { taxNumber: null, countryId: null, subdivisionId: null, isBusiness: false, addressSnapshot: null },
    taxPointDate: '2026-07-02', placeOfSupplySubdivisionId: null,
    lines: rates.length === 0 ? lines.map((l) => ({ ...l, treatment: 'out_of_scope' as const })) : lines,
    documentDiscount, taxInclusive: false,
    rateContext: { documentCurrency: doc.currency, documentDecimals: doc.decimals, baseCurrency: doc.currency, baseDecimals: doc.decimals, rate: 1, rateSource: 'derived' },
    rates,
    roundingPolicy: { mode: 'half_up', level: 'document' }, scaleSystem: 'western',
  };
  const c = computeDocumentTax(ctx);
  return totalsFromComputation(c, documentDiscount, doc.decimals);
}

describe.skipIf(!DB)('M-E parity replay — kernel byte-identical to stored corpus', () => {
  for (const kind of ['invoice', 'quote'] as const) {
    it(`${kind}s: every stored subtotal/tax/total reproduced exactly`, () => {
      const docs = fetchDocs(kind);
      expect(docs.length).toBeGreaterThan(0);
      const diffs: Array<{ id: string; field: string; stored: number; kernel: number }> = [];
      for (const doc of docs) {
        const r = replay(doc);
        if (r.taxAmount !== doc.tax_amount) diffs.push({ id: doc.id, field: 'tax', stored: doc.tax_amount, kernel: r.taxAmount });
        if (r.totalAmount !== doc.total_amount) diffs.push({ id: doc.id, field: 'total', stored: doc.total_amount, kernel: r.totalAmount });
        if (r.subtotal !== doc.subtotal) diffs.push({ id: doc.id, field: 'subtotal', stored: doc.subtotal, kernel: r.subtotal });
      }
      expect(diffs.slice(0, 25), `${diffs.length} divergences`).toEqual([]);
    });
  }
});
