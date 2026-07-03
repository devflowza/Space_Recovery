import { computeDocumentTax } from '../../tax/kernel';
import type { TaxComputation, TaxContext, TaxStrategy } from '../types';

/**
 * The shared default TaxStrategy: one country-level component set, document-level
 * half-up rounding, western words scale. Keeps ~80% of countries data-only and is
 * BYTE-IDENTICAL to the legacy calculateInvoiceTotals/calculateQuoteTotals math —
 * proven by the M-E parity replay over the full live Omani corpus.
 */
export const simpleVat: TaxStrategy = {
  key: 'simple_vat',
  version: '1.0.0',
  schemeMode: 'single',
  defaults: { roundingPolicy: { mode: 'half_up', level: 'document' }, scaleSystem: 'western' },
  compute(ctx: TaxContext): TaxComputation {
    const c = computeDocumentTax(ctx);
    return { ...c, trace: { ...c.trace, regimeKey: this.key, pluginVersion: this.version } };
  },
};
