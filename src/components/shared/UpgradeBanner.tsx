import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface UpgradeBannerProps {
  title?: string;
  description?: string;
  targetPlan?: string;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

export function UpgradeBanner({
  title = 'Unlock More Features',
  description = 'Upgrade your plan to access advanced capabilities and grow your business.',
  targetPlan,
  onDismiss,
  className,
  compact = false,
}: UpgradeBannerProps) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-4 bg-gradient-to-r from-primary to-accent text-white rounded-lg px-4 py-3',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/settings/plans')}
            className="inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 px-3 py-1.5 text-sm bg-white text-primary hover:bg-info-muted"
          >
            Upgrade
          </button>
          {onDismiss && (
            <button onClick={onDismiss} className="p-1 hover:bg-white/20 rounded">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative bg-gradient-to-br from-primary via-accent to-primary text-white rounded-xl p-6 overflow-hidden',
        className
      )}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-lg font-semibold">{title}</h3>
            </div>
            <p className="text-white/80 text-sm max-w-md mb-4">{description}</p>
            <button
              onClick={() => navigate('/settings/plans')}
              className="inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 px-4 py-2 text-base bg-white text-primary hover:bg-info-muted"
            >
              {targetPlan ? `Upgrade to ${targetPlan}` : 'View Plans'}
            </button>
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
