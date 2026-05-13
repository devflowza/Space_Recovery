import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Package, Star, Tag, MapPin, Barcode, Hash, Truck, FileText, AlertTriangle, CreditCard as Edit2, TrendingUp, ArrowDownToLine, Wrench, Calendar, Clock, ExternalLink, Image, BarChart3 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import {
  getStockItem,
  getStockTransactions,
  getSerialNumbers,
  recordStockReceipt,
  recordStockUsage,
  updateStockItem,
  getReservationsForItem,
  type StockItemWithCategory,
  type StockTransaction,
  type StockSerialNumber,
  type StockReservation,
} from '../../lib/stockService';
import { stockKeys } from '../../lib/queryKeys';
import { useCurrency } from '../../hooks/useCurrency';
import { useToast } from '../../hooks/useToast';

type TabType = 'transactions' | 'serials' | 'sales' | 'reservations';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTransactionTypeVariant(
  type: string
): 'success' | 'danger' | 'info' | 'warning' | 'default' {
  switch (type) {
    case 'received':
      return 'success';
    case 'sold':
    case 'used':
      return 'danger';
    case 'adjusted':
      return 'warning';
    case 'reserved':
      return 'info';
    default:
      return 'default';
  }
}

function getSerialStatusVariant(status: string): 'success' | 'default' | 'warning' | 'danger' {
  switch (status) {
    case 'in_stock':
      return 'success';
    case 'sold':
      return 'default';
    case 'reserved':
      return 'warning';
    case 'defective':
      return 'danger';
    default:
      return 'default';
  }
}

interface ReceiveFormState {
  quantity: string;
  cost: string;
  notes: string;
}

interface UsageFormState {
  quantity: string;
  case_id: string;
  notes: string;
}

interface EditFormState {
  name: string;
  description: string;
  cost_price: string;
  selling_price: string;
  minimum_quantity: string;
  reorder_quantity: string;
  location: string;
  notes: string;
}

const InfoRow: React.FC<{ label: string; value?: React.ReactNode; icon?: React.ElementType }> = ({
  label,
  value,
  icon: Icon,
}) => (
  <div className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
    {Icon && <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />}
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="text-sm text-slate-900 mt-0.5 font-medium">
        {value || <span className="text-slate-300 font-normal italic">Not specified</span>}
      </div>
    </div>
  </div>
);

