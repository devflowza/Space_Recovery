import React from 'react';
import { CheckCircle2, CircleSlash, MinusCircle, XCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { BadgeVariant } from '../../lib/ui/variants';

/**
 * Case recovery outcome, surfaced alongside the pipeline status. Outcome is
 * DATA (cases.recovery_outcome: full | partial | unrecoverable | declined),
 * deliberately separate from the lifecycle status — this badge is how "Partial
 * recovery" reads at a glance without re-introducing outcome-into-status.
 */
type Outcome = 'full' | 'partial' | 'unrecoverable' | 'declined';

const OUTCOME_META: Record<
  Outcome,
  { label: string; variant: BadgeVariant; Icon: React.ComponentType<{ className?: string }> }
> = {
  full: { label: 'Full recovery', variant: 'success', Icon: CheckCircle2 },
  partial: { label: 'Partial recovery', variant: 'warning', Icon: MinusCircle },
  unrecoverable: { label: 'Unrecoverable', variant: 'danger', Icon: XCircle },
  declined: { label: 'Customer declined', variant: 'secondary', Icon: CircleSlash },
};

interface OutcomeBadgeProps {
  outcome: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const OutcomeBadge: React.FC<OutcomeBadgeProps> = ({ outcome, size = 'sm', className }) => {
  if (!outcome) return null;
  const meta = OUTCOME_META[outcome as Outcome];
  if (!meta) return null;
  const { label, variant, Icon } = meta;
  return (
    <Badge variant={variant} size={size} className={className}>
      <Icon className="w-3.5 h-3.5 mr-1 shrink-0" aria-hidden="true" />
      {label}
    </Badge>
  );
};
