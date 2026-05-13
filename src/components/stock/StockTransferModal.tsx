import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import {
  createStockTransfer,
  getStockItems,
} from '../../lib/stockService';
import { stockKeys } from '../../lib/queryKeys';
import { StockLocationSelect } from './StockLocationSelect';

interface TransferLine {
  stock_item_id: string;
  quantity: number;
  notes: string;
}

interface Props {
  onClose: () => void;
}

export const StockTransferModal: React.FC<Props> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();

  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<TransferLine[]>([
    { stock_item_id: '', quantity: 1, notes: '' },
  ]);

  const { data: stockItems = [] } = useQuery({
    queryKey: stockKeys.items(),
    queryFn: () => getStockItems(),
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!fromLocation || !toLocation) throw new Error('Select both locations');
      if (fromLocation === toLocation) throw new Error('From and To locations must be different');
      const validLines = lines.filter((l) => l.stock_item_id && l.quantity > 0);
      if (validLines.length === 0) throw new Error('Add at least one item to transfer');
      return createStockTransfer({
        from_location_id: fromLocation,
        to_location_id: toLocation,
        notes: notes || null,
        created_by: user?.id ?? null,
        items: validLines.map((l) => ({
          stock_item_id: l.stock_item_id,
          quantity: l.quantity,
          notes: l.notes || null,
        })),
      });
    },
    onSuccess: () => {
      toast.success('Transfer created successfully');
      queryClient.invalidateQueries({ queryKey: stockKeys.transfers() });
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to create transfer');
    },
  });

  const addLine = () => setLines((prev) => [...prev, { stock_item_id: '', quantity: 1, notes: '' }]);
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));
  const updateLine = (idx: number, updates: Partial<TransferLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...updates } : l)));
  };

  return (
    <Modal isOpen onClose={onClose} title="Create Stock Transfer" size="lg">
      <div className="space-y-5">
        <div className="flex items-end gap-3">
          <StockLocationSelect
            label="From Location"
            value={fromLocation}
            onChange={setFromLocation}
            excludeId={toLocation}
            required
            className="flex-1"
          />
          <div className="pb-2">
            <ArrowRight className="w-5 h-5 text-slate-400" />
          </div>
          <StockLocationSelect
            label="To Location"
            value={toLocation}
            onChange={setToLocation}
            excludeId={fromLocation}
            required
            className="flex-1"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Items to Transfer
            </label>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/90 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={line.stock_item_id}
                  onChange={(e) => updateLine(idx, { stock_item_id: e.target.value })}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="">Select item...</option>
                  {stockItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} {item.brand ? `(${item.brand})` : ''} — Qty: {item.current_quantity}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Qty"
                />
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 1}
                  className="p-2 text-slate-400 hover:text-danger transition-colors disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Notes (optional)
          </label>
          <textarea
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={2}
            placeholder="Reason for transfer..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            {mutation.isPending ? 'Creating...' : 'Create Transfer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