export const StockItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isUsageOpen, setIsUsageOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [receiveForm, setReceiveForm] = useState<ReceiveFormState>({
    quantity: '1',
    cost: '',
    notes: '',
  });
  const [usageForm, setUsageForm] = useState<UsageFormState>({
    quantity: '1',
    case_id: '',
    notes: '',
  });
  const [editForm, setEditForm] = useState<EditFormState>({
    name: '',
    description: '',
    cost_price: '',
    selling_price: '',
    minimum_quantity: '',
    reorder_quantity: '',
    location: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const { data: item, isLoading } = useQuery({
    queryKey: stockKeys.item(id!),
    queryFn: () => getStockItem(id!),
    enabled: !!id,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: stockKeys.transactions(id),
    queryFn: () => getStockTransactions({ itemId: id }),
    enabled: !!id && activeTab === 'transactions',
  });

  const { data: serialNumbers = [] } = useQuery({
    queryKey: stockKeys.serialNumbers(id!),
    queryFn: () => getSerialNumbers(id!),
    enabled: !!id && activeTab === 'serials',
  });

  const { data: reservations = [] } = useQuery({
    queryKey: stockKeys.reservations(id),
    queryFn: () => getReservationsForItem(id!),
    enabled: !!id && activeTab === 'reservations',
  });

  const receiveMutation = useMutation({
    mutationFn: ({ qty, cost, notes }: { qty: number; cost?: number; notes?: string }) =>
      recordStockReceipt(id!, qty, { cost, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.item(id!) });
      queryClient.invalidateQueries({ queryKey: stockKeys.transactions(id) });
      toast.success('Stock received successfully');
      setIsReceiveOpen(false);
      setReceiveForm({ quantity: '1', cost: '', notes: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const usageMutation = useMutation({
    mutationFn: ({ qty, caseId, notes }: { qty: number; caseId: string; notes?: string }) =>
      recordStockUsage(id!, qty, caseId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.item(id!) });
      queryClient.invalidateQueries({ queryKey: stockKeys.transactions(id) });
      toast.success('Stock usage recorded');
      setIsUsageOpen(false);
      setUsageForm({ quantity: '1', case_id: '', notes: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateStockItem>[1]) => updateStockItem(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.item(id!) });
      queryClient.invalidateQueries({ queryKey: stockKeys.items() });
      toast.success('Item updated successfully');
      setIsEditOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEdit = () => {
    if (!item) return;
    setEditForm({
      name: item.name,
      description: item.description ?? '',
      cost_price: item.cost_price != null ? String(item.cost_price) : '',
      selling_price: item.selling_price != null ? String(item.selling_price) : '',
      minimum_quantity: String(item.minimum_quantity),
      reorder_quantity: item.reorder_quantity != null ? String(item.reorder_quantity) : '',
      location: item.location ?? '',
      notes: item.notes ?? '',
    });
    setIsEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setIsSaving(true);
    try {
      await editMutation.mutateAsync({
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        cost_price: editForm.cost_price ? parseFloat(editForm.cost_price) : null,
        selling_price: editForm.selling_price ? parseFloat(editForm.selling_price) : null,
        minimum_quantity: parseInt(editForm.minimum_quantity, 10) || 0,
        reorder_quantity: editForm.reorder_quantity ? parseInt(editForm.reorder_quantity, 10) : null,
        location: editForm.location.trim() || null,
        notes: editForm.notes.trim() || null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReceive = async () => {
    const qty = parseInt(receiveForm.quantity, 10);
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    await receiveMutation.mutateAsync({
      qty,
      cost: receiveForm.cost ? parseFloat(receiveForm.cost) : undefined,
      notes: receiveForm.notes || undefined,
    });
  };

  const handleUsage = async () => {
    const qty = parseInt(usageForm.quantity, 10);
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (!usageForm.case_id.trim()) {
      toast.error('Please enter a Case ID');
      return;
    }
    await usageMutation.mutateAsync({
      qty,
      caseId: usageForm.case_id.trim(),
      notes: usageForm.notes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6 text-center">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Item not found</p>
        <Button onClick={() => navigate('/resources/stock')} className="mt-4" size="sm">
          Back to Stock
        </Button>
      </div>
    );
  }

  const availableQty = item.current_quantity - item.reserved_quantity;
  const availablePct =
    item.current_quantity > 0 ? (availableQty / item.current_quantity) * 100 : 0;
  const isLowStock = item.current_quantity <= item.minimum_quantity;
  const isOutOfStock = item.current_quantity === 0;

  const costPrice = item.cost_price ?? 0;
  const sellPrice = item.selling_price ?? 0;
  const margin = sellPrice > 0 && costPrice > 0 ? ((sellPrice - costPrice) / sellPrice) * 100 : 0;

  const specifications =
    item.specifications && typeof item.specifications === 'object' && !Array.isArray(item.specifications)
      ? (item.specifications as Record<string, unknown>)
      : null;

  const isSaleable = item.item_type === 'saleable' || item.item_type === 'both';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <button
          onClick={() => navigate('/resources/stock')}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Stock
        </button>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50 flex-shrink-0">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image className="w-8 h-8 text-slate-300" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {item.sku && (
                      <Badge variant="secondary" size="sm">
                        <Hash className="w-3 h-3 mr-1" />
                        {item.sku}
                      </Badge>
                    )}
                    <Badge
                      variant={
                        item.item_type === 'internal'
                          ? 'info'
                          : item.item_type === 'saleable'
                          ? 'success'
                          : 'default'
                      }
                      size="sm"
                    >
                      {item.item_type === 'both'
                        ? 'Internal & Saleable'
                        : item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1)}
                    </Badge>
                    {item.is_featured && (
                      <Badge variant="warning" size="sm">
                        <Star className="w-3 h-3 mr-1 fill-warning" />
                        Featured
                      </Badge>
                    )}
                    {isOutOfStock && (
                      <Badge variant="danger" size="sm">
                        Out of Stock
                      </Badge>
                    )}
                    {!isOutOfStock && isLowStock && (
                      <Badge variant="warning" size="sm">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Low Stock
                      </Badge>
                    )}
                  </div>

                  <h1 className="text-2xl font-bold text-slate-900">{item.name}</h1>

                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
                    {item.brand && <span className="font-medium">{item.brand}</span>}
                    {item.model && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>{item.model}</span>
                      </>
                    )}
                    {item.capacity && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>{item.capacity}</span>
                      </>
                    )}
                    {item.stock_categories && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {item.stock_categories.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={openEdit}
                  >
                    <Edit2 className="w-4 h-4 mr-1.5" />
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Item Information
            </h2>

            {item.description && (
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">{item.description}</p>
            )}

            <div className="grid grid-cols-2 gap-x-6">
              <div>
                <InfoRow label="Unit of Measure" value={item.unit_of_measure} icon={BarChart3} />
                <InfoRow label="Barcode" value={item.barcode} icon={Barcode} />
                <InfoRow label="Location" value={item.location} icon={MapPin} />
                {item.warranty_months != null && (
                  <InfoRow
                    label="Warranty"
                    value={`${item.warranty_months} month${item.warranty_months !== 1 ? 's' : ''}`}
                    icon={Calendar}
                  />
                )}
              </div>
              <div>
                {item.notes && (
                  <InfoRow label="Notes" value={item.notes} icon={FileText} />
                )}
                <InfoRow
                  label="Created"
                  value={formatDate(item.created_at)}
                  icon={Clock}
                />
                <InfoRow
                  label="Last Updated"
                  value={formatDate(item.updated_at)}
                  icon={Clock}
                />
              </div>
            </div>

            {specifications && Object.keys(specifications).length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Specifications
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {Object.entries(specifications).map(([key, val]) => (
                    <InfoRow
                      key={key}
                      label={key.replace(/_/g, ' ')}
                      value={String(val ?? '')}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              Pricing
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-xs text-slate-500 font-medium mb-1">Cost Price</p>
                <p className="text-xl font-bold text-slate-900">
                  {item.cost_price != null ? formatCurrency(item.cost_price) : '—'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-xs text-slate-500 font-medium mb-1">Selling Price</p>
                <p className="text-xl font-bold text-slate-900">
                  {item.selling_price != null ? formatCurrency(item.selling_price) : '—'}
                </p>
              </div>
              <div
                className={`rounded-lg p-4 text-center ${
                  margin > 30
                    ? 'bg-success-muted'
                    : margin > 10
                    ? 'bg-warning-muted'
                    : 'bg-slate-50'
                }`}
              >
                <p className="text-xs text-slate-500 font-medium mb-1">Margin</p>
                <p
                  className={`text-xl font-bold ${
                    margin > 30 ? 'text-success' : margin > 10 ? 'text-warning' : 'text-slate-600'
                  }`}
                >
                  {margin > 0 ? `${margin.toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>
            {item.tax_inclusive && (
              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                Prices are tax inclusive
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" />
              Inventory Levels
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Current Stock</span>
                <span className="text-lg font-bold text-slate-900">{item.current_quantity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Reserved</span>
                <span className="font-semibold text-warning">{item.reserved_quantity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 font-medium">Available</span>
                <span
                  className={`text-lg font-bold ${
                    availableQty <= 0 ? 'text-danger' : 'text-success'
                  }`}
                >
                  {availableQty}
                </span>
              </div>

              <div className="pt-1">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>Available</span>
                  <span>{availablePct.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      availablePct > 50
                        ? 'bg-success'
                        : availablePct > 20
                        ? 'bg-warning'
                        : 'bg-danger'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, availablePct))}%` }}
                  />
                </div>
              </div>

              <div className="pt-1 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Minimum Qty</span>
                  <span className="font-mono font-medium text-slate-700">
                    {item.minimum_quantity}
                  </span>
                </div>
                {item.reorder_quantity != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Reorder Qty</span>
                    <span className="font-mono font-medium text-slate-700">
                      {item.reorder_quantity}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {(isLowStock || isOutOfStock) && (
              <div
                className={`mt-4 flex items-start gap-2 p-3 rounded-lg text-xs ${
                  isOutOfStock ? 'bg-danger-muted text-danger' : 'bg-warning-muted text-warning'
                }`}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="font-medium">
                  {isOutOfStock
                    ? 'This item is out of stock'
                    : `Stock is below minimum threshold (${item.minimum_quantity})`}
                </span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Button
                onClick={() => setIsReceiveOpen(true)}
                className="w-full justify-start"
                size="sm"
              >
                <ArrowDownToLine className="w-4 h-4 mr-2" />
                Receive Stock
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsUsageOpen(true)}
                className="w-full justify-start"
                size="sm"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Record Usage
              </Button>
              <Button
                variant="ghost"
                onClick={openEdit}
                className="w-full justify-start"
                size="sm"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Item
              </Button>
            </div>
          </div>

          {item.supplier_id && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-400" />
                Supplier
              </h2>
              <p className="text-sm text-slate-500">Supplier ID: {item.supplier_id}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="border-b border-slate-200 px-4 flex items-center">
          {(
            [
              { key: 'transactions', label: 'Transaction History' },
              { key: 'serials', label: 'Serial Numbers' },
              ...(isSaleable ? [{ key: 'sales', label: 'Sales History' }] : []),
              { key: 'reservations', label: `Reservations${item.reserved_quantity > 0 ? ` (${item.reserved_quantity})` : ''}` },
            ] as { key: TabType; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'transactions' && (
            <div className="overflow-x-auto">
              {transactions.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  No transactions recorded for this item
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="pb-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="pb-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="pb-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Before
                      </th>
                      <th className="pb-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        After
                      </th>
                      <th className="pb-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="pb-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Case
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-2.5 text-slate-600">
                          {formatDateTime(tx.transaction_date)}
                        </td>
                        <td className="py-2.5">
                          <Badge
                            variant={getTransactionTypeVariant(tx.transaction_type)}
                            size="sm"
                          >
                            {tx.transaction_type}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-center font-mono font-semibold">
                          <span
                            className={
                              tx.quantity > 0 ? 'text-success' : 'text-danger'
                            }
                          >
                            {tx.quantity > 0 ? '+' : ''}
                            {tx.quantity}
                          </span>
                        </td>
                        <td className="py-2.5 text-center font-mono text-slate-500">
                          {tx.previous_quantity ?? '—'}
                        </td>
                        <td className="py-2.5 text-center font-mono text-slate-700">
                          {tx.new_quantity ?? '—'}
                        </td>
                        <td className="py-2.5 text-slate-500 max-w-xs truncate">
                          {tx.notes ?? '—'}
                        </td>
                        <td className="py-2.5">
                          {tx.case_id ? (
                            <Link
                              to={`/cases/${tx.case_id}`}
                              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-xs font-medium"
                            >
                              View Case
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'serials' && (
            <div>
              {serialNumbers.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  No serial numbers tracked for this item
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {serialNumbers.map((sn) => (
                    <div
                      key={sn.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium text-slate-900 truncate">
                          {sn.serial_number}
                        </p>
                        {sn.purchase_date && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatDate(sn.purchase_date)}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={getSerialStatusVariant(sn.status)}
                        size="sm"
                      >
                        {sn.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="py-8 text-center text-slate-400 text-sm">
              <ShoppingCartIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              Sales history loaded from stock sales records
            </div>
          )}

          {activeTab === 'reservations' && (
            <div>
              {reservations.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  No active reservations for this item
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Reference</th>
                      <th className="pb-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                      <th className="pb-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Qty</th>
                      <th className="pb-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Expires</th>
                      <th className="pb-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Created</th>
                      <th className="pb-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reservations.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2.5 pr-4 font-mono text-xs text-slate-700">{r.reference_id ?? '—'}</td>
                        <td className="py-2.5 pr-4">
                          <span className="capitalize text-slate-600">{r.reference_type ?? '—'}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-center font-semibold text-warning">{r.quantity}</td>
                        <td className="py-2.5 pr-4 text-slate-500">{r.expires_at ? formatDate(r.expires_at) : 'No expiry'}</td>
                        <td className="py-2.5 pr-4 text-slate-500">{formatDate(r.created_at)}</td>
                        <td className="py-2.5 text-center">
                          <Badge variant="warning" size="sm">{r.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isReceiveOpen}
        onClose={() => setIsReceiveOpen(false)}
        title="Receive Stock"
        icon={ArrowDownToLine}
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-slate-700">{item.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">Current stock: {item.current_quantity}</p>
          </div>

          <Input
            label="Quantity to Receive"
            type="number"
            min="1"
            required
            value={receiveForm.quantity}
            onChange={(e) => setReceiveForm((f) => ({ ...f, quantity: e.target.value }))}
          />
          <Input
            label="Unit Cost (optional)"
            type="number"
            min="0"
            step="0.001"
            value={receiveForm.cost}
            onChange={(e) => setReceiveForm((f) => ({ ...f, cost: e.target.value }))}
            placeholder={item.cost_price != null ? String(item.cost_price) : 'Enter cost'}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
              rows={2}
              value={receiveForm.notes}
              onChange={(e) => setReceiveForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={() => setIsReceiveOpen(false)}
              disabled={receiveMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleReceive} disabled={receiveMutation.isPending}>
              {receiveMutation.isPending ? 'Saving...' : 'Receive Stock'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isUsageOpen}
        onClose={() => setIsUsageOpen(false)}
        title="Record Usage"
        icon={Wrench}
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-slate-700">{item.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">Available: {availableQty}</p>
          </div>

          <Input
            label="Quantity Used"
            type="number"
            min="1"
            max={availableQty}
            required
            value={usageForm.quantity}
            onChange={(e) => setUsageForm((f) => ({ ...f, quantity: e.target.value }))}
          />
          <Input
            label="Case ID"
            required
            value={usageForm.case_id}
            onChange={(e) => setUsageForm((f) => ({ ...f, case_id: e.target.value }))}
            placeholder="e.g. CASE-0042"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
              rows={2}
              value={usageForm.notes}
              onChange={(e) => setUsageForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={() => setIsUsageOpen(false)}
              disabled={usageMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleUsage} disabled={usageMutation.isPending}>
              {usageMutation.isPending ? 'Saving...' : 'Record Usage'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Item"
        icon={Edit2}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Name"
                required
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <Input
              label="Cost Price"
              type="number"
              min="0"
              step="0.001"
              value={editForm.cost_price}
              onChange={(e) => setEditForm((f) => ({ ...f, cost_price: e.target.value }))}
            />
            <Input
              label="Selling Price"
              type="number"
              min="0"
              step="0.001"
              value={editForm.selling_price}
              onChange={(e) => setEditForm((f) => ({ ...f, selling_price: e.target.value }))}
            />
            <Input
              label="Minimum Quantity"
              type="number"
              min="0"
              value={editForm.minimum_quantity}
              onChange={(e) => setEditForm((f) => ({ ...f, minimum_quantity: e.target.value }))}
            />
            <Input
              label="Reorder Quantity"
              type="number"
              min="0"
              value={editForm.reorder_quantity}
              onChange={(e) => setEditForm((f) => ({ ...f, reorder_quantity: e.target.value }))}
            />
            <Input
              label="Location"
              value={editForm.location}
              onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Shelf A-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
              rows={2}
              value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const ShoppingCartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

export default StockItemDetail;
