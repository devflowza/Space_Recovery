import type { Database } from './database.types';

export type AccountingLocale = Database['public']['Tables']['accounting_locales']['Row'];

export type AccountingLocaleInsert = Database['public']['Tables']['accounting_locales']['Insert'];

export interface AccountingLocaleFormData {
  name: string;
  locale_code: string;
  currency_code: string;
  currency_symbol: string;
  decimal_places: number;
  currency_position: 'before' | 'after';
  decimal_separator: string;
  thousands_separator: string;
  date_format: string;
  number_format: string;
  is_default: boolean;
}
