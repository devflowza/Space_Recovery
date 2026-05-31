/**
 * Shared status-tone -> semantic token-class maps. Replaces the success/warning/
 * danger/info color objects duplicated across Toast/Badge/ConfirmDialog/StatsCard.
 * `accent` has no -muted token, so it falls back to its solid pair.
 */
export const STATUS_TONE = {
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  danger: 'bg-danger text-danger-foreground',
  info: 'bg-info text-info-foreground',
  accent: 'bg-accent text-accent-foreground',
} as const;

export const STATUS_TONE_MUTED = {
  success: 'bg-success-muted text-success',
  warning: 'bg-warning-muted text-warning',
  danger: 'bg-danger-muted text-danger',
  info: 'bg-info-muted text-info',
  accent: 'bg-accent text-accent-foreground',
} as const;

export type StatusTone = keyof typeof STATUS_TONE;
