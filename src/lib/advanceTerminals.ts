import { issueRefundVoucher } from './advanceVoucherService';

export interface RefundEligibility {
  phaseType: string | null;
  recoveryOutcome: string | null;
  hasIssuedReceiptVoucher: boolean;
  /** True once a refund voucher already exists for this receipt — the panel must
   *  latch closed (a second refund would reverse the advance GST twice). The DB
   *  unique index ux_advance_voucher_one_refund is the authoritative backstop. */
  hasIssuedRefundVoucher?: boolean;
}

/** Rule 51 refund is offered ONLY on the real no-recovery surfaces — the
 *  no_solution phase, recovery_outcome='unrecoverable', or a cancelled case —
 *  and only when an advance receipt voucher was actually issued (there is a tax
 *  leg to reverse) AND no refund has been issued yet. A live recovery never
 *  offers a refund. */
export function canOfferRefundVoucher(e: RefundEligibility): boolean {
  if (!e.hasIssuedReceiptVoucher) return false;
  if (e.hasIssuedRefundVoucher) return false;
  return e.phaseType === 'no_solution'
    || e.phaseType === 'cancelled'
    || e.recoveryOutcome === 'unrecoverable';
}

/** Terminal 1 — actual refund: reverse the advance and emit the Refund Voucher
 *  (which references the original receipt voucher per Rule 51). */
export async function offerRefundVoucher(receiptVoucherId: string, reason: string) {
  return issueRefundVoucher(receiptVoucherId, reason);
}
