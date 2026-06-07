import { supabase } from './supabaseClient';
import { logger } from './logger';

/**
 * Persist a tenant's feature-flag overrides to tenants.feature_flags.
 * Stores only the overrides map (registry holds the defaults). Mirrors
 * tenantThemeService.updateTenantTheme.
 *
 * NOTE: cast until the tenants.feature_flags migration + `npm run db:types` land;
 * before then this write fails at runtime (column missing) — see the plan's
 * "build code now, migrate later" sequencing.
 */
export async function updateTenantFeatureFlags(
  tenantId: string,
  flags: Record<string, boolean>,
): Promise<void> {
  const { error } = await (supabase.from('tenants') as unknown as {
    update: (v: Record<string, unknown>) => {
      eq: (k: string, val: string) => Promise<{ error: unknown }>;
    };
  }).update({ feature_flags: flags }).eq('id', tenantId);

  if (error) {
    logger.error('Failed to update tenant feature flags:', error);
    throw error instanceof Error ? error : new Error('Failed to update feature flags');
  }
}
