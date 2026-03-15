import React from 'react';
import { Lock, User, Headphones } from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { formatDistanceToNow } from 'date-fns';
import type { Database } from '../../../types/database.types';

type SupportTicketMessage = Database['public']['Tables']['support_ticket_messages']['Row'];

interface TicketMessageProps {
  message: SupportTicketMessage & {
    sender_name?: string;
  };
}

export const TicketMessage: React.FC<TicketMessageProps> = ({ message }) => {
  const isInternal = message.is_internal_note;
  const isSupport = message.sender_type === 'support';

  const bgColor = isInternal
    ? 'bg-amber-50 border-amber-200'
    : isSupport
    ? 'bg-blue-50 border-blue-200'
    : 'bg-slate-50 border-slate-200';

  const Icon = isSupport ? Headphones : User;

  return (
    <div className={`border rounded-lg p-4 ${bgColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isSupport ? 'bg-blue-100' : 'bg-slate-200'
          }`}>
            <Icon className={`w-4 h-4 ${isSupport ? 'text-blue-600' : 'text-slate-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-900">
                {message.sender_name || (isSupport ? 'Support' : 'Customer')}
              </p>
              <Badge variant={isSupport ? 'info' : 'default'} className="text-xs">
                {isSupport ? 'Support' : 'Customer'}
              </Badge>
              {isInternal && (
                <Badge variant="warning" className="text-xs">
                  <Lock className="w-3 h-3 mr-1" />
                  Internal
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {formatDistanceToNow(new Date(message.created_at))} ago
            </p>
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-700 whitespace-pre-wrap ml-10">
        {message.message}
      </p>
    </div>
  );
};
