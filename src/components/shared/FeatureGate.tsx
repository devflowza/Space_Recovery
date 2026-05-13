import React, { useEffect, useState } from 'react';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeatureKey, checkFeatureAccess, FeatureAccess } from '../../lib/featureGateService';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  inline?: boolean;
  className?: string;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  inline = false,
  className,
}: FeatureGateProps) {
  const [access, setAccess] = useState<FeatureAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    checkFeatureAccess(feature)
      .then((result) => {
        if (mounted) {
          setAccess(result);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setAccess({ allowed: false, requiredPlan: 'professional' });
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [feature]);

  if (isLoading) {
    return null;
  }

  if (access?.allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  if (inline) {
    return (
      <button
        onClick={() => navigate('/settings/plans')}
        className={cn(
          'inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium',
          className
        )}
      >
        <Lock className="w-3.5 h-3.5" />
        <span>Upgrade to unlock</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-info-muted to-accent/10 border border-info/30 rounded-xl p-8 text-center',
        className
      )}
    >
      <div className="inline-flex items-center justify-center w-14 h-14 bg-info-muted rounded-full mb-4">
        <Lock className="w-7 h-7 text-primary" />
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Upgrade to Unlock This Feature
      </h3>

      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        This feature is available on the{' '}
        <span className="font-medium capitalize">{access?.requiredPlan}</span> plan and above.
        Upgrade to access advanced capabilities.
      </p>

      <Button onClick={() => navigate('/settings/plans')} className="gap-2">
        <Sparkles className="w-4 h-4" />
        View Plans
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
