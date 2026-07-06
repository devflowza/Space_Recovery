import { describe, it, expect, vi, beforeEach } from 'vitest';

const { computeTotalsSpy, insertedPayloads, fromMock } = vi.hoisted(() => {
  const insertedPayloads: Record<string, unknown[]> = {};
  const computeTotalsSpy = vi.fn(async () => ({
    computation: {
      lines: [], rollups: [],
      totals: { taxableBase: 8000, taxTotal: 1440, grandTotal: 9440, roundingAdjustment: null },
      expectedWithholding: null, notations: [],
      trace: { regimeKey: 'simple_vat', pluginVersion: 't', packVersionId: null, schemeMode: 'single', steps: [] },
    },
    subtotal: 8000, taxAmount: 1440, totalAmount: 9440,
    placeOfSupplySubdivisionId: 'sub-ka',
  }));
  const rowFor = (table: string): unknown =>
    table === 'quotes'
      ? { id: 'q-1', quote_number: 'QUO-1' }
      : [{ id: 'qi-1', sort_order: 0 }];
  const fromMock = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {};
    chain.insert = vi.fn((payload: unknown) => {
      (insertedPayloads[table] ??= []).push(Array.isArray(payload) ? payload[0] : payload);
      return chain;
    });
    chain.update = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.is = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(async () => ({ data: rowFor(table), error: null }));
    (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
      resolve({ data: rowFor(table), error: null });
    return chain;
  });
  return { computeTotalsSpy, insertedPayloads, fromMock };
});

vi.mock('./supabaseClient', () => ({
  supabase: { from: fromMock, rpc: vi.fn(async () => ({ data: 'X-1', error: null })), auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u-1' } } })) } },
  resolveTenantId: vi.fn(async () => 't-1'),
}));
vi.mock('./taxDocumentService', () => ({
  computeDocumentTotals: computeTotalsSpy,
  persistDocumentTaxLines: vi.fn(async () => undefined),
  issueTaxDocument: vi.fn(async () => ({})),
}));
vi.mock('./currencyService', () => ({
  resolveRateContext: vi.fn(async () => ({ documentCurrency: 'INR', documentDecimals: 2, baseCurrency: 'INR', baseDecimals: 2, rate: 1, rateSource: 'derived' })),
  getBaseCurrency: vi.fn(async () => 'INR'),
  getCurrencyDecimals: vi.fn(async () => 2),
}));
vi.mock('./auditTrailService', () => ({ logAuditTrail: vi.fn(async () => undefined) }));
vi.mock('./chainOfCustodyService', () => ({ logQuoteCreated: vi.fn(async () => undefined), logQuoteStatusChanged: vi.fn(async () => undefined) }));
vi.mock('./tenantConfigService', () => ({ getTenantConfig: vi.fn(async () => ({})) }));

import { createQuote } from './quotesService';

beforeEach(() => {
  computeTotalsSpy.mockClear();
  for (const k of Object.keys(insertedPayloads)) delete insertedPayloads[k];
});

describe('createQuote — buyer threading + place-of-supply persistence (P4 S2)', () => {
  it('passes customerId/companyId to computeDocumentTotals and persists place_of_supply_subdivision_id', async () => {
    await createQuote(
      { case_id: 'case-1', customer_id: 'cust-1', company_id: null, status: 'draft', tax_rate: 18 } as never,
      [{ description: 'Data recovery — evaluation', quantity: 1, unit_price: 8000 }],
    );
    expect(computeTotalsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cust-1', companyId: null }),
      expect.anything(),
    );
    expect(insertedPayloads['quotes'][0]).toMatchObject({ place_of_supply_subdivision_id: 'sub-ka' });
  });
});
