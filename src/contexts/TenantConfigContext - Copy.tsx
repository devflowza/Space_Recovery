import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { TenantConfig, CurrencyConfig, TaxConfig, DateTimeConfig, LocaleConfig } from '../types/tenantConfig';
import { DEFAULT_TENANT_CONFIG } from '../types/tenantConfig';
import { getTenantConfig, invalidateTenantConfigCache } from '../lib/tenantConfigService';
import { useAuth } from './AuthContext';
import { logger } from '../lib/logger';

interface TenantConfigContextType {
  config: TenantConfig;
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
}

const TenantConfigContext = createContext<TenantConfigContextType>({
  config: DEFAULT_TENANT_CONFIG,
  isLoading: true,
  refreshConfig: async () => {},
});

export function TenantConfigProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [config, setConfig] = useState<TenantConfig>(DEFAULT_TENANT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    if (!tenantId) {
      setConfig(DEFAULT_TENANT_CONFIG);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const tenantConfig = await getTenantConfig(tenantId);
      setConfig(tenantConfig);
    } catch (err) {
      logger.error('Failed to load tenant config:', err);
      setConfig(DEFAULT_TENANT_CONFIG);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const refreshConfig = useCallback(async () => {
    if (tenantId) {
      invalidateTenantConfigCache(tenantId);
    }
    await loadConfig();
  }, [tenantId, loadConfig]);

  const value = useMemo(() => ({
    config,
    isLoading,
    refreshConfig,
  }), [config, isLoading, refreshConfig]);

  return (
    <TenantConfigContext.Provider value={value}>
      {children}
    </TenantConfigContext.Provider>
  );
}

export function useTenantConfig(): TenantConfigContextType {
  return useContext(TenantConfigContext);
}

export function useCurrencyConfig(): CurrencyConfig {
  const { config } = useTenantConfig();
  return config.currency;
}

export function useTaxConfig(): TaxConfig {
  const { config } = useTenantConfig();
  return config.tax;
}

export function useDateTimeConfig(): DateTimeConfig {
  const { config } = useTenantConfig();
  return config.dateTime;
}

export function useLocaleConfig(): LocaleConfig {
  const { config } = useTenantConfig();
  return config.locale;
}
