import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  MapPin,
  Package,
  Hash,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../hooks/useToast';
import {
  getStockTransfer,
  completeStockTransfer,
  cancelStockTransfer,
} from '../../lib/stockService';
import { stockKeys } from '../../lib/queryKeys';
import { useAuth } from '../../contexts/AuthContext';

const statusConfig: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'info' | 'secondary' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'warning' },
  in_transit: { label: 'In Transit', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

function formatDate(v: string | null): string {
  if (!v) return '—';
  return new Date(v).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const StockTransferDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();

  const { data: transfer, isLoading, error } = useQuery({
    queryKey: stockKeys.transfer(id!),
    queryFn: () => getStockTransfer(id!),
    enabled: !!id,
  });

  const completeMutation = useMutation({
    mutationFn: () => completeStockTransfer(id!, user?.id ?? ''),
    onSuccess: () => {
      toast.success('Transfer completed and stock moved');
      queryClient.invalidateQueries({ queryKey: stockKeys.transfer(id!) });
      queryClient.invalidateQueries({ queryKey: stockKeys.transfers() });
      queryClient.invalidateQueries({ queryKey: stockKeys.items() });
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to complete transfer'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelStockTransfer(id!),
    onSuccess: () => {
      toast.success('Transfer cancelled');
      queryClient.invalidateQueries({ queryKey: stockKeys.transfer(id!) });
      queryClient.invalidateQueries({ queryKey: stockKeys.transfers() });
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to cancel transfer'),
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-danger-muted border border-danger/30 rounded-xl p-6 text-center">
          <p className="text-danger">Transfer not found or failed to load.</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/stock/transfers')}>
            Back to Transfers
          </Button>
        </div>
      </div>
    );
  }

  const cfg = statusConfig[transfer.status] ?? { label: transfer.status, variant: 'secondary' as const };
  const canComplete = ['draft', 'pending', 'in_transit'].includes(transfer.status);
  const canCancel = ['draft', 'pending'].includes(transfer.status);

  const items = transfer.stock_transfer_items ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={`Transfer ${transfer.transfer_number}`}
        description="Stock transfer details"
        icon={ArrowRightLeft}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="gap-1" onClick={() => navigate('/stock/transfers')}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            {canCancel && (
              <Button
                variant="danger"
                size="sm"
                className="gap-1"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="w-4 h-4" />
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
              </Button>
            )}
            {canComplete && (
              <Button
                variant="primary"
                size="sm"
                className="gap-1"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
              >
                <CheckCircle className="w-4 h-4" />
                {completeMutation.isPending ? 'Completing...' : 'Complete Transfer'}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Transfer Info</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Hash className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Transfer Number</p>
                <p className="text-sm font-semibold text-slate-800 font-mono">{transfer.transfer_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <ArrowRightLeft className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Created</p>
                <p className="text-sm text-slate-700">{formatDate(transfer.created_at)}</p>
              </div>
            </div>
            {transfer.completed_at && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success-muted rounded-lg">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Completed</p>
                  <p className="text-sm text-slate-700">{formatDate(transfer.completed_at)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Locations</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-danger-muted rounded-lg mt-0.5">
                <MapPin className="w-4 h-4 text-danger" />
              </div>
              <div>
                <p className="text-xs text-slate-500">From</p>
                <p className="text-sm font-medium text-slate-800">{transfer.from_location?.name ?? '—'}</p>
                {transfer.from_location?.code && (
                  <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {transfer.from_location.code}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-success-muted rounded-lg mt-0.5">
                <MapPin className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-xs text-slate-500">To</p>
                <p className="text-sm font-medium text-slate-800">{transfer.to_location?.name ?? '—'}</p>
                {transfer.to_location?.code && (
                  <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {transfer.to_location.code}
                  </span>
                )}
              </div>
            </div>
          </div>
          {transfer.notes && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-700">{transfer.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Transfer Items</h3>
          <span className="text-xs text-slate-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>
        {items.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">No items in this transfer</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Serial Numbers</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 rounded">
                        <Package className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{item.stock_items?.name ?? '—'}</p>
                        {item.stock_items?.sku && (
                          <p className="text-xs text-slate-500 font-mono">{item.stock_items.sku}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">{item.quantity}</td>
                  <td className="px-4 py-3">
                    {item.serial_numbers && item.serial_numbers.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.serial_numbers.map((sn) => (
                          <span key={sn} className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {sn}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StockTransferDetail;
