import { describe, it, expect, vi } from 'vitest';

// invoiceService imports the Supabase client at module load; stub it so the pure
// mapper can be unit-tested without env/network.
vi.mock('./supabaseClient', () => ({ supabase: {}, resolveTenantId: vi.fn() }));

import { mapPaymentHistory } from './invoiceService';

describe('mapPaymentHistory', () => {
  it('shapes rows, resolves method name and recorder, and coerces amount', () => {
    const out = mapPaymentHistory(
      [
        {
          id: 'p1',
          payment_number: 'PAY-0001',
          payment_date: '2026-06-01',
          amount: '63.0000',
          currency: 'OMR',
          reference: 'PO-9',
          transaction_id: 'txn_abc',
          status: 'completed',
          notes: 'first instalment',
          created_by: 'user-1',
          payment_method: { name: 'Bank Transfer' },
        },
      ],
      { 'user-1': 'Alice Lab' },
    );
    expect(out).toEqual([
      {
        id: 'p1',
        payment_number: 'PAY-0001',
        payment_date: '2026-06-01',
        amount: 63,
        currency: 'OMR',
        method: 'Bank Transfer',
        reference: 'PO-9',
        transaction_id: 'txn_abc',
        status: 'completed',
        notes: 'first instalment',
        recorded_by: 'Alice Lab',
      },
    ]);
  });

  it('defaults missing method / recorder / optional fields to null', () => {
    const [entry] = mapPaymentHistory([{ id: 'p2', amount: 10, created_by: 'ghost' }], {});
    expect(entry).toMatchObject({
      id: 'p2',
      amount: 10,
      method: null,
      reference: null,
      transaction_id: null,
      notes: null,
      recorded_by: null, // created_by present but not in name map
    });
  });

  it('returns an empty trail for no payments', () => {
    expect(mapPaymentHistory([], {})).toEqual([]);
  });
});
