// INV-01 v1.1 field-completeness ASSERTION (WP-L5, D3): xSuite's issuance data
// surface must already cover every mandatory-core INV-01 field. This is a test
// over a typed map — NOT an IRN payload builder (that is a named deferral, §7).
// Column-name existence is enforced at compile time (keyof Database rows); this
// suite enforces coverage, uniqueness, and the statutory spot-checks.
import { describe, it, expect } from 'vitest';
import { INV01_MANDATORY_FIELDS } from './inv01FieldMap';

const byField = (field: string) => INV01_MANDATORY_FIELDS.find((e) => e.field === field);

describe('INV-01 v1.1 field-completeness assertion', () => {
  it('pins the mandatory-core field count at 39', () => {
    expect(INV01_MANDATORY_FIELDS).toHaveLength(39);
  });

  it('field paths are unique', () => {
    const fields = INV01_MANDATORY_FIELDS.map((e) => e.field);
    expect(new Set(fields).size).toBe(fields.length);
  });

  it('every mandatory field has a real source — ZERO gaps', () => {
    const gaps = INV01_MANDATORY_FIELDS.filter((e) => e.source.kind === 'gap');
    expect(gaps.map((g) => g.field)).toEqual([]);
  });

  it('every derived source names its table.column inputs and a non-empty rule', () => {
    for (const entry of INV01_MANDATORY_FIELDS) {
      if (entry.source.kind !== 'derived') continue;
      expect(entry.source.from.length, entry.field).toBeGreaterThan(0);
      expect(entry.source.rule.length, entry.field).toBeGreaterThan(0);
      for (const ref of entry.source.from) {
        expect(ref, `${entry.field} input '${ref}'`).toMatch(/^[a-z_]+\.[a-z_]+$/);
      }
    }
  });

  it('all three GST heads are covered per line AND per document (stored amounts, never recomputed)', () => {
    for (const field of ['ItemList.IgstAmt', 'ItemList.CgstAmt', 'ItemList.SgstAmt',
                         'ValDtls.IgstVal', 'ValDtls.CgstVal', 'ValDtls.SgstVal']) {
      const entry = byField(field);
      expect(entry?.source.kind, field).toBe('tax_line_column');
      if (entry?.source.kind === 'tax_line_column') {
        expect(entry.source.column).toBe('tax_amount');
        expect(['IGST', 'CGST', 'SGST']).toContain(entry.source.componentCode);
      }
    }
  });

  it('place of supply (Pos) comes from the frozen invoice snapshot via the subdivision GST code', () => {
    expect(byField('BuyerDtls.Pos')?.source).toEqual({
      kind: 'subdivision_column',
      column: 'tax_authority_code',
      via: 'place_of_supply_subdivision_id',
    });
  });

  it('HSN/SAC and UQC come from the statutory line-item columns (S4 forcedColumns)', () => {
    expect(byField('ItemList.HsnCd')?.source).toEqual({ kind: 'line_item_column', column: 'item_code' });
    expect(byField('ItemList.Unit')?.source).toEqual({ kind: 'line_item_column', column: 'unit_code' });
  });

  it('round-off maps to the persisted Section 170 adjustment line, not a render-time recompute', () => {
    const entry = byField('ValDtls.RndOffAmt');
    expect(entry?.source.kind).toBe('derived');
    if (entry?.source.kind === 'derived') {
      expect(entry.source.from).toContain('document_tax_lines.tax_treatment');
      expect(entry.source.rule).toContain('out_of_scope');
    }
  });
});
