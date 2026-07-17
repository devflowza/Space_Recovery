import { describe, it, expect, vi, beforeEach } from 'vitest';

// Round-3 regressions for invoiceService:
//   Finding 2 — convertQuoteToInvoice must be idempotent: a concurrent/stale
//              re-convert of an already-converted quote must NOT create a second
//              case-linked invoice. The quote is claimed (compare-and-set) BEFORE
//              createInvoice runs.
//   Finding 3 — updateInvoice's line-item soft-delete error must be inspected; a
//              silent DB error there (postgrest returns it, does not throw) would
//              otherwise leave old+new rows active and print doubled line items.

const { state, fromMock, rpcMock } = vi.hoisted(() => {
  const state: {
    quoteRow: Record<string, unknown> | null;
    claimReturnsRow: boolean;
    invoiceRow: Record<string, unknown>;
    saveError: { message: string } | null;
    inserted: Record<string, unknown[]>;
  } = {
    quoteRow: null,
    claimReturnsRow: true,
    invoiceRow: {},
    saveError: null,
    inserted: {},
  };

  // Persistence for create + update now goes through the atomic save_invoice_with_lines
  // RPC. It returns the invoice row, or surfaces state.saveError so we can assert the
  // client aborts on a failed atomic write (the whole txn rolls back server-side).
  const rpcMock = vi.fn(async (fn: string) => {
    if (fn === 'save_invoice_with_lines') {
      return state.saveError
        ? { data: null, error: state.saveError }
        : { data: { id: 'inv-new', invoice_number: null, ...state.invoiceRow }, error: null };
    }
    return { data: 'X-1', error: null };
  });

  const fromMock = vi.fn((table: string) => {
    const flags = { didUpdate: false, didInsert: false, didSelect: false };
    const chain: Record<string, unknown> = {};
    chain.insert = vi.fn((payload: unknown) => {
      flags.didInsert = true;
      (state.inserted[table] ??= []).push(Array.isArray(payload) ? payload[0] : payload);
      return chain;
    });
    chain.update = vi.fn(() => {
      flags.didUpdate = true;
      return chain;
    });
    chain.eq = vi.fn(() => chain);
    chain.neq = vi.fn(() => chain);
    chain.in = vi.fn(() => chain);
    chain.is = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.select = vi.fn(() => {
      flags.didSelect = true;
      return chain;
    });
    chain.maybeSingle = vi.fn(async () => {
      if (table === 'quotes') {
        // A `.update().neq().select().maybeSingle()` is the conversion CLAIM;
        // a plain `.select().maybeSingle()` is the initial quote fetch.
        if (flags.didUpdate) {
          return { data: state.claimReturnsRow ? { id: 'q-1' } : null, error: null };
        }
        return { data: state.quoteRow, error: null };
      }
      if (table === 'invoices') return { data: state.invoiceRow, error: null };
      return { data: { id: 'li-1', sort_order: 0 }, error: null };
    });
    (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) => {
      if (table === 'quote_items') return resolve({ data: [], error: null });
      return resolve({ data: [{ id: 'li-1', sort_order: 0 }], error: null });
    };
    return chain;
  });

  return { state, fromMock, rpcMock };
});

