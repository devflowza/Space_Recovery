import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Theme } from '../types/tenantConfig';
import { DEFAULT_THEME, THEMES } from '../types/tenantConfig';
import { useTenantConfig } from './TenantConfigContext';
import { updateTenantTheme } from '../lib/tenantThemeService';
import { logger } from '../lib/logger';

const THEME_HINT_KEY = 'xsuite_theme_hint';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  isUpdating: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  setTheme: async () => {},
  isUpdating: false,
});

function applyThemeToDOM(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

function persistThemeHint(theme: Theme): void {
  try {
    localStorage.setItem(THEME_HINT_KEY, theme);
  } catch {
    // Ignore quota / privacy-mode errors — the hint is just an anti-flash optimization.
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { config, refreshConfig } = useTenantConfig();
  const tenantTheme = config.theme;
  const tenantId = config.tenantId;

  const [optimisticTheme, setOptimisticTheme] = useState<Theme | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const effectiveTheme = optimisticTheme ?? tenantTheme;

  useEffect(() => {
    applyThemeToDOM(effectiveTheme);
    persistThemeHint(effectiveTheme);
  }, [effectiveTheme]);

  const setTheme = useCallback(async (next: Theme) => {
    if (!THEMES.includes(next)) {
      throw new Error(`Invalid theme: ${next}`);
    }
    if (!tenantId) {
      throw new Error('Cannot set theme: no active tenant');
    }
    if (next === effectiveTheme) return;

    setOptimisticTheme(next);
    setIsUpdating(true);
    try {
      await updateTenantTheme(tenantId, next);
      await refreshConfig();
      setOptimisticTheme(null);
    } catch (err) {
      logger.error('setTheme failed; reverting:', err);
      setOptimisticTheme(null);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [tenantId, effectiveTheme, refreshConfig]);

  const value = useMemo(() => ({
    theme: effectiveTheme,
    setTheme,
    isUpdating,
  }), [effectiveTheme, setTheme, isUpdating]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
