import { format as dateFnsFormat, parseISO } from 'date-fns';
import { supabase } from './supabaseClient';

export interface CurrencyFormat {
  currencySymbol: string;
  currencyPosition: 'before' | 'after';
  decimalPlaces: number;
  currencyCode: string;
}

let cachedCurrencyFormat: CurrencyFormat | null = null;

export const fetchCurrencyFormat = async (): Promise<CurrencyFormat> => {
  if (cachedCurrencyFormat) {
    return cachedCurrencyFormat;
  }

  try {
    const { data, error } = await supabase
      .from('accounting_locales')
      .select('currency_symbol, currency_position, decimal_places, currency_code')
      .eq('is_default', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching currency format:', error);
      return {
        currencySymbol: 'OMR',
        currencyPosition: 'after',
        decimalPlaces: 3,
        currencyCode: 'OMR',
      };
    }

    if (data) {
      cachedCurrencyFormat = {
        currencySymbol: data.currency_symbol || 'OMR',
        currencyPosition: data.currency_position || 'after',
        decimalPlaces: data.decimal_places || 3,
        currencyCode: data.currency_code || 'OMR',
      };
      return cachedCurrencyFormat;
    }

    return {
      currencySymbol: 'OMR',
      currencyPosition: 'after',
      decimalPlaces: 3,
      currencyCode: 'OMR',
    };
  } catch (error) {
    console.error('Error fetching currency format:', error);
    return {
      currencySymbol: 'OMR',
      currencyPosition: 'after',
      decimalPlaces: 3,
      currencyCode: 'OMR',
    };
  }
};

export const clearCurrencyFormatCache = () => {
  cachedCurrencyFormat = null;
};

export const formatCurrencyWithSettings = (
  amount: number,
  format: CurrencyFormat
): string => {
  const formattedNumber = amount.toFixed(format.decimalPlaces);
  const [integerPart, decimalPart] = formattedNumber.split('.');
  const formattedInteger = parseInt(integerPart).toLocaleString('en-US');
  const fullNumber = decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;

  if (format.currencyPosition === 'before') {
    return `${format.currencySymbol} ${fullNumber}`;
  } else {
    return `${fullNumber} ${format.currencySymbol}`;
  }
};

export const formatCurrency = (amount: number, currency = 'OMR'): string => {
  return new Intl.NumberFormat('en-OM', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
};

export const formatDate = (date: string | Date, formatStr = 'MMM dd, yyyy'): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return dateFnsFormat(dateObj, formatStr);
  } catch (error) {
    return '';
  }
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

export const formatNumber = (num: number, decimals = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatPercent = (value: number): string => {
  return `${formatNumber(value * 100, 2)}%`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const cleanBankFieldValue = (value: string | null | undefined): string => {
  if (!value) return '';

  const trimmedValue = value.trim();

  const prefixes = [
    'IBAN:',
    'SWIFT:',
    'SWIFT Code:',
    'Account No:',
    'Account Number:',
    'Bank:',
    'Branch:',
    'Routing:',
  ];

  for (const prefix of prefixes) {
    if (trimmedValue.startsWith(prefix)) {
      return trimmedValue.substring(prefix.length).trim();
    }
  }

  return trimmedValue;
};
