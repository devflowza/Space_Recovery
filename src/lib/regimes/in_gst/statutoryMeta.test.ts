import { describe, it, expect } from 'vitest';
import {
  buildIndiaStatutoryMeta, resolveStatutoryDocumentMeta, INDIA_SIGNATURE_LINES,
} from './statutoryMeta';

const base = {
  placeOfSupplyStateName: 'Maharashtra',
  placeOfSupplyStateCode: '27',
  reverseCharge: false,
  billingAddress: '12 MG Road, Pune',
  deliveryAddress: null as string | null,
};

describe('buildIndiaStatutoryMeta (Rule 46 conditionals)', () => {
  it('prints Place of Supply as "State Name (Code)" and Reverse Charge always', () => {
    const rows = buildIndiaStatutoryMeta(base);
    expect(rows).toEqual([
      { label: { en: 'Place of Supply:' }, value: 'Maharashtra (27)' },
      { label: { en: 'Reverse Charge:' }, value: 'No' },
    ]);
  });

  it('prints Reverse Charge: Yes when the flag is set', () => {
    const rows = buildIndiaStatutoryMeta({ ...base, reverseCharge: true });
    expect(rows).toContainEqual({ label: { en: 'Reverse Charge:' }, value: 'Yes' });
  });

  it('adds a Delivery Address row ONLY when it differs from billing (Rule 46 ship-to)', () => {
    expect(buildIndiaStatutoryMeta({ ...base, deliveryAddress: '12 MG Road, Pune' }))
      .not.toContainEqual({ label: { en: 'Delivery Address:' }, value: '12 MG Road, Pune' });
    expect(buildIndiaStatutoryMeta({ ...base, deliveryAddress: 'Plot 9, Hinjewadi' }))
      .toContainEqual({ label: { en: 'Delivery Address:' }, value: 'Plot 9, Hinjewadi' });
  });

  it('omits Place of Supply when state data is absent (honest-degrade, no blank row)', () => {
    const rows = buildIndiaStatutoryMeta({ ...base, placeOfSupplyStateName: null, placeOfSupplyStateCode: null });
    expect(rows.some((r) => r.label.en === 'Place of Supply:')).toBe(false);
    expect(rows).toContainEqual({ label: { en: 'Reverse Charge:' }, value: 'No' });
  });

  it('exposes the r.46(q) authorised-signatory block lines', () => {
    expect(INDIA_SIGNATURE_LINES).toEqual(['For {SELLER}', 'Authorised Signatory']);
  });
});

describe('resolveStatutoryDocumentMeta (dispatch by profile key, never country string)', () => {
  it('returns India rows only for in_gst_invoice, [] for every other profile', () => {
    expect(resolveStatutoryDocumentMeta('in_gst_invoice', base).length).toBeGreaterThan(0);
    expect(resolveStatutoryDocumentMeta('gcc_tax_invoice', base)).toEqual([]);
    expect(resolveStatutoryDocumentMeta('generic_invoice', base)).toEqual([]);
    expect(resolveStatutoryDocumentMeta('', base)).toEqual([]);
  });
});
