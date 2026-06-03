import { describe, it, expect, vi } from 'vitest';

// The services import the Supabase client at module load; mock it so these pure
// adapters can be unit-tested without env/network.
vi.mock('./supabaseClient', () => ({ supabase: {}, resolveTenantId: vi.fn() }));

import { toQuoteEditInitialData } from './quotesService';
import { toInvoiceEditInitialData } from './invoiceService';

describe('toQuoteEditInitialData', () => {
  it('formats valid_until to yyyy-MM-dd and maps DB `terms` -> form `terms_and_conditions`', () => {
    const out = toQuoteEditInitialData({
      id: 'q1',
      quote_number: 'QT-0001',
      valid_until: '2026-07-03T00:00:00+00:00',
      terms: 'Net 30',
      tax_rate: 5,
      discount_amount: 10,
      status: 'sent',
      currency: 'OMR',
      quote_items: [{ description: 'Recovery', quantity: 1, unit_price: 100 }],
    });
    expect(out.valid_until).toBe('2026-07-03');
    expect(out.terms_and_conditions).toBe('Net 30');
    // everything else passes through untouched
    expect(out.id).toBe('q1');
    expect(out.quote_number).toBe('QT-0001');
    expect(out.tax_rate).toBe(5);
    expect(out.discount_amount).toBe(10);
    expect(out.status).toBe('sent');
    expect(out.currency).toBe('OMR');
    expect(out.quote_items).toEqual([{ description: 'Recovery', quantity: 1, unit_price: 100 }]);
  });

  it('handles null date / missing terms without throwing', () => {
    const out = toQuoteEditInitialData({ id: 'q', valid_until: null });
    expect(out.valid_until).toBe('');
    expect(out.terms_and_conditions).toBe('');
  });
});

describe('toInvoiceEditInitialData', () => {
  it('formats invoice_date + due_date and maps DB `terms` -> form `terms_and_conditions`', () => {
    const out = toInvoiceEditInitialData({
      id: 'i1',
      invoice_number: 'INV-0004',
      invoice_type: 'tax_invoice',
      invoice_date: '2026-06-01T00:00:00+00:00',
      due_date: '2026-06-15T00:00:00+00:00',
      terms: 'Due on receipt',
      bank_account_id: 'bank-1',
      invoice_line_items: [{ description: 'Recovery', quantity: 1, unit_price: 100 }],
    });
    expect(out.invoice_date).toBe('2026-06-01');
    expect(out.due_date).toBe('2026-06-15');
    expect(out.terms_and_conditions).toBe('Due on receipt');
    expect(out.invoice_type).toBe('tax_invoice');
    expect(out.bank_account_id).toBe('bank-1');
    expect(out.invoice_line_items).toEqual([{ description: 'Recovery', quantity: 1, unit_price: 100 }]);
  });

  it('leaves blank dates blank and defaults terms to empty', () => {
    const out = toInvoiceEditInitialData({ id: 'i' });
    expect(out.invoice_date).toBe('');
    expect(out.due_date).toBe('');
    expect(out.terms_and_conditions).toBe('');
  });
});
