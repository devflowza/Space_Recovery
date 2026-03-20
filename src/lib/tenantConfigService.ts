import { supabase } from './supabaseClient';
import type { TenantConfig, TaxSystem } from '../types/tenantConfig';
import { DEFAULT_TENANT_CONFIG } from '../types/tenantConfig';
import { logger } from './logger';

const configCache = new Map<string, { config: TenantConfig; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchTenantConfig(tenantId: string): Promise<TenantConfig> {
  const { data, error } = await supabase
    .from('tenants')
    .select(`
      id, name,
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
    .maybeSingle();

  if (error || !data) {
    logger.error('Failed to fetch tenant config:', error);
    return { ...DEFAULT_TENANT_CONFIG, tenantId };
  }

  const country = data.country as Record<string, unknown> | null;

  return {
    tenantId: data.id,
    tenantName: data.name,
    countryCode: (country?.code as string) || 'US',
    countryName: (country?.name as string) || 'United States',
    currency: {
      code: data.currency_code || 'USD',
      symbol: data.currency_symbol || '$',
      name: (country?.currency_name as string) || data.currency_code || 'USD',
      decimalPlaces: data.decimal_places ?? 2,
      decimalSeparator: (country?.decimal_separator as string) || '.',
      thousandsSeparator: (country?.thousands_separator as string) || ',',
      position: ((country?.currency_position as string) || 'before') as 'before' | 'after',
    },
    tax: {
      system: (data.tax_system || 'NONE') as TaxSystem,
      label: data.tax_label || 'Tax',
      numberLabel: data.tax_number_label || 'Tax ID',
      numberFormat: (country?.tax_number_format as string) || null,
      numberPlaceholder: (country?.tax_number_placeholder as string) || null,
      defaultRate: parseFloat(String(data.default_tax_rate)) || 0,
      invoiceRequired: (country?.tax_invoice_required as boolean) || false,
    },
    dateTime: {
      dateFormat: data.date_format || 'MM/DD/YYYY',
      timeFormat: ((country?.time_format as string) || '12h') as '12h' | '24h',
      timezone: data.timezone || 'UTC',
      weekStartsOn: ((country?.week_starts_on as number) ?? 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      fiscalYearStart: data.fiscal_year_start || '01-01',
    },
    locale: {
      localeCode: data.locale_code || 'en-US',
      languageCode: (country?.language_code as string) || 'en',
      postalCodeLabel: (country?.postal_code_label as string) || 'Postal Code',
    },
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

export function invalidateTenantConfigCache(tenantId: string): void {
  configCache.delete(tenantId);
}

export function clearTenantConfigCache(): void {
  configCache.clear();
}
