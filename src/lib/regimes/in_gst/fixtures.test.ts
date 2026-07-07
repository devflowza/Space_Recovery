import { describe, it, expect, vi } from 'vitest';
import type { TaxContext } from '../types';
import { inGstStrategy } from './index';
// taxDocumentService pulls supabaseClient at import; stub it (roundOffAdjustmentLine is pure).
vi.mock('../../supabaseClient', () => ({ supabase: {} }));
import { roundOffAdjustmentLine } from '../../taxDocumentService';
import intraSac from './fixtures/intra_state_sac_998319.json';
import interIgst from './fixtures/inter_state_igst.json';
import inclusiveB2c from './fixtures/inclusive_b2c_rounding.json';
import headVsLine from './fixtures/head_vs_line_rounding.json';
import utgst from './fixtures/utgst_chandigarh.json';
import creditNote from './fixtures/credit_note_full_reversal.json';
import unregistered from './fixtures/unregistered_seller_plain_invoice.json';
import advance from './fixtures/advance_then_invoice_netting.json';

type Fx = { name: string; input_document: TaxContext; expected: { totals: Record<string, number | null>; rollups: Array<Record<string, unknown>> }; _meta: { external_validation: { status: string }; citations: string[] } };
const simple = [intraSac, interIgst, inclusiveB2c, headVsLine, utgst, creditNote, unregistered] as unknown as Fx[];

describe('in_gst golden fixtures (CA evidence corpus — external_validation pending)', () => {
  it('every fixture carries external-validation metadata + ≥1 statutory citation', () => {
    for (const f of [...simple, advance as unknown as Fx]) {
      expect(f._meta.external_validation.status, f.name).toMatch(/^(pending|validated)$/);
      expect(f._meta.citations.length, f.name).toBeGreaterThan(0);
    }
  });

  simple.forEach((f) => {
    it(`replays: ${f.name}`, async () => {
      const c = await inGstStrategy.compute(f.input_document);
      expect(c.totals).toEqual(f.expected.totals);
      f.expected.rollups.forEach((r, i) => expect(c.rollups[i]).toMatchObject(r));
      expect(c.trace.regimeKey).toBe('in_gst');
    });
  });

  it('intra-state resolves CGST+SGST via split_by_place_of_supply', async () => {
    const c = await inGstStrategy.compute((intraSac as unknown as Fx).input_document);
    expect(c.trace.schemeMode).toBe('split_by_place_of_supply');
    expect(c.trace.steps.some((s) => s.op === 'scheme_decision')).toBe(true);
    expect(c.rollups.map((r) => r.componentCode)).toEqual(['CGST', 'SGST']);
  });

  it('inter-state resolves a single IGST head', async () => {
    const c = await inGstStrategy.compute((interIgst as unknown as Fx).input_document);
    expect(c.rollups.map((r) => r.componentCode)).toEqual(['IGST']);
  });

  it('inclusive ₹5,000 B2C: EQUAL heads (381.36/381.36) + Section-170 round-off −0.01 line', async () => {
    const c = await inGstStrategy.compute((inclusiveB2c as unknown as Fx).input_document);
    expect(c.rollups.find((r) => r.componentCode === 'CGST')?.taxAmount).toBe(381.36);
    expect(c.rollups.find((r) => r.componentCode === 'SGST')?.taxAmount).toBe(381.36); // never 381.35
    expect(c.totals.grandTotal).toBe(5000);
    expect(c.totals.roundingAdjustment).toBe(-0.01);
    expect(roundOffAdjustmentLine(c)).toMatchObject({ componentCode: 'ROUND_OFF', taxTreatment: 'out_of_scope', taxAmount: -0.01 });
  });

  it('head-vs-line discriminator: head-level 2.32 differs from a wrong line-level 2.31', async () => {
    const doc = (headVsLine as unknown as Fx).input_document;
    const head = await inGstStrategy.compute(doc);
    expect(head.rollups.find((r) => r.componentCode === 'CGST')?.taxAmount).toBe(2.32);
    const lineLevel = await inGstStrategy.compute({ ...doc, roundingPolicy: { ...doc.roundingPolicy, level: 'line' } });
    expect(lineLevel.rollups.find((r) => r.componentCode === 'CGST')?.taxAmount).toBe(2.31);
  });

  it('UTGST Chandigarh: the second intra-UT head renders UTGST (label data); code stays SGST', async () => {
    const c = await inGstStrategy.compute((utgst as unknown as Fx).input_document);
    expect(c.rollups[1].componentCode).toBe('SGST');
    expect(c.rollups[1].componentLabel).toBe('UTGST 9%');
  });

  it('credit note flows through split mode with per-head components', async () => {
    expect((creditNote as unknown as Fx).input_document.documentType).toBe('credit_note');
    const c = await inGstStrategy.compute((creditNote as unknown as Fx).input_document);
    expect(c.rollups.map((r) => r.componentCode)).toEqual(['CGST', 'SGST']);
  });

  it('unregistered seller: a plain invoice carries NO GST heads', async () => {
    const c = await inGstStrategy.compute((unregistered as unknown as Fx).input_document);
    expect(c.rollups).toEqual([]);
    expect(c.totals.taxTotal).toBe(0);
    expect(c.totals.grandTotal).toBe(c.totals.taxableBase);
  });

  it('advance-then-invoice netting: voucher tax + net invoice tax = total supply tax (no GSTR-3B double count)', async () => {
    const adv = advance as unknown as { advance_input_document: TaxContext; input_document: TaxContext; expected: { advance_tax_total: number; final_tax_total: number; net_tax_total: number } };
    const advanceLeg = await inGstStrategy.compute(adv.advance_input_document);
    const finalLeg = await inGstStrategy.compute(adv.input_document);
    expect(advanceLeg.totals.taxTotal).toBe(adv.expected.advance_tax_total);
    expect(finalLeg.totals.taxTotal).toBe(adv.expected.final_tax_total);
    const netTax = Number((finalLeg.totals.taxTotal - advanceLeg.totals.taxTotal).toFixed(2));
    expect(netTax).toBe(adv.expected.net_tax_total);
    expect(advanceLeg.totals.taxTotal + netTax).toBe(finalLeg.totals.taxTotal); // conservation
  });
});
