import { describe, it, expect } from 'vitest';
import { canOfferRefundVoucher } from './advanceTerminals';

describe('canOfferRefundVoucher', () => {
  it('offers refund on unrecoverable / no_solution / cancelled with a held advance', () => {
    expect(canOfferRefundVoucher({ phaseType: 'no_solution', recoveryOutcome: null, hasIssuedReceiptVoucher: true })).toBe(true);
    expect(canOfferRefundVoucher({ phaseType: 'recovery', recoveryOutcome: 'unrecoverable', hasIssuedReceiptVoucher: true })).toBe(true);
    expect(canOfferRefundVoucher({ phaseType: 'cancelled', recoveryOutcome: null, hasIssuedReceiptVoucher: true })).toBe(true);
  });
  it('does NOT offer refund on a live recovery or when no receipt voucher exists', () => {
    expect(canOfferRefundVoucher({ phaseType: 'recovery', recoveryOutcome: null, hasIssuedReceiptVoucher: true })).toBe(false);
    expect(canOfferRefundVoucher({ phaseType: 'no_solution', recoveryOutcome: null, hasIssuedReceiptVoucher: false })).toBe(false);
  });
  it('does NOT re-offer refund once a refund voucher already exists (idempotency — no double reversal)', () => {
    expect(canOfferRefundVoucher({
      phaseType: 'no_solution', recoveryOutcome: 'unrecoverable',
      hasIssuedReceiptVoucher: true, hasIssuedRefundVoucher: true,
    })).toBe(false);
  });
});
