import React from 'react';
import { Badge } from '../../ui/Badge';

interface TicketStatusBadgeProps {
  status: string;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status }) => {
  const getVariant = () => {
    switch (status) {
      case 'open': return 'info';
      case 'in_progress': return 'warning';
      case 'waiting_customer': return 'default';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  return (
    <Badge variant={getVariant()}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  );
};
