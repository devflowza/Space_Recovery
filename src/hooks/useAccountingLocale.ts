import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { AccountingLocale } from '../types/accountingLocale';

export const useAccountingLocale = (localeId?: string | null) => {
  const { data: locale, isLoading, error } = useQuery({
    queryKey: ['accounting_locale', localeId],
    queryFn: async () => {
      if (localeId) {
        const { data, error } = await supabase
          .from('accounting_locales')
          .select('*')
          .eq('id', localeId)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;
        return data as AccountingLocale | null;
      } else {
        const { data, error } = await supabase
          .from('accounting_locales')
          .select('*')
          .eq('is_default', true)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;
        return data as AccountingLocale | null;
      }
    },
    staleTime: 300000,
  });

  const formatCurrencyValue = (amount: number, customLocale?: AccountingLocale) => {
    const activeLocale = customLocale || locale;
    if (!activeLocale) return amount.toFixed(2);

    const formattedAmount = amount.toFixed(activeLocale.decimal_places);

    if (activeLocale.currency_position === 'before') {
      return `${activeLocale.currency_symbol} ${formattedAmount}`;
    } else {
      return `${formattedAmount} ${activeLocale.currency_symbol}`;
    }
  };

  const calculateTax = (amount: number, customLocale?: AccountingLocale) => {
    const activeLocale = customLocale || locale;
    if (!activeLocale) return 0;

    return amount * activeLocale.tax_rate;
  };

  const getTaxLabel = (customLocale?: AccountingLocale) => {
    const activeLocale = customLocale || locale;
    return activeLocale?.tax_name || 'Tax';
  };

  const getTaxRate = (customLocale?: AccountingLocale) => {
    const activeLocale = customLocale || locale;
    return activeLocale?.tax_rate || 0;
  };

  const getTaxRatePercentage = (customLocale?: AccountingLocale) => {
    const activeLocale = customLocale || locale;
    const rate = activeLocale?.tax_rate || 0;
    return (rate * 100).toFixed(2);
  };

  const getCurrencySymbol = (customLocale?: AccountingLocale) => {
    const activeLocale = customLocale || locale;
    return activeLocale?.currency_symbol || 'OMR';
  };

  const getCurrencyCode = (customLocale?: AccountingLocale) => {
    const activeLocale = customLocale || locale;
    return activeLocale?.currency_code || 'OMR';
  };

  const getDateFormat = (customLocale?: AccountingLocale) => {
    const activeLocale = customLocale || locale;
    return activeLocale?.date_format || 'YYYY-MM-DD';
  };

  return {
    locale,
    isLoading,
    error,
    formatCurrencyValue,
    calculateTax,
    getTaxLabel,
    getTaxRate,
    getTaxRatePercentage,
    getCurrencySymbol,
    getCurrencyCode,
    getDateFormat,
  };
};

export const useAccountingLocales = () => {
  return useQuery({
    queryKey: ['accounting_locales_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_locales')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('country_name', { ascending: true });

      if (error) throw error;
      return data as AccountingLocale[];
    },
    staleTime: 300000,
  });
};
