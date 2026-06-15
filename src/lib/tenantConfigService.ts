import { supabase } from './supabaseClient';
import type { TenantConfig, TaxSystem, Theme } from '../types/tenantConfig';
import { DEFAULT_TENANT_CONFIG, DEFAULT_THEME, THEMES, REQUIRED_SENTINEL } from '../types/tenantConfig';
import { logger } from './logger';

const configCache = new Map<string, { config: TenantConfig; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchTenantConfig(tenantId: string): Promise<TenantConfig> {
  // Per-tenant feature overrides, read concurrently with the tenant config.
  const flagsPromise = supabase
    .from('tenants')
    .select('feature_flags')
    .eq('id', tenantId)
    .maybeSingle();

  // These reads are keyed only on tenantId and are independent, so run concurrently.
  const [tenantResult, localeResult, flagsResult] = await Promise.all([
    supabase
      .from('tenants')
      .select(`
        id, name, theme, ui_language,
        currency_code, currency_symbol, decimal_places,
        tax_system, tax_label, tax_number_label, tax_number, default_tax_rate,
        locale_code, timezone, date_format, fiscal_year_start,
        country:geo_countries!country_id (
          code, name, currency_name,
          decimal_separator, thousands_separator, currency_position,
          tax_number_format, tax_number_placeholder,
          time_format, week_starts_on, language_code,
          postal_code_label, tax_invoice_required
        )
      `)
      .eq('id', tenantId)
      .maybeSingle(),
    supabase
      .from('accounting_locales')
      .select('currency_code, currency_symbol, decimal_places, currency_position, decimal_separator, thousands_separator, date_format, locale_code')
      .eq('tenant_id', tenantId)
      .eq('is_default', true)
      .is('deleted_at', null)
      .maybeSingle(),
    flagsPromise,
  ]);

  const { data, error } = tenantResult;
  if (error || !data) {
    logger.error('Failed to fetch tenant config:', error);
    return { ...DEFAULT_TENANT_CONFIG, tenantId };
  }

  const { data: defaultLocale } = localeResult;

  const rawFlags = flagsResult?.data?.feature_flags;
  const featureFlags: Record<string, boolean> =
    rawFlags && typeof rawFlags === 'object' && !Array.isArray(rawFlags)
      ? (rawFlags as Record<string, boolean>)
      : {};

  return { ...mapRowToConfig(data, defaultLocale), featureFlags };
}

/**
 * Pure mapper: tenant row (+ default accounting-locale row) → TenantConfig.
 * D2/D3 fail-loud: required jurisdiction-derived keys (currency code, locale code)
 * resolve to REQUIRED_SENTINEL when absent — NEVER to a US literal (USD/en-US). The
 * provider surfaces this via isResolvedConfig instead of silently rendering US.
 * Cosmetic/tenant-chosen display fields (symbol, separators, position) keep their
 * safe display fallbacks (spec §2.3). Extracted as the testable seam for Task 2.2.
 */
export function mapRowToConfig(
  data: Record<string, unknown>,
  defaultLocale: Record<string, unknown> | null,
): TenantConfig {
  const country = (data.country as Record<string, unknown> | null) ?? null;
  return {
    tenantId: data.id as string,
    tenantName: data.name as string,
    countryCode: (country?.code as string) || 'US',
    countryName: (country?.name as string) || 'United States',
    currency: {
      code: (defaultLocale?.currency_code as string) || (data.currency_code as string) || REQUIRED_SENTINEL,
      symbol: (defaultLocale?.currency_symbol as string) || (data.currency_symbol as string) || '$',
      name: (country?.currency_name as string) || (data.currency_code as string) || 'Currency',
      decimalPlaces: (defaultLocale?.decimal_places as number) ?? (data.decimal_places as number) ?? 2,
      decimalSeparator: (defaultLocale?.decimal_separator as string) || (country?.decimal_separator as string) || '.',
      thousandsSeparator: (defaultLocale?.thousands_separator as string) ?? (country?.thousands_separator as string) ?? ',',
      position: ((defaultLocale?.currency_position as string) || (country?.currency_position as string) || 'before') as 'before' | 'after',
    },
    tax: {
      system: (data.tax_system || 'NONE') as TaxSystem,
      label: (data.tax_label as string) || 'Tax',
      numberLabel: (data.tax_number_label as string) || 'Tax ID',
      numberFormat: (country?.tax_number_format as string) || null,
      numberPlaceholder: (country?.tax_number_placeholder as string) || null,
      defaultRate: parseFloat(String(data.default_tax_rate)) || 0,
      invoiceRequired: (country?.tax_invoice_required as boolean) || false,
    },
    dateTime: {
      dateFormat: (defaultLocale?.date_format as string) || (data.date_format as string) || 'MM/DD/YYYY',
      timeFormat: ((country?.time_format as string) || '12h') as '12h' | '24h',
      timezone: (data.timezone as string) || 'UTC',
      weekStartsOn: ((country?.week_starts_on as number) ?? 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      fiscalYearStart: (data.fiscal_year_start as string) || '01-01',
    },
    locale: {
      localeCode: (defaultLocale?.locale_code as string) || (data.locale_code as string) || REQUIRED_SENTINEL,
      // UI language / text-direction is a deliberate tenant choice, NOT a function
      // of country. country.language_code is intentionally no longer read here, so
      // an English-operating lab in an Arabic-language country defaults to LTR.
      languageCode: (data.ui_language as string) || 'en',
      postalCodeLabel: (country?.postal_code_label as string) || 'Postal Code',
    },
    theme: THEMES.includes(data.theme as Theme) ? (data.theme as Theme) : DEFAULT_THEME,
    featureFlags: {},
  };
}

export async function getTenantConfig(tenantId: string): Promise<TenantConfig> {
  const cached = configCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.config;
  }

  const config = await fetchTenantConfig(tenantId);
  configCache.set(tenantId, { config, timestamp: Date.now() });
  return config;
}

export async function updateTenantUiLanguage(tenantId: string, language: 'en' | 'ar'): Promise<void> {
  if (language !== 'en' && language !== 'ar') {
    throw new Error(`Invalid UI language: ${language}`);
  }
  const { error } = await supabase
    .from('tenants')
    .update({ ui_language: language })
    .eq('id', tenantId);
  if (error) {
    logger.error('Failed to update tenant UI language:', error);
    throw error;
  }
  invalidateTenantConfigCache(tenantId);
}

export function invalidateTenantConfigCache(tenantId: string): void {
  configCache.delete(tenantId);
}

export function clearTenantConfigCache(): void {
  configCache.clear();
}
