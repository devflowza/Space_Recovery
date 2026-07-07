import { describe, it, expect } from 'vitest';
import { validateHsnSac, uqcForUnitCode } from './hsn';

describe('validateHsnSac', () => {
  it('accepts 4/6/8-digit HSN and 6-digit SAC codes', () => {
    expect(validateHsnSac('4907').ok).toBe(true);      // 4-digit HSN
    expect(validateHsnSac('998319').ok).toBe(true);    // 6-digit SAC (99xxxx)
    expect(validateHsnSac('84717020').ok).toBe(true);  // 8-digit HSN
  });
  it('rejects wrong lengths and non-digits', () => {
    expect(validateHsnSac('99871').ok).toBe(false);    // 5 digits
    expect(validateHsnSac('99871A').ok).toBe(false);
    expect(validateHsnSac('').ok).toBe(false);
    expect(validateHsnSac('998319').error).toBe(null);
    expect(validateHsnSac('99871').error).toContain('4, 6 or 8');
  });
});

describe('uqcForUnitCode', () => {
  const units = [
    { code: 'C62', uqc_code: 'NOS' },
    { code: 'HUR', uqc_code: 'OTH' },
    { code: 'XYZ', uqc_code: null },
  ];
  it('maps a Rec-20 code to its GSTN UQC', () => {
    expect(uqcForUnitCode('C62', units)).toBe('NOS');
    expect(uqcForUnitCode('HUR', units)).toBe('OTH');
  });
  it("falls back to 'OTH' for unmapped or unknown codes (never blank on a filing)", () => {
    expect(uqcForUnitCode('XYZ', units)).toBe('OTH');
    expect(uqcForUnitCode('NOPE', units)).toBe('OTH');
  });
});
