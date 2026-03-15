import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  Search,
  LayoutGrid,
  LayoutList,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Boxes,
  Settings,
  ClipboardList,
} from 'lucide-react';
import { EmptyState } from '../../components/shared/EmptyState';
import { stockKeys } from '../../lib/queryKeys';
import {
  getStockItems,
  getStockStats,
  deleteStockItem,
  type StockItemWithCategory,
  type StockFilters,
} from '../../lib/stockService';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StockItemsTable } from '../../components/stock/StockItemsTable';
import { StockItemFormModal } from '../../components/stock/StockItemFormModal';
import { StockTransactionModal } from '../../components/stock/StockTransactionModal';
import { LowStockAlert } from '../../components/stock/LowStockAlert';
import { StockCategorySelect } from '../../components/stock/StockCategorySelect';
import { SaleableItemsGrid } from '../../components/stock/SaleableItemsGrid';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../hooks/useToast';

type TabId = 'all' | 'saleable' | 'internal' | 'low_stock';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All Items' },
  { id: 'saleable', label: 'Backup Devices' },
  { id: 'internal', label: 'Internal Supplies' },
  { id: 'low_stock', label: 'Low Stock' },
];

const formatCurrency = (value: number): string =>
  value.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export const StockListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [alertDismissed, setAlertDismissed] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItemWithCategory | null>(null);

  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionMode, setTransactionMode] = useState<'receipt' | 'usage'>('receipt');
  const [transactionItem, setTransactionItem] = useState<StockItemWithCategory | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<StockItemWithCategory | null>(null);

  useEffect(() => {
    if (searchParams.get('filter') === 'low-stock') {
      setActiveTab('low_stock');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = useMemo((): StockFilters => {
    const base: StockFilters = {
      search: debouncedSearch || undefined,
      category_id: categoryId ?? undefined,
    };
    if (activeTab === 'saleable') return { ...base, type: 'saleable' };
    if (activeTab === 'internal') return { ...base, type: 'internal' };
    if (activeTab === 'low_stock') return { ...base, lowStock: true };
    return base;
  }, [activeTab, debouncedSearch, categoryId]);

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: [...stockKeys.items(), filters],
    queryFn: () => getStockItems(filters),
    staleTime: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: stockKeys.stats(),
    queryFn: getStockStats,
    staleTime: 60000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStockItem(id),
    onSuccess: () => {
      toast.success('Stock item deleted');
      queryClient.invalidateQueries({ queryKey: stockKeys.items() });
      queryClient.invalidateQueries({ queryKey: stockKeys.stats() });
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to delete item');
    },
  });

  const handleEdit = (item: StockItemWithCategory) => {
    setEditingItem(item);
    setFormModalOpen(true);
  };

  const handleViewDetail = (item: StockItemWithCategory) => {
    navigate(`/resources/stock/${item.id}`);
  };

  const handleReceive = (item: StockItemWithCategory) => {
    setTransactionItem(item);
    setTransactionMode('receipt');
    setTransactionModalOpen(true);
  };

  const handleRecordUsage = (item: StockItemWithCategory) => {
    setTransactionItem(item);
    setTransactionMode('usage');
    setTransactionModalOpen(true);
  };

  const handleDelete = (item: StockItemWithCategory) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: stockKeys.items() });
    queryClient.invalidateQueries({ queryKey: stockKeys.stats() });
  };

  const handleTransactionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: stockKeys.items() });
    queryClient.invalidateQueries({ queryKey: stockKeys.stats() });
  };

  const showGrid = activeTab === 'saleable' && viewMode === 'grid';

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-6">
      <PageHeader
        title="Stock"
        description="Manage backup devices and internal supplies"
        icon={Package}
        actions={
          <>
            <Link to="/resources/stock/adjustments">
              <Button variant="secondary" size="sm" className="gap-2">
                <ClipboardList className="w-4 h-4" />
                Adjustments
              </Button>
            </Link>
            <Link to="/resources/stock/categories">
              <Button variant="secondary" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Categories
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              className="gap-2"
              onClick={() => {
                setEditingItem(null);
                setFormModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-blue-50">
            <Boxes className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Items</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">
              {stats?.totalItems ?? 0}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-green-50">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Stock Value</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">
              {formatCurrency(stats?.stockValue ?? 0)}
            </p>
          </div>
        </div>

        <Link
          to="/resources/stock?filter=low-stock"
          className="bg-white rounded-xl border border-amber-200 p-5 flex items-start gap-4 hover:bg-amber-50 transition-colors group"
          onClick={() => setActiveTab('low_stock')}
        >
          <div className="p-2.5 rounded-lg bg-amber-50 group-hover:bg-amber-100 transition-colors">
            <TrendingDown className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-amber-700 font-medium">Low Stock</p>
            <p className="text-2xl font-bold text-amber-900 mt-0.5 tabular-nums">
              {stats?.lowStockCount ?? 0}
            </p>
          </div>
        </Link>

        <div className="bg-white rounded-xl border border-red-200 p-5 flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-red-50">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-red-700 font-medium">Out of Stock</p>
            <p className="text-2xl font-bold text-red-900 mt-0.5 tabular-nums">
              {stats?.outOfStockCount ?? 0}
            </p>
          </div>
        </div>
      </div>

      {!alertDismissed && (stats?.lowStockCount ?? 0) > 0 && (
        <LowStockAlert
          count={stats?.lowStockCount ?? 0}
          onDismiss={() => setAlertDismissed(true)}
        />
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 px-4">
          <div className="flex items-center gap-0 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
                {tab.id === 'low_stock' && (stats?.lowStockCount ?? 0) > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                    {stats?.lowStockCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center border-b border-slate-100">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, brand, SKU..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="w-full sm:w-56">
            <StockCategorySelect
              value={categoryId}
              onChange={setCategoryId}
              placeholder="All Categories"
            />
          </div>

          {activeTab === 'saleable' && (
            <div className="flex items-center gap-1 border border-slate-200 rounded-md p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'table'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title="Table view"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-slate-500 ml-auto shrink-0">
            <span className="font-medium text-slate-700 tabular-nums">{items.length}</span>
            <span>item{items.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className={showGrid ? 'p-4' : ''}>
          {showGrid ? (
            <SaleableItemsGrid
              items={items}
              onSelect={(item) => handleEdit(item)}
              selectedIds={[]}
            />
          ) : (
            <StockItemsTable
              items={items}
              isLoading={itemsLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetail={handleViewDetail}
              onReceive={handleReceive}
              onRecordUsage={handleRecordUsage}
            />
          )}
        </div>
      </div>

      <StockItemFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        onSuccess={handleFormSuccess}
      />

      <StockTransactionModal
        isOpen={transactionModalOpen}
        onClose={() => {
          setTransactionModalOpen(false);
          setTransactionItem(null);
        }}
        item={transactionItem}
        mode={transactionMode}
        onSuccess={handleTransactionSuccess}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletingItem(null);
        }}
        onConfirm={() => {
          if (deletingItem) deleteMutation.mutate(deletingItem.id);
        }}
        title="Delete Stock Item"
        message={`Are you sure you want to delete "${deletingItem?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default StockListPage;
