import { supabase } from './supabaseClient';
import type { Theme } from '../types/tenantConfig';
import { THEMES } from '../types/tenantConfig';
import { logger } from './logger';

export async function updateTenantTheme(tenantId: string, theme: Theme): Promise<void> {
  if (!THEMES.includes(theme)) {
    throw new Error(`Invalid theme: ${theme}`);
  }

  const { error } = await supabase
    .from('tenants')
    .update({ theme })
    .eq('id', tenantId);

  if (error) {
    logger.error('Failed to update tenant theme:', error);
    throw error;
  }
}
