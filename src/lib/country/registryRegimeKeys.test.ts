import { describe, it, expect } from 'vitest';
import { COUNTRY_CONFIG_REGISTRY, STATUTORY_KEYS } from './registry';

const byKey = new Map(COUNTRY_CONFIG_REGISTRY.map((d) => [d.key, d]));

describe('regime.* + reserved pack-schema keys (Phase 1 contract)', () => {
  it.each([
    ['regime.tax', 'simple_vat'],
    ['regime.einvoice', 'no_einvoice'],
    ['regime.numbering', 'prefix_numbering'],
    ['regime.documents', 'generic_invoice'],
    ['regime.payroll', 'none'],
  ])('%s exists, country-locked, codedDefault %s', (key, dflt) => {
    const def = byKey.get(key);
    expect(def).toBeDefined();
    expect(def!.maxOverrideLayer).toBe('country');
    expect(def!.codedDefault).toBe(dflt);
    expect(STATUTORY_KEYS).toContain(key);
  });
  it('tax.rounding_policy is pack DATA with the Oman-parity default', () => {
    expect(byKey.get('tax.rounding_policy')!.codedDefault).toEqual({ mode: 'half_up', level: 'document' });
    expect(byKey.get('tax.rounding_policy')!.maxOverrideLayer).toBe('country');
  });
  it('format.amount_words_scale defaults western, country-locked', () => {
    expect(byKey.get('format.amount_words_scale')!.codedDefault).toBe('western');
  });
  it('RESERVED keys registered with zero consumers (owner E6/E8/E9)', () => {
    expect(byKey.get('compliance.audit_file_exports')!.codedDefault).toEqual([]);
    expect(byKey.get('custody.unclaimed_property')!.codedDefault).toBeNull();
    expect(byKey.get('privacy.regime')!.codedDefault).toBe('none');
  });
});
