import { describe, it, expect, vi } from 'vitest';

// Mock supabaseClient so format.ts can be imported without env vars
vi.mock('./supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

import { formatCurrency } from './format';

describe('formatCurrency (currency-aware decimals)', () => {
  it('uses 2 decimals for USD', () => {
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50');
  });
  it('uses 3 decimals for OMR (ISO-4217)', () => {
    expect(formatCurrency(1234.5, 'OMR')).toMatch(/1,234\.500/);
  });
  it('uses 0 decimals for JPY', () => {
    expect(formatCurrency(1234, 'JPY')).toMatch(/1,234(?!\.)/);
  });
});
