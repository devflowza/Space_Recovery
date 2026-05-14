import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw, Search, Filter } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { getStockReturns, getStockReturn } from '../../lib/stockService';
import { stockKeys } from '../../lib/queryKeys';
import { ProcessReturnModal } from './ProcessReturnModal';
import { useCurrency } from '../../hooks/useCurrency';

const STATUS_CONFIG: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'info' | 'secondary' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'info' },
  rejected: { label: 'Rejected', variant: 'danger' },
  completed: { label: 'Completed', variant: 'success' },
  refunded: { label: 'Refunded', variant: 'secondary' },
};

const REASON_LABELS: Record<string, string> = {
  defective: 'Defective',
  wrong_item: 'Wrong Item',
  customer_changed_mind: 'Customer Changed Mind',
  warranty_claim: 'Warranty Claim',
  other: 'Other',
};

export const StockReturnsTable: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);

  const { data: returns = [], isLoading } = useQuery({
    queryKey: [...stockKeys.returns(), { status: statusFilter }],
    queryFn: () => getStockReturns(statusFilter ? { status: statusFilter } : undefined),
  });

  const { data: selectedReturn } = useQuery({
    queryKey: stockKeys.return(selectedReturnId!),
    queryFn: () => getStockReturn(selectedReturnId!),
    enabled: !!selectedReturnId,
  });

  const filtered = returns.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.return_number?.toLowerCase().includes(q) ||
      r.customers_enhanced?.customer_name?.toLowerCase().includes(q) ||
      r.stock_sales?.sale_number?.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search returns..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <RotateCcw className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No returns found</p>
          <p className="text-slate-400 text-sm mt-1">Returns will appear here once customers request them</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Return #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Original Sale</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Refund</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const statusCfg = STATUS_CONFIG[r.status] ?? { label: r.status, variant: 'secondary' as const };
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-primary">{r.return_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{r.customers_enhanced?.customer_name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-slate-600">{r.stock_sales?.sale_number ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {REASON_LABELS[r.reason] ?? r.reason}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(r.return_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {r.refund_amount != null ? formatCurrency(r.refund_amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={statusCfg.variant} size="sm">{statusCfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(r.status === 'pending' || r.status === 'approved') && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedReturnId(r.id)}
                        >
                          Process
                        </Button>
                      )}
                      {r.status === 'completed' && (
                        <span className="text-xs text-success font-medium">Done</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedReturnId && selectedReturn && (
        <ProcessReturnModal
          returnRecord={selectedReturn}
          onClose={() => setSelectedReturnId(null)}
        />
      )}
    </div>
  );
};
