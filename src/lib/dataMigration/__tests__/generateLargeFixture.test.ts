import { describe, it, expect } from 'vitest';
import { generateLargeFixture, FIXTURE_COUNTS } from './fixtures/generateLargeFixture';
import { IMPORT_ORDER } from '../workbookContract';

describe('generateLargeFixture', () => {
  // Use smaller scale so the unit test is fast; full 10k is exercised in P6.2
  const wb = generateLargeFixture({ customerCount: 100, seed: 42 });

  it('returns a ParsedWorkbook with all EntityType sheets', () => {
    for (const entity of IMPORT_ORDER) {
      expect(wb).toHaveProperty(entity);
      expect(Array.isArray(wb[entity])).toBe(true);
    }
  });

  it('every row in every sheet has a non-empty legacy_id', () => {
    for (const entity of IMPORT_ORDER) {
      for (const row of wb[entity]) {
        expect(typeof row['legacy_id']).toBe('string');
        expect((row['legacy_id'] as string).length).toBeGreaterThan(0);
      }
    }
  });

  it('generates exactly 100 customers', () => {
    expect(wb.customers.length).toBe(100);
  });

  it('generates proportional companies (1 per 5 customers)', () => {
    expect(wb.companies.length).toBe(20); // 100/5
  });

  it('every case references a customer_legacy_id that exists in customers', () => {
    const customerIds = new Set(wb.customers.map(r => r['legacy_id'] as string));
    for (const c of wb.cases) {
      expect(customerIds.has(c['customer_legacy_id'] as string)).toBe(true);
    }
  });

  it('every device references a case_legacy_id that exists in cases', () => {
    const caseIds = new Set(wb.cases.map(r => r['legacy_id'] as string));
    for (const d of wb.devices) {
      expect(caseIds.has(d['case_legacy_id'] as string)).toBe(true);
    }
  });

  it('every quoteItem references a quote_legacy_id that exists in quotes', () => {
    const quoteIds = new Set(wb.quotes.map(r => r['legacy_id'] as string));
    for (const qi of wb.quoteItems) {
      expect(quoteIds.has(qi['quote_legacy_id'] as string)).toBe(true);
    }
  });

  it('every invoiceLineItem references an invoice_legacy_id that exists in invoices', () => {
    const invoiceIds = new Set(wb.invoices.map(r => r['legacy_id'] as string));
    for (const li of wb.invoiceLineItems) {
      expect(invoiceIds.has(li['invoice_legacy_id'] as string)).toBe(true);
    }
  });

  it('every note and statusHistory entry references a valid case_legacy_id', () => {
    const caseIds = new Set(wb.cases.map(r => r['legacy_id'] as string));
    for (const n of wb.notes) {
      expect(caseIds.has(n['case_legacy_id'] as string)).toBe(true);
    }
    for (const s of wb.statusHistory) {
      expect(caseIds.has(s['case_legacy_id'] as string)).toBe(true);
    }
  });

  it('statusHistory entries for a case are ordered by performed_at ascending', () => {
    const byCase = new Map<string, string[]>();
    for (const s of wb.statusHistory) {
      const k = s['case_legacy_id'] as string;
      if (!byCase.has(k)) byCase.set(k, []);
      // performed_at is stored in the fixture; fall back to created_at if absent
      byCase.get(k)!.push((s['performed_at'] ?? s['created_at']) as string);
    }
    for (const [, timestamps] of byCase) {
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i] >= timestamps[i - 1]).toBe(true);
      }
    }
  });

  it('all legacy_ids within an entity sheet are unique', () => {
    for (const entity of ['companies','customers','cases','devices','quotes','quoteItems','invoices','invoiceLineItems','notes'] as const) {
      const ids = wb[entity].map((r: Record<string,unknown>) => r['legacy_id'] as string);
      expect(ids.length).toBe(new Set(ids).size);
    }
  });

  it('FIXTURE_COUNTS at scale=10000 reports expected totals', () => {
    const counts = FIXTURE_COUNTS(10_000);
    expect(counts.customers).toBe(10_000);
    expect(counts.companies).toBe(2_000);    // 10000/5
    expect(counts.cases).toBe(15_000);       // 1.5 per customer
    expect(counts.devices).toBe(22_500);     // 1.5 per case
    expect(counts.quotes).toBe(15_000);      // 1 per case
    expect(counts.quoteItems).toBe(30_000);  // 2 per quote
    expect(counts.invoices).toBe(15_000);    // 1 per case
    expect(counts.invoiceLineItems).toBe(30_000); // 2 per invoice
    expect(counts.notes).toBe(30_000);       // 2 per case
    expect(counts.statusHistory).toBe(45_000); // 3 per case
  });
});
