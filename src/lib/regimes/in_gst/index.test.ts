import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inGstStrategy } from './index';
import { resolveTaxStrategy } from '../registry';
import { registerAllRegimePlugins } from '../register';

describe('in_gst strategy — parameterization, not a fork', () => {
  it('declares the contract identity (head-level rounding + Indian scale)', () => {
    expect(inGstStrategy.key).toBe('in_gst');
    expect(inGstStrategy.version).toBe('1.0.0');
    expect(inGstStrategy.schemeMode).toBe('split_by_place_of_supply');
    expect(inGstStrategy.defaults.roundingPolicy).toEqual({ mode: 'half_up', level: 'head', cash_increment: 1 });
    expect(inGstStrategy.defaults.scaleSystem).toBe('indian');
  });

  it('is resolvable from the registry after bootstrap', () => {
    registerAllRegimePlugins();
    expect(resolveTaxStrategy('in_gst')).toBe(inGstStrategy);
  });

  it('compute() is a pure kernel delegation — zero India arithmetic in the plugin', () => {
    const src = readFileSync(fileURLToPath(new URL('./index.ts', import.meta.url)), 'utf8');
    expect(src).toContain("computeWithMode(ctx, 'split_by_place_of_supply')");
    expect(src).not.toMatch(/CGST|SGST|IGST/);   // component names live in DATA, never the plugin
    expect(src).not.toMatch(/\d\s*\/\s*2/);       // no hand-halved dual levy
    expect(src).not.toMatch(/\/\s*100/);          // no rate arithmetic
  });
});
