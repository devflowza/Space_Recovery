import { useCurrencyConfig } from '../contexts/TenantConfigContext';
import { formatCurrencyWithConfig } from '../lib/format';
import type { CurrencyFormat } from '../lib/format';

export const useCurrency = () => {
  const currencyConfig = useCurrencyConfig();

  const currencyFormat: CurrencyFormat = {
    currencySymbol: currencyConfig.symbol,
    currencyPosition: currencyConfig.position,
    decimalPlaces: currencyConfig.decimalPlaces,
    currencyCode: currencyConfig.code,
  };

  const formatCurrency = (amount: number): string => {
    return formatCurrencyWithConfig(amount, currencyConfig);
  };

  return {
    currencyFormat,
    formatCurrency,
    loading: false,
  };
};
