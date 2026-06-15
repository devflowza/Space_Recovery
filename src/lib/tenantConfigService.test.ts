import { describe, it, expect, vi } from 'vitest';

// mapRowToConfig is pure, but importing tenantConfigService.ts pulls in
// supabaseClient (which throws without env vars). Mock it so the pure mapper is
// importable in the node test project — same pattern as the sibling service tests.
vi.mock('./supabaseClient', () => ({ supabase: {} }));
vi.mock('./logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { mapRowToConfig } from './tenantConfigService';
import { REQUIRED_SENTINEL } from '../types/tenantConfig';

describe('mapRowToConfig fail-loud (D2/D3)', () => {
  it('uses REQUIRED_SENTINEL — not USD/en-US — when currency/locale are absent', () => {
    const cfg = mapRowToConfig({ id: 't1', name: 'Lab', country: null }, null);
    expect(cfg.currency.code).toBe(REQUIRED_SENTINEL);
    expect(cfg.locale.localeCode).toBe(REQUIRED_SENTINEL);
  });
  it('passes through real resolved values', () => {
    const cfg = mapRowToConfig(
      { id: 't1', name: 'Lab', currency_code: 'OMR', locale_code: 'ar-OM', country: { code: 'OM', name: 'Oman' } },
      null,
    );
    expect(cfg.currency.code).toBe('OMR');
    expect(cfg.locale.localeCode).toBe('ar-OM');
  });
});
