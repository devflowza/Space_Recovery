import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePortalAuth } from '../../contexts/PortalAuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DollarSign, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { formatDate } from '../../lib/format';

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  description: string | null;
  total_amount: number;
  currency: string;
  status: string;
  valid_until: string | null;
  customer_response: string | null;
  customer_responded_at: string | null;
  created_at: string;
  case_id: string;
  cases: {
    case_no: string;
    title: string;
  };
}

interface QuoteItem {
  id: string;
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export const PortalQuotes: React.FC = () => {
  const { customer } = usePortalAuth();
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [response, setResponse] = useState('');

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['portal_quotes', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];

      const { data, error } = await supabase
        .from('case_quotes')
        .select(`
          *,
          cases!inner(case_no, title, customer_id)
        `)
        .eq('cases.customer_id', customer.id)
        .eq('portal_visible', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Quote[];
    },
    enabled: !!customer?.id,
  });

  const { data: quoteItems = [] } = useQuery({
    queryKey: ['portal_quote_items', selectedQuote?.id],
    queryFn: async () => {
      if (!selectedQuote?.id) return [];

      const { data, error } = await supabase
        .from('case_quote_items')
        .select('*')
        .eq('quote_id', selectedQuote.id)
        .order('sort_order');

      if (error) throw error;
      return data as QuoteItem[];
    },
    enabled: !!selectedQuote?.id,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ quoteId, response }: { quoteId: string; response: string }) => {
      const { data, error } = await supabase.rpc('approve_quote', {
        p_quote_id: quoteId,
        p_customer_response: response || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal_quotes'] });
      setIsApproveModalOpen(false);
      setIsDetailModalOpen(false);
      setResponse('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ quoteId, response }: { quoteId: string; response: string }) => {
      const { data, error } = await supabase.rpc('reject_quote', {
        p_quote_id: quoteId,
        p_customer_response: response || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal_quotes'] });
      setIsRejectModalOpen(false);
      setIsDetailModalOpen(false);
      setResponse('');
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return '#f59e0b';
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'expired':
        return '#64748b';
      default:
        return '#3b82f6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Clock className="w-5 h-5" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5" />;
      case 'rejected':
        return <XCircle className="w-5 h-5" />;
      case 'expired':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const handleViewDetails = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsDetailModalOpen(true);
  };

  const handleApprove = () => {
    if (selectedQuote) {
      approveMutation.mutate({ quoteId: selectedQuote.id, response });
    }
  };

  const handleReject = () => {
    if (selectedQuote) {
      rejectMutation.mutate({ quoteId: selectedQuote.id, response });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-cyan-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4">Loading quotes...</p>
        </div>
      </div>
    );
  }

  const pendingQuotes = quotes.filter((q) => q.status === 'pending_approval');
  const processedQuotes = quotes.filter((q) => q.status !== 'pending_approval');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Quotes</h1>
        <p className="text-slate-600">
          Review and respond to quotes for your data recovery cases
        </p>
      </div>

      {pendingQuotes.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Awaiting Your Response
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {pendingQuotes.map((quote) => (
              <Card
                key={quote.id}
                className="p-6 border-2 border-amber-200 bg-amber-50 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleViewDetails(quote)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{quote.title}</h3>
                    <p className="text-sm text-slate-600 mb-2">{quote.quote_number}</p>
                    <p className="text-sm text-slate-700">Case: {quote.cases.case_no} - {quote.cases.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">
                      {quote.currency} {quote.total_amount.toLocaleString()}
                    </p>
                    {quote.valid_until && (
                      <p className="text-xs text-slate-500 mt-1">
                        Valid until {formatDate(quote.valid_until)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-amber-200">
                  <Badge variant="custom" color="#f59e0b">
                    Response Required
                  </Badge>
                  <span className="text-sm text-cyan-600 font-medium">View & Respond →</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {processedQuotes.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Quote History</h2>
          <div className="grid grid-cols-1 gap-4">
            {processedQuotes.map((quote) => (
              <Card
                key={quote.id}
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleViewDetails(quote)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{quote.title}</h3>
                      {getStatusIcon(quote.status)}
                      <Badge variant="custom" color={getStatusColor(quote.status)}>
                        {quote.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{quote.quote_number}</p>
                    <p className="text-sm text-slate-700">Case: {quote.cases.case_no}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">
                      {quote.currency} {quote.total_amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                {quote.customer_responded_at && (
                  <p className="text-xs text-slate-500 pt-4 border-t border-slate-200">
                    Responded on {formatDate(quote.customer_responded_at)}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {quotes.length === 0 && (
        <Card className="p-12 text-center">
          <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-lg text-slate-600 mb-2">No quotes yet</p>
          <p className="text-sm text-slate-500">
            Quotes for your data recovery cases will appear here
          </p>
        </Card>
      )}

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Quote Details"
      >
        {selectedQuote && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-slate-900">{selectedQuote.title}</h2>
                <Badge variant="custom" color={getStatusColor(selectedQuote.status)}>
                  {selectedQuote.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 mb-2">{selectedQuote.quote_number}</p>
              <p className="text-sm text-slate-700">
                Case: {selectedQuote.cases.case_no} - {selectedQuote.cases.title}
              </p>
              {selectedQuote.description && (
                <p className="text-slate-700 mt-3">{selectedQuote.description}</p>
              )}
            </div>

            {quoteItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                  Quote Items
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 font-semibold text-slate-700">Item</th>
                        <th className="text-center p-3 font-semibold text-slate-700">Qty</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Unit Price</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteItems.map((item, index) => (
                        <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-3">
                            <p className="font-medium text-slate-900">{item.item_name}</p>
                            {item.description && (
                              <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                            )}
                          </td>
                          <td className="p-3 text-center text-slate-700">{item.quantity}</td>
                          <td className="p-3 text-right text-slate-700">
                            {selectedQuote.currency} {item.unit_price.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-medium text-slate-900">
                            {selectedQuote.currency} {item.line_total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-bold text-slate-900">
                          Total Amount:
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 text-lg">
                          {selectedQuote.currency} {selectedQuote.total_amount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {selectedQuote.customer_response && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-semibold text-slate-700 mb-2">Your Response:</p>
                <p className="text-slate-900">{selectedQuote.customer_response}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Responded on {formatDate(selectedQuote.customer_responded_at!)}
                </p>
              </div>
            )}

            {selectedQuote.status === 'pending_approval' && (
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsRejectModalOpen(true);
                  }}
                  className="flex-1 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Quote
                </Button>
                <Button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsApproveModalOpen(true);
                  }}
                  className="flex-1"
                  style={{ backgroundColor: '#10b981' }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Quote
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => {
          setIsApproveModalOpen(false);
          setResponse('');
        }}
        title="Approve Quote"
      >
        <div className="space-y-4">
          <p className="text-slate-700">
            You are about to approve this quote. This action will notify our team to proceed with the work.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="Add any comments or special instructions..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-3 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setIsApproveModalOpen(false);
                setResponse('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              style={{ backgroundColor: '#10b981' }}
            >
              {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setResponse('');
        }}
        title="Reject Quote"
      >
        <div className="space-y-4">
          <p className="text-slate-700">
            You are about to reject this quote. Please provide a reason to help us understand your concerns.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reason for Rejection
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="Please explain why you're rejecting this quote..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-3 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setIsRejectModalOpen(false);
                setResponse('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
