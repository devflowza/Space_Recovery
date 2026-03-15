import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../../contexts/PortalAuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { FileText, DollarSign, MessageSquare, Clock } from 'lucide-react';
import { formatDate } from '../../lib/format';

export const PortalDashboard: React.FC = () => {
  const { customer } = usePortalAuth();
  const navigate = useNavigate();

  const { data: casePriorities = [] } = useQuery({
    queryKey: ['case_priorities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_priorities')
        .select('name, color')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: casesStats } = useQuery({
    queryKey: ['portal_cases_stats', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;

      const { data, error } = await supabase
        .from('cases')
        .select('id, status')
        .eq('customer_id', customer.id)
        .eq('portal_visible', true);

      if (error) throw error;

      const total = data.length;
      const active = data.filter((c) =>
        ['received', 'diagnosis', 'in-progress', 'waiting-approval'].includes(c.status)
      ).length;
      const completed = data.filter((c) => ['completed', 'delivered'].includes(c.status)).length;

      return { total, active, completed };
    },
    enabled: !!customer?.id,
  });

  const { data: recentCases = [] } = useQuery({
    queryKey: ['portal_recent_cases', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];

      const { data, error } = await supabase
        .from('cases')
        .select('id, case_no, title, status, priority, created_at')
        .eq('customer_id', customer.id)
        .eq('portal_visible', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const { data: pendingQuotes = [] } = useQuery({
    queryKey: ['portal_pending_quotes', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];

      const { data, error } = await supabase
        .from('case_quotes')
        .select(`
          id,
          quote_number,
          title,
          total_amount,
          currency,
          status,
          valid_until,
          cases!inner(customer_id)
        `)
        .eq('cases.customer_id', customer.id)
        .eq('status', 'pending_approval')
        .eq('portal_visible', true);

      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
      case 'diagnosis':
        return '#3b82f6';
      case 'in-progress':
        return '#f59e0b';
      case 'waiting-approval':
        return '#8b5cf6';
      case 'ready':
        return '#06b6d4';
      case 'completed':
      case 'delivered':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getPriorityColor = (priority: string) => {
    const priorityItem = casePriorities.find(
      p => p.name.toLowerCase() === priority.toLowerCase()
    );
    return priorityItem?.color || '#64748b';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Welcome back, {customer?.customer_name}!
        </h1>
        <p className="text-slate-600">
          Track your data recovery cases and manage quotes from your dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Cases</p>
              <p className="text-3xl font-bold text-slate-900">{casesStats?.total || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Active Cases</p>
              <p className="text-3xl font-bold text-slate-900">{casesStats?.active || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Pending Quotes</p>
              <p className="text-3xl font-bold text-slate-900">{pendingQuotes.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {pendingQuotes.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Quotes Awaiting Your Response</h2>
            <Badge variant="custom" color="#f59e0b">
              {pendingQuotes.length} Pending
            </Badge>
          </div>
          <div className="space-y-3">
            {pendingQuotes.map((quote) => (
              <div
                key={quote.id}
                onClick={() => navigate('/portal/quotes')}
                className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg cursor-pointer hover:border-amber-300 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">{quote.title}</p>
                    <p className="text-sm text-slate-600">{quote.quote_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">
                      {quote.currency} {quote.total_amount.toLocaleString()}
                    </p>
                    {quote.valid_until && (
                      <p className="text-xs text-slate-500">
                        Valid until {formatDate(quote.valid_until)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-800">Response required</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Cases</h2>
          {recentCases.length > 0 && (
            <button
              onClick={() => navigate('/portal/cases')}
              className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              View All
            </button>
          )}
        </div>

        {recentCases.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No cases found</p>
            <p className="text-sm text-slate-500 mt-2">
              Your data recovery cases will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentCases.map((caseItem) => (
              <div
                key={caseItem.id}
                onClick={() => navigate('/portal/cases')}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-cyan-300 cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900">{caseItem.title}</p>
                      <Badge variant="custom" color={getPriorityColor(caseItem.priority)} size="sm">
                        {caseItem.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{caseItem.case_no}</p>
                  </div>
                  <Badge variant="custom" color={getStatusColor(caseItem.status)}>
                    {caseItem.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">Created {formatDate(caseItem.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
