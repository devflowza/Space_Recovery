// Registry <-> DB-snapshot-mapper parity (localization Phase 0). The TS registry
// (src/lib/country/registry.ts) declares the config keys tenants resolve; the DB
// mapper _apply_country_config() writes the snapshot bag. Keys sourced from coded
// defaults / governed jsonb (not geo_countries columns) are exempt.
export const CODED_DEFAULT_KEYS: Set<string> = new Set([
  'currency.display_mode',   // tenant preference, codedDefault
  'currency.negative_format',// tenant preference, codedDefault
  'tax.zatca_qr.enabled',    // governed via country_config jsonb, not a geo column
  // regime.* routing + reserved pack-schema keys (Phase 1): registry-resolved from
  // coded defaults, NOT written by _apply_country_config (no geo_countries column).
  'regime.tax',
  'regime.einvoice',
  'regime.numbering',
  'regime.documents',
  'regime.payroll',
  'tax.rounding_policy',
  'format.amount_words_scale',
  'compliance.audit_file_exports',
  'custody.unclaimed_property',
  'privacy.regime',
]);

/** Dotted config-key literals ('domain.key') inside a pg_get_functiondef body. */
export function parseMapperKeys(funcDef: string): string[] {
  return [...funcDef.matchAll(
    /'((?:currency|tax|datetime|locale|number_format|address)\.[A-Za-z0-9_.]+)'/g,
  )].map((m) => m[1]);
}

export function diffMapperKeys(
  registryKeys: string[],
  mapperKeys: string[],
): { missingInMapper: string[]; inParity: boolean } {
  const mapper = new Set(mapperKeys);
  const missingInMapper = registryKeys
    .filter((k) => !CODED_DEFAULT_KEYS.has(k) && !mapper.has(k))
    .sort();
  return { missingInMapper, inParity: missingInMapper.length === 0 };
}
