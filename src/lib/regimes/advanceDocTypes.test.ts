import { describe, it, expect } from 'vitest';
import type { TaxDocumentType } from './types';

// Compile-time proof: the two voucher members exist AND the four legacy members
// are still assignable (additive widening — no consumer narrows). tsc is the real
// assertion; the runtime body only exists so vitest executes the compiled module.
describe('TaxDocumentType voucher widening is additive', () => {
  it('accepts all six members and keeps the legacy four assignable', () => {
    const all: TaxDocumentType[] = [
      'quote', 'invoice', 'credit_note', 'stock_sale', 'receipt_voucher', 'refund_voucher',
    ];
    const receipt: TaxDocumentType = 'receipt_voucher';
    const refund: TaxDocumentType = 'refund_voucher';
    const legacy: TaxDocumentType = 'invoice'; // must still narrow
    expect(all).toHaveLength(6);
    expect([receipt, refund, legacy]).toHaveLength(3);
  });
});
