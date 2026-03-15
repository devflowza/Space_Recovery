import { useState, useEffect } from 'react';
import { fetchCurrencyFormat, formatCurrencyWithSettings, CurrencyFormat } from '../lib/format';

export const useCurrency = () => {
  const [currencyFormat, setCurrencyFormat] = useState<CurrencyFormat>({
    currencySymbol: 'OMR',
    currencyPosition: 'after',
    decimalPlaces: 3,
    currencyCode: 'OMR',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrencyFormat = async () => {
      try {
        const format = await fetchCurrencyFormat();
        setCurrencyFormat(format);
      } catch (error) {
        console.error('Error loading currency format:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCurrencyFormat();
  }, []);

  const formatCurrency = (amount: number): string => {
    return formatCurrencyWithSettings(amount, currencyFormat);
  };

  return {
    currencyFormat,
    formatCurrency,
    loading,
  };
};