vi.mock('./supabaseClient', () => ({
  supabase: { from: fromMock, rpc: rpcMock, auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u-1' } } })) } },
  resolveTenantId: vi.fn(async () => 't-1'),
}));
vi.mock('./taxDocumentService', () => ({
  computeDocumentTotals: vi.fn(async () => ({ computation: { lines: [] }, subtotal: 0, taxAmount: 0, totalAmount: 0, placeOfSupplySubdivisionId: null })),
  buildDocumentTaxLineRefRows: vi.fn(() => []),
  issueTaxDocument: vi.fn(async () => ({})),
}));
vi.mock('./currencyService', () => ({
  resolveRateContext: vi.fn(async () => ({ documentCurrency: 'INR', documentDecimals: 2, baseCurrency: 'INR', baseDecimals: 2, rate: 1, rateSource: 'derived' })),
  getBaseCurrency: vi.fn(async () => 'INR'),
  getCurrencyDecimals: vi.fn(async () => 2),
}));
vi.mock('./auditTrailService', () => ({ logAuditTrail: vi.fn(async () => undefined) }));
vi.mock('./chainOfCustodyService', () => ({ logInvoiceCreated: vi.fn(async () => undefined), logInvoicePayment: vi.fn(async () => undefined) }));
vi.mock('./rateLimiter', () => ({ checkRateLimit: vi.fn(() => ({ allowed: true })), RATE_LIMITS: new Proxy({}, { get: () => ({ maxRequests: 1000, windowMs: 60000 }) }) }));
vi.mock('./tenantConfigService', () => ({ getTenantConfig: vi.fn(async () => ({})) }));
vi.mock('./tenantToday', () => ({ currentTenantToday: vi.fn(async () => '2026-07-05') }));

import { convertQuoteToInvoice, updateInvoice } from './invoiceService';

beforeEach(() => {
  state.quoteRow = null;
  state.claimReturnsRow = true;
  state.invoiceRow = {};
  state.saveError = null;
  for (const k of Object.keys(state.inserted)) delete state.inserted[k];
  rpcMock.mockClear();
});

/** create-mode calls to the atomic save_invoice_with_lines RPC. */
const createCalls = () =>
  rpcMock.mock.calls.filter(
    ([fn, args]) => fn === 'save_invoice_with_lines' && (args as { p_mode?: string })?.p_mode === 'create',
  );

describe('convertQuoteToInvoice — Finding 2: idempotent conversion (no duplicate invoice)', () => {
  it('rejects an already-converted quote WITHOUT creating a second invoice', async () => {
    state.quoteRow = { id: 'q-1', case_id: 'c-1', customer_id: 'cust-1', company_id: null, status: 'converted' };
    state.claimReturnsRow = false; // the compare-and-set matches 0 rows

    await expect(convertQuoteToInvoice('q-1', 'tax_invoice', '2026-08-01')).rejects.toThrow(/already been converted/i);
    expect(createCalls()).toHaveLength(0);
  });

  it('converts a fresh quote and creates exactly one invoice when the claim succeeds', async () => {
    state.quoteRow = { id: 'q-1', case_id: 'c-1', customer_id: 'cust-1', company_id: null, status: 'accepted' };
    state.claimReturnsRow = true;

    await convertQuoteToInvoice('q-1', 'tax_invoice', '2026-08-01');
    expect(createCalls()).toHaveLength(1);
  });
});

describe('updateInvoice — Finding 3 (superseded by #52): a failed atomic write aborts the edit', () => {
  it('throws when the atomic save RPC fails, and never touches invoice_line_items from the client', async () => {
    state.invoiceRow = {
      status: 'draft', payment_status: 'unpaid', invoice_type: 'tax_invoice',
      total_amount: 100, amount_paid: 0, balance_due: 100, due_date: null,
      currency: 'INR', exchange_rate: 1, rate_source: 'derived', customer_id: 'cust-1', company_id: null,
    };
    // The line-item soft-delete + re-insert now live inside the RPC transaction, so a
    // DB failure there surfaces as the RPC error — and rolls the whole edit back.
    state.saveError = { message: 'permission denied for table invoice_line_items' };

    await expect(
      updateInvoice('inv-1', { tax_rate: 5 }, [{ description: 'x', quantity: 1, unit_price: 100 }] as never),
    ).rejects.toThrow(/permission denied/i);

    // The atomic RPC was the write path...
    expect(
      rpcMock.mock.calls.some(
        ([fn, args]) => fn === 'save_invoice_with_lines' && (args as { p_mode?: string })?.p_mode === 'update',
      ),
    ).toBe(true);
    // ...and the client did NOT do its own line-item DML (that lived in the old path).
    expect(fromMock.mock.calls.every(([t]) => t !== 'invoice_line_items')).toBe(true);
  });
});
