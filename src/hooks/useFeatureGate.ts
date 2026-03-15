import { useState, useEffect, useCallback } from 'react';
import {
  FeatureKey,
  UsageLimitKey,
  hasFeature,
  checkUsageLimit,
  UsageLimit,
  clearPlanCache,
} from '../lib/featureGateService';

export function useFeature(featureKey: FeatureKey): {
  hasAccess: boolean;
  isLoading: boolean;
} {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    hasFeature(featureKey)
      .then((result) => {
        if (mounted) {
          setHasAccess(result);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setHasAccess(false);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [featureKey]);

  return { hasAccess, isLoading };
}

export function useFeatures(featureKeys: FeatureKey[]): {
  features: Record<FeatureKey, boolean>;
  isLoading: boolean;
} {
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    Promise.all(featureKeys.map((key) => hasFeature(key).then((result) => [key, result])))
      .then((results) => {
        if (mounted) {
          const featureMap: Record<string, boolean> = {};
          results.forEach(([key, value]) => {
            featureMap[key as string] = value as boolean;
          });
          setFeatures(featureMap);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [featureKeys.join(',')]);

  return { features: features as Record<FeatureKey, boolean>, isLoading };
}

export function useUsageLimit(limitKey: UsageLimitKey): {
  usage: UsageLimit | null;
  isLoading: boolean;
  refresh: () => void;
} {
  const [usage, setUsage] = useState<UsageLimit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsage = useCallback(() => {
    setIsLoading(true);
    checkUsageLimit(limitKey)
      .then(setUsage)
      .catch(() => setUsage(null))
      .finally(() => setIsLoading(false));
  }, [limitKey]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  return { usage, isLoading, refresh: loadUsage };
}

export function usePlanCacheRefresh(): () => void {
  return useCallback(() => {
    clearPlanCache();
  }, []);
}
