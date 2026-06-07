import { supabase } from './supabaseClient';
import { logger } from './logger';

/**
 * Persist a tenant's feature-flag overrides to tenants.feature_flags.
 * Stores only the overrides map (registry holds the defaults). Mirrors
 * tenantThemeService.updateTenantTheme.
 */
export async function updateTenantFeatureFlags(
  tenantId: string,
  flags: Record<string, boolean>,
): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .update({ feature_flags: flags })
    .eq('id', tenantId);

  if (error) {
    logger.error('Failed to update tenant feature flags:', error);
    throw error instanceof Error ? error : new Error('Failed to update feature flags');
  }
}
