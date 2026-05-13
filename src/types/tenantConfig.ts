export type TaxSystem = 'VAT' | 'GST' | 'SALES_TAX' | 'NONE';

export type Theme = 'royal' | 'burgundy' | 'scarlet';
export const THEMES: readonly Theme[] = ['royal', 'burgundy', 'scarlet'] as const;
export const DEFAULT_THEME: Theme = 'royal';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
  decimalSeparator: string;
  thousandsSeparator: string;
  position: 'before' | 'after';
}

export interface TaxConfig {
  system: TaxSystem;
  label: string;
  numberLabel: string;
  numberFormat: string | null;
  numberPlaceholder: string | null;
  defaultRate: number;
  invoiceRequired: boolean;
}

export interface DateTimeConfig {
  dateFormat: string;
  timeFormat: '12h' | '24h';
  timezone: string;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  fiscalYearStart: string;
}

export interface LocaleConfig {
  localeCode: string;
  languageCode: string;
  postalCodeLabel: string;
}

export interface TenantConfig {
  tenantId: string;
  tenantName: string;
  countryCode: string;
  countryName: string;
  currency: CurrencyConfig;
  tax: TaxConfig;
  dateTime: DateTimeConfig;
  locale: LocaleConfig;
  theme: Theme;
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  tenantId: '',
  tenantName: '',
  countryCode: 'US',
  countryName: 'United States',
  currency: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    position: 'before',
  },
  tax: {
    system: 'SALES_TAX',
    label: 'Sales Tax',
    numberLabel: 'Tax ID',
    numberFormat: null,
    numberPlaceholder: null,
    defaultRate: 0,
    invoiceRequired: false,
  },
  dateTime: {
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    timezone: 'UTC',
    weekStartsOn: 0,
    fiscalYearStart: '01-01',
  },
  locale: {
    localeCode: 'en-US',
    languageCode: 'en',
    postalCodeLabel: 'Postal Code',
  },
  theme: DEFAULT_THEME,
};
