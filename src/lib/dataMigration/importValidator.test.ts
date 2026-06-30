import { describe, it, expect } from 'vitest';
import type { ParsedWorkbook } from './workbookContract';
import { validateWorkbook } from './importValidator';

function empty(): ParsedWorkbook {
  return {
    companies: [], customers: [], relationships: [], cases: [], devices: [],
    quotes: [], quoteItems: [], invoices: [], invoiceLineItems: [], notes: [], statusHistory: [],
  };
}

describe('validateWorkbook', () => {
  it('passes a minimal valid graph', () => {
    const wb = empty();
    wb.customers = [{ legacy_id: 'CU1', customer_name: 'Jo', created_at: '2021-01-01T00:00:00Z' }];
    wb.cases = [{ legacy_id: 'K1', case_number: 'CASE-0001', customer_legacy_id: 'CU1' }];
    const r = validateWorkbook(wb);
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.counts.cases).toBe(1);
  });

  it('flags a missing required field as an error', () => {
    const wb = empty();
    wb.customers = [{ legacy_id: 'CU1' }]; // customer_name required
    const r = validateWorkbook(wb);
    expect(r.ok).toBe(false);
    expect(r.issues).toContainEqual(
      expect.objectContaining({ entity: 'customers', field: 'customer_name', severity: 'error' }),
    );
  });

  it('flags a duplicate legacy_id within an entity', () => {
    const wb = empty();
    wb.customers = [
      { legacy_id: 'CU1', customer_name: 'A' },
      { legacy_id: 'CU1', customer_name: 'B' },
    ];
    const r = validateWorkbook(wb);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.message.toLowerCase().includes('duplicate legacy_id'))).toBe(true);
  });

  it('flags a dangling in-file FK (case → unknown customer)', () => {
    const wb = empty();
    wb.cases = [{ legacy_id: 'K1', case_number: 'CASE-1', customer_legacy_id: 'NOPE' }];
    const r = validateWorkbook(wb);
    expect(r.ok).toBe(false);
    expect(r.issues).toContainEqual(
      expect.objectContaining({ entity: 'cases', legacyId: 'K1', severity: 'error' }),
    );
  });

  it('flags duplicate case_number and invoice_number', () => {
    const wb = empty();
    wb.cases = [
      { legacy_id: 'K1', case_number: 'DUP' },
      { legacy_id: 'K2', case_number: 'DUP' },
    ];
    wb.invoices = [
      { legacy_id: 'I1', invoice_number: 'INV-1' },
      { legacy_id: 'I2', invoice_number: 'INV-1' },
    ];
    const r = validateWorkbook(wb);
    expect(r.issues.filter((i) => i.message.toLowerCase().includes('duplicate')).length).toBeGreaterThanOrEqual(2);
  });

  it('coerces a bad date/number to an error, not a throw', () => {
    const wb = empty();
    wb.customers = [{ legacy_id: 'CU1', customer_name: 'A', created_at: 'not-a-date' }];
    wb.quotes = [{ legacy_id: 'Q1', quote_number: 'Q-1', total_amount: 'abc' }];
    const r = validateWorkbook(wb);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.field === 'created_at')).toBe(true);
    expect(r.issues.some((i) => i.field === 'total_amount')).toBe(true);
  });
});
