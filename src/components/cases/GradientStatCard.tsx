import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Trend } from '../../lib/casePeriods';

/**
 * Tones are the gradient face of the tile. Every value is a SEMANTIC TOKEN
 * (primary/info/danger/warning/success) or the fixed cat-* identity palette —
 * never a raw brand color or hex — so the tiles re-theme per tenant and stay
 * clear of the purple/indigo ban + the no-raw-style-colors rule.
 */
export type GradientTone = 'primary' | 'info' | 'danger' | 'warning' | 'success' | 'cat-2';

const TONE_GRADIENT: Record<GradientTone, string> = {
  primary: 'from-primary to-primary/85',
  info: 'from-info to-info/85',
  danger: 'from-danger to-danger/85',
  warning: 'from-warning to-warning/85',
  success: 'from-success to-success/85',
  'cat-2': 'from-cat-2 to-cat-2/85',
};

const TREND_ICON: Record<Trend['direction'], LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

interface GradientStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: GradientTone;
  /** Period-over-period trend (flow metrics) → inline pill. */
  trend?: Trend;
  /** Denominator for snapshot metrics → "/N" + a share-of-total bar. */
  denom?: number;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Compact gradient KPI tile (~76px) for the Cases stat ribbon. A single tight
 * stack: label + icon, a big tabular value with either an inline trend pill
 * (flow metrics) or a "/total" denominator (snapshot metrics), and a thin
 * share-of-total bar that doubles as a baseline so every tile is the same
 * height. Built to pack six metrics into roughly half the old height.
 */
export const GradientStatCard: React.FC<GradientStatCardProps> = ({
  label,
  value,
  icon: Icon,
  tone,
  trend,
  denom,
  loading = false,
  onClick,
  className,
}) => {
  const interactive = Boolean(onClick);
  const TrendIcon = trend ? TREND_ICON[trend.direction] : null;
  const pct =
    denom && denom > 0 && typeof value === 'number'
      ? Math.max(0, Math.min(100, Math.round((value / denom) * 100)))
      : null;

  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'relative overflow-hidden rounded-xl p-3 text-white shadow-md ring-1 ring-inset ring-white/10',
        'bg-gradient-to-br',
        TONE_GRADIENT[tone],
        interactive &&
          'cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -top-6 -right-5 h-16 w-16 rounded-full bg-white/15 blur-xl"
        aria-hidden="true"
      />

      <div className="relative flex items-center justify-between gap-2">
        <p className="truncate text-xxs font-semibold uppercase tracking-wider text-white/90">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-white/80" aria-hidden="true" />
      </div>

      <div className="relative mt-1.5 flex items-end justify-between gap-2">
        {loading ? (
          <span className="h-7 w-14 animate-pulse rounded bg-white/25" />
        ) : (
          <span className="flex items-baseline gap-1 leading-none">
            <span className="text-2xl font-bold tabular-nums">{value}</span>
            {denom != null && <span className="text-xxs font-medium text-white/60">/{denom}</span>}
          </span>
        )}
        {!loading && trend && (
          <span className="inline-flex items-center gap-0.5 rounded bg-white/15 px-1 py-0.5 text-xxs font-semibold">
            {TrendIcon && <TrendIcon className="h-3 w-3" aria-hidden="true" />}
            {trend.pct === null ? 'New' : `${trend.pct}%`}
          </span>
        )}
      </div>

      <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-white/20">
        {pct != null && !loading && (
          <div className="h-full rounded-full bg-white/75" style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  );
};
