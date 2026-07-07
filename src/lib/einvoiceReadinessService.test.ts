import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getOrCreateCompanySettings, updateCompanySettings, invalidateCompanySettingsCache } = vi.hoisted(() => ({
  getOrCreateCompanySettings: vi.fn(),
  updateCompanySettings: vi.fn(),
  invalidateCompanySettingsCache: vi.fn(),
}));
vi.mock('./companySettingsService', () => ({
  getOrCreateCompanySettings,
  updateCompanySettings,
  invalidateCompanySettingsCache,
}));

import { getEInvoiceReadiness, setEInvoiceApplicable } from './einvoiceReadinessService';
import {
  isEInvoiceApplicable,
  normalizeEInvoiceReadiness,
  EINVOICE_READINESS_METADATA_KEY,
} from './einvoiceReadiness';

beforeEach(() => {
  vi.clearAllMocks();
  updateCompanySettings.mockResolvedValue({ id: 'cs1' });
});

describe('einvoiceReadiness (pure)', () => {
  it('defaults to not-applicable on null/corrupt metadata', () => {
    expect(normalizeEInvoiceReadiness(null)).toEqual({ applicable: false, marked_at: null });
    expect(normalizeEInvoiceReadiness('junk')).toEqual({ applicable: false, marked_at: null });
    // string 'true' must NOT pass — only boolean true (guards JSON round-trips)
    expect(normalizeEInvoiceReadiness({ applicable: 'true' }).applicable).toBe(false);
  });

  it('isEInvoiceApplicable reads the flag straight off a metadata bag (adapter path)', () => {
    expect(isEInvoiceApplicable(null)).toBe(false);
    expect(isEInvoiceApplicable({})).toBe(false);
    expect(isEInvoiceApplicable({ [EINVOICE_READINESS_METADATA_KEY]: { applicable: true } })).toBe(true);
    expect(isEInvoiceApplicable({ [EINVOICE_READINESS_METADATA_KEY]: { applicable: false } })).toBe(false);
  });
});

describe('einvoiceReadinessService', () => {
  it('getEInvoiceReadiness returns the default when metadata is empty', async () => {
    getOrCreateCompanySettings.mockResolvedValue({ id: 'cs1', metadata: null });
    expect(await getEInvoiceReadiness()).toEqual({ applicable: false, marked_at: null });
  });

  it('getEInvoiceReadiness returns the stored flag', async () => {
    getOrCreateCompanySettings.mockResolvedValue({
      id: 'cs1',
      metadata: { einvoice_readiness: { applicable: true, marked_at: '2026-07-05T00:00:00.000Z' } },
    });
    expect(await getEInvoiceReadiness()).toEqual({
      applicable: true,
      marked_at: '2026-07-05T00:00:00.000Z',
    });
  });

  it('setEInvoiceApplicable preserves sibling metadata keys and invalidates the cache', async () => {
    getOrCreateCompanySettings.mockResolvedValue({
      id: 'cs1',
      metadata: { table_columns: { cases: { visible: ['case_number'] } }, list_page_size: 25 },
    });
    await setEInvoiceApplicable(true);

    const written = updateCompanySettings.mock.calls[0][0].metadata as Record<string, unknown>;
    expect(written.table_columns).toEqual({ cases: { visible: ['case_number'] } }); // siblings intact
    expect(written.list_page_size).toBe(25);
    const flag = written.einvoice_readiness as { applicable: boolean; marked_at: string };
    expect(flag.applicable).toBe(true);
    expect(typeof flag.marked_at).toBe('string');
    expect(Number.isNaN(Date.parse(flag.marked_at))).toBe(false);
    expect(invalidateCompanySettingsCache).toHaveBeenCalled();
  });
});
