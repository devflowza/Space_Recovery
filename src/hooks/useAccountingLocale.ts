import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useTenantConfig, useCurrencyConfig, useTaxConfig } from '../contexts/TenantConfigContext';
import type { AccountingLocale } from '../types/accountingLocale';

export const useAccountingLocale = (_localeId?: string | null) => {
  const { config, isLoading } = useTenantConfig();
  const currency = useCurrencyConfig();
  const tax = useTaxConfig();

  const formatCurrencyValue = (amount: number) => {
    const formattedAmount = amount.toFixed(currency.decimalPlaces);
    if (currency.position === 'before') {
      return `${currency.symbol} ${formattedAmount}`;
    }
    return `${formattedAmount} ${currency.symbol}`;
  };

  const calculateTax = (amount: number) => {
    return amount * (tax.defaultRate / 100);
  };

  const getTaxLabel = () => tax.label || 'Tax';
  const getTaxRate = () => tax.defaultRate / 100;
  const getTaxRatePercentage = () => tax.defaultRate.toFixed(2);
  const getCurrencySymbol = () => currency.symbol;
  const getCurrencyCode = () => currency.code;
  const getDateFormat = () => config.dateTime.dateFormat || 'YYYY-MM-DD';

  return {
    locale: null as AccountingLocale | null,
    isLoading,
    error: null,
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
        .is('deleted_at', null)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as AccountingLocale[];
    },
    staleTime: 300000,
  });
};
