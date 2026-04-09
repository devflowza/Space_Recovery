import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePortalAuth } from '../../contexts/PortalAuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { MessageSquare, Mail, Phone, Calendar as CalendarIcon } from 'lucide-react';
import { formatDate } from '../../lib/format';

interface Communication {
  id: string;
  communication_type: string;
  subject: string | null;
  content: string | null;
  direction: string | null;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
}

export const PortalCommunications: React.FC = () => {
  const { customer } = usePortalAuth();

  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['portal_communications', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];

      const { data, error } = await supabase
        .from('customer_communications')
        .select(`
          *,
          profiles(full_name)
        `)
        .eq('customer_id', customer.id)
        .eq('portal_visible', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Communication[];
    },
    enabled: !!customer?.id,
  });

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'phone':
        return <Phone className="w-5 h-5" />;
      case 'meeting':
        return <CalendarIcon className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getCommunicationColor = (type: string) => {
    switch (type) {
      case 'email':
        return '#3b82f6';
      case 'phone':
        return '#10b981';
      case 'meeting':
        return '#8b5cf6';
      case 'sms':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-cyan-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4">Loading communications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Communications</h1>
        <p className="text-slate-600">
          View messages and updates regarding your cases
        </p>
      </div>

      {communications.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-lg text-slate-600 mb-2">No communications yet</p>
          <p className="text-sm text-slate-500">
            Communications regarding your cases will appear here
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {communications.map((comm) => (
            <Card key={comm.id} className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: getCommunicationColor(comm.communication_type) }}
                >
                  {getCommunicationIcon(comm.communication_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge
                      variant="custom"
                      color={getCommunicationColor(comm.communication_type)}
                      size="sm"
                    >
                      {comm.communication_type}
                    </Badge>
                    {comm.direction && (
                      <Badge variant="default" size="sm">
                        {comm.direction}
                      </Badge>
                    )}
                    <span className="text-xs text-slate-500">
                      {formatDate(comm.created_at)}
                    </span>
                  </div>

                  {comm.subject && (
                    <h3 className="font-semibold text-slate-900 mb-2">{comm.subject}</h3>
                  )}

                  {comm.content && (
                    <p className="text-slate-700 whitespace-pre-wrap mb-3">{comm.content}</p>
                  )}

                  {comm.profiles && (
                    <p className="text-xs text-slate-500">
                      From: {comm.profiles.full_name}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
