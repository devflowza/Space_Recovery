import type { Database } from './database.types';

export type AccountingLocale = Database['public']['Tables']['accounting_locales']['Row'];

export type AccountingLocaleInsert = Database['public']['Tables']['accounting_locales']['Insert'];

export interface AccountingLocaleFormData {
  locale_code: string;
  name: string;
  currency_code: string;
  date_format: string;
  number_format: string;
  is_default: boolean;
}
