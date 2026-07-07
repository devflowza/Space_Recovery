import { describe, it, expect } from 'vitest';
import { toEngineData } from './invoiceAdapter';
import { BUILT_IN_TEMPLATE_CONFIGS, resolveTemplateConfigWithCountry } from '../../templateConfig';
import { countryTemplateOverride, type ResolvedCountryFacts } from '../countryConfig';
import { gccTaxInvoiceProfile } from '../../../regimes/gcc_tax_invoice';
import { registerAllRegimePlugins } from '../../../regimes/register';
import { buildInvoiceFixture } from '../invoiceParity.fixtures';
import { EINVOICE_READINESS_METADATA_KEY } from '../../../einvoiceReadiness';

const inFacts: ResolvedCountryFacts = {
  code: 'IN',
  taxSystem: 'GST',
  taxLabel: 'GST',
  taxNumberLabel: 'GSTIN',
  taxInvoiceRequired: true,
  languageCode: 'en',
  decimalPlaces: 2,
  dateFormat: 'DD/MM/YYYY',
  decimalSeparator: '.',
  thousandsSeparator: ',',
  digitGrouping: '3;2',
  einvoiceRegimeKey: 'no_einvoice', // D3: no in_irn regime exists this phase
};

const inConfig = () =>
  resolveTemplateConfigWithCountry(BUILT_IN_TEMPLATE_CONFIGS.invoice, countryTemplateOverride(inFacts));

function flaggedFixture() {
  const fixture = buildInvoiceFixture();
  fixture.companySettings = {
    ...fixture.companySettings,
    metadata: { [EINVOICE_READINESS_METADATA_KEY]: { applicable: true, marked_at: '2026-07-05T00:00:00.000Z' } },
  };
  return fixture;
}

describe('invoice PDF IRN QR real-estate (Phase 4 D3)', () => {
  it('unflagged tenants are byte-identical: default caption + generic QR', () => {
    const data = toEngineData(buildInvoiceFixture(), inConfig(), inFacts);
    expect(data.qrCaption).toBe('Scan to verify this invoice');
    expect(data.qrPayload).toContain('INVOICE:');
    expect(data.zatcaPayload).toBeNull();
  });

  it('flagged tenants get the RESERVED IRN caption — payload stays the generic verification QR, never a fabricated IRN', () => {
    const data = toEngineData(flaggedFixture(), inConfig(), inFacts);
    expect(data.qrCaption).toBe('IRN QR (reserved) — register on IRP; verification QR shown');
    expect(data.qrPayload).toContain('INVOICE:'); // still the honest verification payload
    expect(data.zatcaPayload).toBeNull();         // no e-invoice artifact is fabricated
  });

  it('a real e-invoice regime payload takes precedence over the reservation caption', () => {
    registerAllRegimePlugins();
    const zatcaFacts: ResolvedCountryFacts = { ...inFacts, code: 'SA', einvoiceRegimeKey: 'zatca_ph1' };
    const zatcaConfig = resolveTemplateConfigWithCountry(
      BUILT_IN_TEMPLATE_CONFIGS.invoice,
      countryTemplateOverride(zatcaFacts, {
        profile: gccTaxInvoiceProfile,
        sellerRegistered: true,
        docType: 'invoice',
      }),
    );
    const fixture = flaggedFixture();
    fixture.invoiceData.seller_tax_number = '310123456700003';
    const data = toEngineData(fixture, zatcaConfig, zatcaFacts);
    expect(data.zatcaPayload).toBeTruthy();
    expect(data.qrCaption).toBe('ZATCA e-invoice QR');
  });
});
