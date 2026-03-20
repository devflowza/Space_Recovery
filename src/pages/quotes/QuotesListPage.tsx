import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchQuotes, getQuoteStats } from '../../lib/quotesService';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { FinancialModuleHeader } from '../../components/financial/FinancialModuleHeader';
import { FinancialStatsCard } from '../../components/financial/FinancialStatsCard';
import { QuoteFormModal } from '../../components/cases/QuoteFormModal';
import { useCurrency } from '../../hooks/useCurrency';
import { supabase } from '../../lib/supabaseClient';
import { EmptyState } from '../../components/shared/EmptyState';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  User,
  Building2,
  Calendar,
  Eye,
  Edit,
  Send,
  Copy,
  Trash2,
} from 'lucide-react';
import { formatDate } from '../../lib/format';
import { logger } from '../../lib/logger';

export const QuotesListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<any>(null);
  const [sendingQuoteId, setSendingQuoteId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['quote_stats'],
    queryFn: getQuoteStats,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const { data: quotes = [], isLoading, error: quotesError } = useQuery({
    queryKey: ['quotes', statusFilter, debouncedSearch],
    queryFn: () =>
      fetchQuotes({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: debouncedSearch || undefined,
      }),
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#94a3b8',
      sent: '#3b82f6',
      accepted: '#10b981',
      rejected: '#ef4444',
      expired: '#f59e0b',
      converted: '#8b5cf6',
    };
    return colors[status] || '#64748b';
  };

  const getClientName = (quote: { customers?: { name?: string } | null; companies?: { company_name?: string } | null }) => {
    if (quote?.customers?.name) {
      return quote.customers.name;
    }
    if (quote?.companies?.company_name) {
      return quote.companies.company_name;
    }
    return 'N/A';
  };

  const { draftQuotes, sentQuotes, acceptedQuotes, rejectedQuotes, expiredQuotes, convertedQuotes } = useMemo(() => ({
    draftQuotes: quotes.filter((q) => q.status === 'draft'),
    sentQuotes: quotes.filter((q) => q.status === 'sent'),
    acceptedQuotes: quotes.filter((q) => q.status === 'accepted'),
    rejectedQuotes: quotes.filter((q) => q.status === 'rejected'),
    expiredQuotes: quotes.filter((q) => q.status === 'expired'),
    convertedQuotes: quotes.filter((q) => q.status === 'converted'),
  }), [quotes]);

  if (isLoading || statsLoading) {
    return (
      <div className="p-8 max-w-[1800px] mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4">Loading quotes...</p>
        </div>
      </div>
    );
  }

  if (quotesError) {
    return (
      <div className="p-8 max-w-[1800px] mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <div className="text-red-500 mb-4">
            <FileText className="w-12 h-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Error Loading Quotes</p>
            <p className="text-sm text-slate-600 mt-2">{(quotesError as Error)?.message || 'Failed to load quotes'}</p>
          </div>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <FinancialModuleHeader
            icon={<FileText className="w-7 h-7 text-white" />}
            title="Quotes"
            description="Manage customer quotations and proposals"
            iconBgColor="#3b82f6"
            statistics={[
              { label: 'Total Quotes', value: quotes.length, color: '#3b82f6' },
              { label: 'Paid', value: acceptedQuotes.length, color: '#10b981' },
              { label: 'Sent', value: sentQuotes.length, color: '#f59e0b' },
              { label: 'Overdue', value: expiredQuotes.length, color: '#ef4444' },
            ]}
            primaryAction={{
              label: 'Create Quote',
              onClick: () => setShowQuoteModal(true),
              icon: <Plus className="w-4 h-4" />,
            }}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate('/quotes/recycle-bin')}
          className="ml-4"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Recycle Bin
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <FinancialStatsCard
          label="Total Invoiced"
          value={formatCurrency(stats?.totalValue || 0)}
          icon={<FileText className="w-5 h-5 text-white" />}
          color="blue"
        />
        <FinancialStatsCard
          label="Paid"
          value={formatCurrency(stats?.acceptedValue || 0)}
          icon={<CheckCircle className="w-5 h-5 text-white" />}
          color="green"
        />
        <FinancialStatsCard
          label="Outstanding"
          value={formatCurrency(stats?.sentValue || 0)}
          icon={<Clock className="w-5 h-5 text-white" />}
          color="orange"
        />
        <FinancialStatsCard
          label="Total Count"
          value={quotes.length}
          icon={<FileText className="w-5 h-5 text-white" />}
          color="slate"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 mb-6">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="w-full lg:w-80 relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by quote number, title, or customer name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex-1 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStatusFilter(statusFilter === 'draft' ? 'all' : 'draft')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === 'draft'
                    ? 'bg-slate-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Draft
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === 'sent' ? 'all' : 'sent')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === 'sent'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sent
              </button>
              <button
                onClick={() =>
                  setStatusFilter(statusFilter === 'accepted' ? 'all' : 'accepted')
                }
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === 'accepted'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Accepted
              </button>
              <button
                onClick={() =>
                  setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')
                }
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === 'rejected'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Rejected
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === 'expired'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Expired
              </button>
              <button
                onClick={() =>
                  setStatusFilter(statusFilter === 'converted' ? 'all' : 'converted')
                }
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === 'converted'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Converted
              </button>
              {statusFilter !== 'all' && (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all"
                >
                  Clear All
                </button>
              )}
            </div>

            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <Filter className="w-4 h-4" />
              More Filters
              {statusFilter !== 'all' && (
                <span className="ml-1 w-2 h-2 rounded-full bg-blue-500"></span>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
                <option value="converted">Converted</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
          <EmptyState
            icon={FileText}
            title="No quotes found"
            description={
              searchTerm || statusFilter !== 'all'
                ? 'No quotes found matching your criteria.'
                : 'No quotes yet. Create your first quote to get started.'
            }
            action={{ label: 'Create Quote', onClick: () => setShowQuoteModal(true) }}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Quote #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Valid Until
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quotes.map((quote) => (
                  <tr
                    key={quote.id}
                    onClick={() => navigate(`/quotes/${quote.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-blue-600">
                        {quote.quote_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900 truncate max-w-xs">
                        {quote.title}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {quote.customers ? (
                          <User className="w-4 h-4 text-slate-400" />
                        ) : (
                          <Building2 className="w-4 h-4 text-slate-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {getClientName(quote)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-slate-600">
                        {formatDate(quote.created_at || '')}
                      </p>
                      {quote.created_by_profile && (
                        <p className="text-xs text-slate-500">
                          {quote.created_by_profile.full_name}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {quote.valid_until ? formatDate(quote.valid_until) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {formatCurrency(quote.total_amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="custom" color={getStatusColor(quote.status)} size="sm">
                        {quote.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => navigate(`/quotes/${quote.id}`)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {['draft', 'sent'].includes(quote.status) && (
                          <button
                            onClick={async () => {
                              const { data, error } = await supabase
                                .from('quotes')
                                .select(`
                                  *,
                                  quote_items (*)
                                `)
                                .eq('id', quote.id)
                                .single();

                              if (!error && data) {
                                setEditingQuote(data);
                                setShowQuoteModal(true);
                              }
                            }}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {quote.status === 'draft' && (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Send quote ${quote.quote_number} to ${getClientName(quote)}?`)) {
                                try {
                                  setSendingQuoteId(quote.id);
                                  const { error } = await supabase
                                    .from('quotes')
                                    .update({
                                      status: 'sent',
                                      sent_at: new Date().toISOString(),
                                    })
                                    .eq('id', quote.id);

                                  if (error) throw error;

                                  queryClient.invalidateQueries({ queryKey: ['quotes'] });
                                  queryClient.invalidateQueries({ queryKey: ['quote_stats'] });

                                  alert(`Quote ${quote.quote_number} has been sent successfully!`);
                                } catch (error) {
                                  logger.error('Error sending quote:', error);
                                  alert('Failed to send quote. Please try again.');
                                } finally {
                                  setSendingQuoteId(null);
                                }
                              }
                            }}
                            disabled={sendingQuoteId === quote.id}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Send Quote"
                          >
                            {sendingQuoteId === quote.id ? (
                              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showQuoteModal && (
        <QuoteFormModal
          isOpen={showQuoteModal}
          onClose={() => {
            setShowQuoteModal(false);
            setEditingQuote(null);
          }}
          onSave={async (quoteData: Record<string, unknown>, items: Array<{ description: string; quantity: number; unit_price: number; tax_rate?: number; discount_percent?: number; sort_order?: number }>) => {
            if (editingQuote) {
              const { error } = await supabase
                .from('quotes')
                .update({
                  title: quoteData.title,
                  status: quoteData.status,
                  valid_until: quoteData.valid_until,
                  client_reference: quoteData.client_reference,
                  tax_rate: quoteData.tax_rate,
                  discount_amount: quoteData.discount_amount,
                  discount_type: quoteData.discount_type,
                  terms_and_conditions: quoteData.terms_and_conditions,
                  bank_account_id: quoteData.bank_account_id,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', editingQuote.id);

              if (error) throw error;

              await supabase.from('quote_items').delete().eq('quote_id', editingQuote.id);

              const itemsToInsert = items.map((item) => ({
                quote_id: editingQuote.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                unit: item.unit,
              }));

              const { error: itemsError } = await supabase
                .from('quote_items')
                .insert(itemsToInsert);

              if (itemsError) throw itemsError;
            } else {
              const { data: nextNumber } = await supabase.rpc('get_next_number', {
                sequence_scope: 'quote',
              });

              const subtotal = items.reduce(
                (sum, item) => sum + item.quantity * item.unit_price,
                0
              );
              const taxAmount = (subtotal * quoteData.tax_rate) / 100;
              const discountValue =
                quoteData.discount_type === 'percentage'
                  ? (subtotal * quoteData.discount_amount) / 100
                  : quoteData.discount_amount;
              const total = subtotal + taxAmount - discountValue;

              const { data: quote, error } = await supabase
                .from('quotes')
                .insert({
                  quote_number: nextNumber,
                  case_id: quoteData.case_id,
                  customer_id: quoteData.customer_id,
                  company_id: quoteData.company_id,
                  title: quoteData.title,
                  status: quoteData.status,
                  valid_until: quoteData.valid_until,
                  client_reference: quoteData.client_reference,
                  subtotal_amount: subtotal,
                  tax_amount: taxAmount,
                  discount_amount: discountValue,
                  total_amount: total,
                  tax_rate: quoteData.tax_rate,
                  discount_type: quoteData.discount_type,
                  terms_and_conditions: quoteData.terms_and_conditions,
                  bank_account_id: quoteData.bank_account_id,
                })
                .select()
                .single();

              if (error) throw error;

              const itemsToInsert = items.map((item) => ({
                quote_id: quote.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                unit: item.unit,
              }));

              const { error: itemsError } = await supabase
                .from('quote_items')
                .insert(itemsToInsert);

              if (itemsError) throw itemsError;
            }

            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            queryClient.invalidateQueries({ queryKey: ['quote_stats'] });
          }}
          caseId={editingQuote?.case_id || ''}
          customerId={editingQuote?.customer_id}
          companyId={editingQuote?.company_id}
          initialData={editingQuote}
          clientReference={editingQuote?.client_reference}
        />
      )}
    </div>
  );
};

export default QuotesListPage;
