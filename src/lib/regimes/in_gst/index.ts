// India GST = a data-driven split_by_place_of_supply parameterization of the
// fiscal kernel. THIS FILE STAYS MATH-FREE (the structural test greps it): the
// intra/inter decision, slab resolution, inclusive back-out, largest-remainder
// split and the Section-170 whole-rupee rounding are ALL kernel behaviour driven
// by geo_country_tax_rates rows and the pack's tax.rounding_policy data.
import { computeWithMode } from '../../tax/kernel';
import type { TaxComputation, TaxContext, TaxStrategy } from '../types';

export const inGstStrategy: TaxStrategy = {
  key: 'in_gst',
  version: '1.0.0',
  schemeMode: 'split_by_place_of_supply',
  defaults: {
    roundingPolicy: { mode: 'half_up', level: 'head', cash_increment: 1 },
    scaleSystem: 'indian',
  },
  compute(ctx: TaxContext): TaxComputation {
    const c = computeWithMode(ctx, 'split_by_place_of_supply');
    return { ...c, trace: { ...c.trace, regimeKey: this.key, pluginVersion: this.version } };
  },
};
