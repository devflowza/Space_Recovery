import { describe, it, expect } from 'vitest';
import { escapeTypst } from './escape';

describe('escapeTypst', () => {
  it('escapes Typst markup metacharacters', () => {
    expect(escapeTypst('a #b $c [d]')).toBe('a \\#b \\$c \\[d\\]');
    expect(escapeTypst('a*b_c')).toBe('a\\*b\\_c');
    expect(escapeTypst('A#1[x]')).toBe('A\\#1\\[x\\]');
  });
  it('leaves non-special punctuation, digits and percent untouched', () => {
    expect(escapeTypst('100%')).toBe('100%');
    expect(escapeTypst('INV-0032')).toBe('INV-0032');
    expect(escapeTypst('2,000.000 OMR')).toBe('2,000.000 OMR');
    expect(escapeTypst('OM93 0300 0002 1702 0030438')).toBe('OM93 0300 0002 1702 0030438');
  });
  it('passes Arabic through unchanged', () => {
    expect(escapeTypst('المجموع الفرعي: 2,000.000 OMR')).toBe('المجموع الفرعي: 2,000.000 OMR');
  });
  it('handles null/undefined', () => {
    expect(escapeTypst(null)).toBe('');
    expect(escapeTypst(undefined)).toBe('');
  });
});
