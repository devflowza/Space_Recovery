import { describe, it, expect } from 'vitest';
import { formatAmountWordsForScale, numberToWordsEnIndian } from './amountInWords';

describe('amount-in-words scale hook (WP-S4 defines, WP-L1 implements indian)', () => {
  it('western scale spells normally with currency + cheque-style minor', () => {
    expect(formatAmountWordsForScale(1180.5, '₹', 2, 'western'))
      .toBe('₹ One Thousand One Hundred Eighty and 50/100 only');
  });

  it('indian scale returns null until WP-L1 implements numberToWordsEnIndian (honest-degrade — render omits the line, never prints western grouping on an Indian doc)', () => {
    expect(numberToWordsEnIndian(105000)).toBeNull();
    expect(formatAmountWordsForScale(105000, '₹', 2, 'indian')).toBeNull();
  });
});
