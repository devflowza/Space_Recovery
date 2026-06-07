// Pure resolution of a feature's effective on/off state from the code-defined
// registry + the tenant's stored overrides. Kept dependency-free (registry is
// injected) so it is unit-testable in isolation. The app-facing binding to the
// real registry lives in registry.ts (`isFeatureEnabled`).

export interface ResolvableFeature {
  key: string;
  defaultEnabled: boolean;
  /** Core features are always on and never user-toggleable. */
  core?: boolean;
  /** Effective state is off if any dependency resolves off. */
  dependsOn?: string[];
}

/**
 * Resolve whether `key` is enabled.
 * - Unknown key → `true` (feature flags gate visibility, not security; an
 *   unrecognised key must never hide a surface).
 * - Core → always `true`.
 * - Otherwise: every dependency must resolve enabled, then `override ?? default`.
 */
export function resolveFeatureEnabled(
  registry: Record<string, ResolvableFeature>,
  flags: Record<string, boolean> | null | undefined,
  key: string,
): boolean {
  const def = registry[key];
  if (!def) return true;
  if (def.core) return true;

  if (def.dependsOn) {
    for (const dep of def.dependsOn) {
      if (!resolveFeatureEnabled(registry, flags, dep)) return false;
    }
  }

  const override = flags?.[key];
  return override ?? def.defaultEnabled;
}
