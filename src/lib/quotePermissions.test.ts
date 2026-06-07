import { describe, it, expect } from 'vitest';
import { getQuoteEditability, type QuoteLifecycle } from './quotePermissions';

const q = (status: string): QuoteLifecycle => ({ status });

describe('getQuoteEditability', () => {
  it('allows full edit + delete for a draft', () => {
    const e = getQuoteEditability(q('draft'));
    expect(e).toMatchObject({ canEdit: true, canDelete: true, canConvert: false, mode: 'full' });
  });

  it('allows edit but not delete once sent', () => {
    const e = getQuoteEditability(q('sent'));
    expect(e).toMatchObject({ canEdit: true, canDelete: false, mode: 'full' });
  });

  it('locks editing once accepted, and allows convert', () => {
    const e = getQuoteEditability(q('accepted'));
    expect(e.canEdit).toBe(false);
    expect(e.canConvert).toBe(true);
    expect(e.mode).toBe('none');
    expect(e.reason).toBeTruthy();
  });

  it('locks editing for rejected / expired / converted', () => {
    for (const status of ['rejected', 'expired', 'converted']) {
      const e = getQuoteEditability(q(status));
      expect(e.canEdit).toBe(false);
      expect(e.canDelete).toBe(false);
      expect(e.mode).toBe('none');
      expect(e.reason).toBeTruthy();
    }
  });

  it('defaults a missing status to an editable draft', () => {
    expect(getQuoteEditability({}).canEdit).toBe(true);
  });
});
