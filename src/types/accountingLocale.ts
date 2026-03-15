export interface AccountingLocale {
  id: string;
  country_name: string;
  country_code: string;
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
  currency_position: 'before' | 'after';
  decimal_places: number;
  tax_name: string;
  tax_rate: number;
  tax_number_label: string | null;
  exchange_rate_to_usd: number;
  date_format: string;
  is_active: boolean;
  is_default: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountingLocaleFormData {
  country_name: string;
  country_code: string;
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
  currency_position: 'before' | 'after';
  decimal_places: number;
  tax_name: string;
  tax_rate: number;
  tax_number_label: string;
  exchange_rate_to_usd: number;
  date_format: string;
  is_active: boolean;
  is_default: boolean;
  notes: string;
}
