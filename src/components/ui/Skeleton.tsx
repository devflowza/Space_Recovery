import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={cn('motion-safe:animate-pulse rounded bg-surface-muted', className)} />;
}
