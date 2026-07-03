import { roundMoney } from '../../financialMath';

/**
 * Back a tax-inclusive gross out into { base, tax } at document-currency
 * decimals. tax is DEFINED as gross - base (never independently rounded), so
 * base + tax reconstitutes the agreed gross EXACTLY — the spec's ₹5,000 @18%
 * worked example (4,237.29 + 762.71 = 5,000.00). Splitting `tax` across
 * multiple components is the kernel's job via allocateLargestRemainder.
 */
export function backOutInclusive(
  gross: number,
  sumOfRates: number,
  decimalPlaces: number,
): { base: number; tax: number } {
  const base = roundMoney((gross * 100) / (100 + sumOfRates), decimalPlaces);
  const tax = roundMoney(gross - base, decimalPlaces);
  return { base, tax };
}
