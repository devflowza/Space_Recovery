import { describe, it, expect } from 'vitest';
import { formatCapacity, formatEngineMoney } from './utils';

describe('formatEngineMoney', () => {
  // Regression: adapters used a bare `toFixed()` that dropped the thousands
  // separator (e.g. "2000.000 OMR"); all money must now group consistently.
  it('groups thousands and respects decimal places + symbol position', () => {
    expect(formatEngineMoney(2000, { symbol: 'OMR', decimalPlaces: 3, position: 'after' })).toBe('2,000.000 OMR');
    expect(formatEngineMoney(1000, { symbol: 'OMR', decimalPlaces: 3, position: 'before' })).toBe('OMR 1,000.000');
    expect(formatEngineMoney(1234567.5, { symbol: 'AED', decimalPlaces: 2, position: 'after' })).toBe('1,234,567.50 AED');
  });

  it('leaves sub-thousand and zero-decimal amounts correct', () => {
    expect(formatEngineMoney(250, { symbol: 'AED', decimalPlaces: 2, position: 'after' })).toBe('250.00 AED');
    expect(formatEngineMoney(5000, { symbol: 'JPY', decimalPlaces: 0, position: 'before' })).toBe('JPY 5,000');
  });

  it('groups the integer part of a negative amount', () => {
    expect(formatEngineMoney(-1500, { symbol: 'AED', decimalPlaces: 2, position: 'after' })).toBe('-1,500.00 AED');
  });
});

describe('formatCapacity', () => {
  // Regression: catalog_device_capacities.name is a label like "2TB". parseFloat
  // stripped the unit ("2TB" -> 2) and the value was re-labelled "2 GB" on the
  // Device Check-In Receipt / Customer Copy / Checkout PDFs.
  it('preserves capacity labels that already carry a unit', () => {
    expect(formatCapacity('2TB')).toBe('2TB');
    expect(formatCapacity('500GB')).toBe('500GB');
    expect(formatCapacity('1.5 TB')).toBe('1.5 TB');
    expect(formatCapacity('4 TB')).toBe('4 TB');
    expect(formatCapacity('1PB')).toBe('1PB');
  });

  it('still formats bare GB numbers (legacy values stored without a unit)', () => {
    expect(formatCapacity('500')).toBe('500 GB');
    expect(formatCapacity('2000')).toBe('2.0 TB');
  });

  it('returns a dash for empty or blank input', () => {
    expect(formatCapacity(null)).toBe('-');
    expect(formatCapacity(undefined)).toBe('-');
    expect(formatCapacity('')).toBe('-');
    expect(formatCapacity('   ')).toBe('-');
  });
});
