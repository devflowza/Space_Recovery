import { describe, it, expect } from 'vitest';
import { backOutInclusive } from './backOutInclusive';
import { roundMoney } from '../../financialMath';

describe('backOutInclusive', () => {
  it('spec example: ₹5,000 inclusive @18% → base 4237.29, tax 762.71', () => {
    expect(backOutInclusive(5000, 18, 2)).toEqual({ base: 4237.29, tax: 762.71 });
  });
  it('zero rate: base == gross, tax 0', () => {
    expect(backOutInclusive(150.5, 0, 2)).toEqual({ base: 150.5, tax: 0 });
  });
  it('OMR 3dp: 105.000 inclusive @5% → base 100.000, tax 5.000', () => {
    expect(backOutInclusive(105, 5, 3)).toEqual({ base: 100, tax: 5 });
  });
  it('PROPERTY: base + tax reconstitutes gross exactly at document decimals', () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    for (let i = 0; i < 500; i++) {
      const dp = [0, 2, 3][i % 3];
      const gross = roundMoney(rnd() * 100000, dp);
      const rates = roundMoney(rnd() * 30, 4);
      const { base, tax } = backOutInclusive(gross, rates, dp);
      expect(roundMoney(base + tax, dp)).toBe(gross);
      expect(base).toBe(roundMoney(base, dp));
      expect(tax).toBe(roundMoney(tax, dp));
    }
  });
});
