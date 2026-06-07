import { describe, it, expect } from 'vitest';
import { resolveFeatureEnabled, type ResolvableFeature } from './resolveFeatures';

const reg: Record<string, ResolvableFeature> = {
  'core.overview': { key: 'core.overview', defaultEnabled: true, core: true },
  'tab.clones': { key: 'tab.clones', defaultEnabled: true },
  'tab.optedout': { key: 'tab.optedout', defaultEnabled: false },
  'nav.financial': { key: 'nav.financial', defaultEnabled: true },
  'tab.quotes': { key: 'tab.quotes', defaultEnabled: true, dependsOn: ['nav.financial'] },
};

describe('resolveFeatureEnabled', () => {
  it('treats unknown keys as enabled (flags are not security gates)', () => {
    expect(resolveFeatureEnabled(reg, {}, 'does.not.exist')).toBe(true);
  });

  it('keeps core features on even when an override tries to disable them', () => {
    expect(resolveFeatureEnabled(reg, { 'core.overview': false }, 'core.overview')).toBe(true);
  });

  it('uses the registry default when there is no override', () => {
    expect(resolveFeatureEnabled(reg, {}, 'tab.clones')).toBe(true);
    expect(resolveFeatureEnabled(reg, {}, 'tab.optedout')).toBe(false);
  });

  it('applies an explicit override over the default', () => {
    expect(resolveFeatureEnabled(reg, { 'tab.clones': false }, 'tab.clones')).toBe(false);
    expect(resolveFeatureEnabled(reg, { 'tab.optedout': true }, 'tab.optedout')).toBe(true);
  });

  it('cascades: a feature is disabled if any dependency is disabled', () => {
    expect(resolveFeatureEnabled(reg, { 'nav.financial': false }, 'tab.quotes')).toBe(false);
  });

  it('is enabled when its dependency is enabled', () => {
    expect(resolveFeatureEnabled(reg, {}, 'tab.quotes')).toBe(true);
  });

  it('tolerates null/undefined flags', () => {
    expect(resolveFeatureEnabled(reg, null, 'tab.clones')).toBe(true);
    expect(resolveFeatureEnabled(reg, undefined, 'tab.optedout')).toBe(false);
  });
});
