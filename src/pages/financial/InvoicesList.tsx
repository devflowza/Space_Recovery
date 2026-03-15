import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { createInvoice } from '../../lib/invoiceService';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { InvoiceFormModal } from '../../components/cases/InvoiceFormModal';
import { formatDate } from '../../lib/format';
import { FinancialModuleHeader } from '../../components/financial/FinancialModuleHeader';
import { FinancialStatsCard } from '../../components/financial/FinancialStatsCard';
import { useCurrency } from '../../hooks/useCurrency';
import {
  Plus,
  Search,
  FileText,
  Calendar,
  DollarSign,
  User,
  Building2,
  Filter,
  Download,
  Send,
  Eye,
  Edit,
} from 'lucide-react';

export const InvoicesList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          status,
          total_amount,
          amount_paid,
          amount_due,
          customer:customers_enhanced(customer_name, email),
          company:companies(company_name),
          currency:currency_codes(symbol)
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('invoice_number', `%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#94a3b8',
      sent: '#3b82f6',
      'partially-paid': '#f59e0b',
      paid: '#10b981',
      overdue: '#ef4444',
      cancelled: '#6b7280',
    };
    return colors[status] || '#64748b';
  };

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.amount_due || 0), 0);

  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const sentInvoices = invoices.filter(inv => inv.status === 'sent');
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');

  if (isLoading) {
    return (
      <div className="p-8 max-w-[1800px] mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1800px] mx-auto">
      <FinancialModuleHeader
        icon={<FileText className="w-7 h-7 text-white" />}
        title="Invoices"
        description="Manage customer invoices and billing"
        iconBgColor="#3b82f6"
        statistics={[
          { label: 'Total Invoices', value: invoices.length, color: '#3b82f6' },
          { label: 'Paid', value: paidInvoices.length, color: '#10b981' },
          { label: 'Sent', value: sentInvoices.length, color: '#f59e0b' },
          { label: 'Overdue', value: overdueInvoices.length, color: '#ef4444' },
        ]}
        primaryAction={{
          label: 'Create Invoice',
          onClick: () => setShowInvoiceModal(true),
          icon: <Plus className="w-4 h-4" />,
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <FinancialStatsCard
          label="Total Invoiced"
          value={formatCurrency(totalInvoiced)}
          icon={<FileText className="w-5 h-5 text-white" />}
          color="blue"
        />
        <FinancialStatsCard
          label="Paid"
          value={formatCurrency(totalPaid)}
          icon={<DollarSign className="w-5 h-5 text-white" />}
          color="green"
        />
        <FinancialStatsCard
          label="Outstanding"
          value={formatCurrency(totalOutstanding)}
          icon={<Calendar className="w-5 h-5 text-white" />}
          color="orange"
        />
        <FinancialStatsCard
          label="Total Count"
          value={invoices.length}
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
                placeholder="Search invoices..."
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
                onClick={() => setStatusFilter(statusFilter === 'paid' ? 'all' : 'paid')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === 'paid'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Paid
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === 'overdue'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Overdue
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
                <option value="partially-paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">
            {searchTerm || statusFilter !== 'all'
              ? 'No invoices found matching your criteria.'
              : 'No invoices yet. Create your first invoice to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Balance
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
                {invoices.map((invoice: any) => (
                  <tr
                    key={invoice.id}
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-blue-600">{invoice.invoice_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {invoice.customer?.customer_name || 'N/A'}
                          </p>
                          {invoice.company && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {invoice.company.company_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {formatCurrency(invoice.amount_paid)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                      {formatCurrency(invoice.amount_due)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant="custom"
                        color={getStatusColor(invoice.status)}
                        size="sm"
                      >
                        {invoice.status.replace('-', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Send"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showInvoiceModal && (
        <InvoiceFormModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setEditingInvoice(null);
          }}
          onSave={async (invoiceData: any, items: any[]) => {
            await createInvoice({
              title: invoiceData.title,
              case_id: invoiceData.case_id,
              customer_id: invoiceData.customer_id,
              company_id: invoiceData.company_id,
              invoice_type: invoiceData.invoice_type,
              invoice_date: invoiceData.invoice_date,
              due_date: invoiceData.due_date,
              status: invoiceData.status,
              notes: invoiceData.notes,
              internal_notes: invoiceData.internal_notes,
              discount_amount: invoiceData.discount_amount,
              discount_type: invoiceData.discount_type,
              tax_rate: invoiceData.tax_rate,
              client_reference: invoiceData.client_reference,
              bank_account_id: invoiceData.bank_account_id,
              terms_and_conditions: invoiceData.terms_and_conditions,
              quote_id: invoiceData.quote_id,
            }, items);

            queryClient.invalidateQueries({ queryKey: ['invoices'] });
          }}
          caseId=""
        />
      )}
    </div>
  );
};
