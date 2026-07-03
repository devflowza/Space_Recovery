// Pins the generated table Row types to the kernel's structural mirrors. If a
// migration renames/retypes a column the kernel reads, this file fails tsc/CI.
import { describe, it, expect } from 'vitest';
import type { Database } from '../../types/database.types';
import type { GeoCountryTaxRateRow, LegalEntityTaxRegistrationRow } from './types';

type DbRate = Database['public']['Tables']['geo_country_tax_rates']['Row'];
type DbReg = Database['public']['Tables']['legal_entity_tax_registrations']['Row'];
type DbTaxLine = Database['public']['Tables']['document_tax_lines']['Row'];

// Field-level assignability (generated Row → structural kernel row). The cast
// through a narrowing function proves each structural field exists with a
// compatible type on the generated Row.
const narrowRate = (r: DbRate): GeoCountryTaxRateRow => ({
  id: r.id, country_id: r.country_id, subdivision_id: r.subdivision_id,
  component_code: r.component_code, component_label: r.component_label,
  tax_category: r.tax_category as GeoCountryTaxRateRow['tax_category'],
  rate: r.rate, applies_to: r.applies_to, valid_from: r.valid_from,
  valid_to: r.valid_to, sort_order: r.sort_order,
});
const narrowReg = (r: DbReg): LegalEntityTaxRegistrationRow => ({
  id: r.id, legal_entity_id: r.legal_entity_id, country_id: r.country_id,
  subdivision_id: r.subdivision_id, tax_number: r.tax_number,
  scheme: r.scheme as LegalEntityTaxRegistrationRow['scheme'],
  registered_from: r.registered_from, registered_to: r.registered_to, is_primary: r.is_primary,
});

describe('generated Row ↔ kernel structural row pins', () => {
  it('narrowing functions typecheck (the real assertion is compile-time)', () => {
    expect(typeof narrowRate).toBe('function');
    expect(typeof narrowReg).toBe('function');
    const taxLineKeys: Array<keyof DbTaxLine> = [
      'document_type', 'document_id', 'line_item_id', 'component_code', 'component_label',
      'rate', 'taxable_base', 'tax_amount', 'currency', 'exchange_rate', 'tax_amount_base',
      'tax_treatment', 'regime_key', 'plugin_version', 'pack_version_id', 'rule_trace', 'backfilled', 'sequence',
    ];
    expect(taxLineKeys.length).toBe(18);
  });
});
