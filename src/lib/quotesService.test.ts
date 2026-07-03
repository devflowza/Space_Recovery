import { describe, it, expect } from 'vitest';
import { calculateQuoteTotals } from './financialMath';

describe('quotesService cutover parity pin', () => {
  it('legacy calculateQuoteTotals expected values are locked before deletion', () => {
    const t = calculateQuoteTotals([{ quantity: 12, unit_price: 120 }], null, 0, 5, 3);
    expect(t.subtotal).toBe(1440);
    expect(t.taxAmount).toBe(72);
    expect(t.totalAmount).toBe(1512);
  });
});
