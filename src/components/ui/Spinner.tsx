import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const SIZE: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  const { t } = useTranslation();
  const text = label ?? t('common.loading');
  return (
    <span role="status" aria-label={text} className={cn('inline-flex items-center', className)}>
      <Loader2 className={cn('motion-safe:animate-spin text-current', SIZE[size])} aria-hidden="true" />
      <span className="sr-only">{text}</span>
    </span>
  );
}
