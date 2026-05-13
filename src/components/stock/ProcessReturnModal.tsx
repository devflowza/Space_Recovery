import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, PackageCheck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import {
  processStockReturn,
  completeStockReturn,
  type StockReturnWithDetails,
} from '../../lib/stockService';
import { stockKeys } from '../../lib/queryKeys';
import { useCurrency } from '../../hooks/useCurrency';

interface Props {
  returnRecord: StockReturnWithDetails;
  onClose: () => void;
}

const conditionColors: Record<string, string> = {
  good: 'bg-success-muted text-success',
  damaged: 'bg-warning-muted text-warning',
  defective: 'bg-danger-muted text-danger',
  opened: 'bg-info-muted text-info',
};

export const ProcessReturnModal: React.FC<Props> = ({ returnRecord, onClose }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const [processingNotes, setProcessingNotes] = useState('');

  const approveMutation = useMutation({
    mutationFn: () => processStockReturn(returnRecord.id, 'approve', user?.id ?? '', processingNotes || undefined),
    onSuccess: () => {
      toast.success('Return approved');
      queryClient.invalidateQueries({ queryKey: stockKeys.returns() });
      queryClient.invalidateQueries({ queryKey: stockKeys.return(returnRecord.id) });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to approve return'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => processStockReturn(returnRecord.id, 'reject', user?.id ?? '', processingNotes || undefined),
    onSuccess: () => {
      toast.success('Return rejected');
      queryClient.invalidateQueries({ queryKey: stockKeys.returns() });
      queryClient.invalidateQueries({ queryKey: stockKeys.return(returnRecord.id) });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to reject return'),
  });

  const completeMutation = useMutation({
    mutationFn: () => completeStockReturn(returnRecord.id),
    onSuccess: () => {
      toast.success('Return completed — items restocked');
      queryClient.invalidateQueries({ queryKey: stockKeys.returns() });
      queryClient.invalidateQueries({ queryKey: stockKeys.return(returnRecord.id) });
      queryClient.invalidateQueries({ queryKey: stockKeys.items() });
      queryClient.invalidateQueries({ queryKey: stockKeys.stats() });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to complete return'),
  });

  const items = returnRecord.stock_return_items ?? [];
  const isApproved = returnRecord.status === 'approved';
  const isPending = returnRecord.status === 'pending';

  return (
    <Modal isOpen onClose={onClose} title={`Process Return — ${returnRecord.return_number}`} size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-slate-50 rounded-lg px-3 py-2.5">
            <p className="text-xs text-slate-500 font-medium mb-0.5">Customer</p>
            <p className="font-semibold text-slate-900">{returnRecord.customers_enhanced?.customer_name ?? '—'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2.5">
            <p className="text-xs text-slate-500 font-medium mb-0.5">Original Sale</p>
            <p className="font-semibold text-slate-900 font-mono">{returnRecord.stock_sales?.sale_number ?? '—'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2.5">
            <p className="text-xs text-slate-500 font-medium mb-0.5">Refund Amount</p>
            <p className="font-semibold text-slate-900">{returnRecord.refund_amount != null ? formatCurrency(returnRecord.refund_amount) : '—'}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Return Items</p>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Item</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">Qty</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">Condition</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">Restock?</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-900">{item.stock_items?.name ?? '—'}</p>
                      {item.serial_number && (
                        <p className="text-xs text-slate-400 font-mono">S/N: {item.serial_number}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-semibold text-slate-900">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize ${conditionColors[item.condition] ?? 'bg-slate-100 text-slate-600'}`}>
                        {item.condition}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge variant={item.restock ? 'success' : 'secondary'} size="sm">
                        {item.restock ? 'Yes' : 'No'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                      {item.refund_amount != null ? formatCurrency(item.refund_amount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {(isPending || isApproved) && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Processing Notes
            </label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
              placeholder="Reason for approval or rejection..."
              value={processingNotes}
              onChange={(e) => setProcessingNotes(e.target.value)}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Close</Button>

          {isPending && (
            <>
              <Button
                variant="secondary"
                className="gap-2 text-danger hover:bg-danger-muted border-danger/30"
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending || approveMutation.isPending}
              >
                <XCircle className="w-4 h-4" />
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </Button>
              <Button
                variant="primary"
                className="gap-2"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                <CheckCircle className="w-4 h-4" />
                {approveMutation.isPending ? 'Approving...' : 'Approve Return'}
              </Button>
            </>
          )}

          {isApproved && (
            <Button
              variant="primary"
              className="gap-2"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              <PackageCheck className="w-4 h-4" />
              {completeMutation.isPending ? 'Completing...' : 'Complete & Restock'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
