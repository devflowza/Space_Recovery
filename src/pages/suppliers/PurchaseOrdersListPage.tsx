import React, { useState, useEffect } from 'react';
import { Plus, Search, Package, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/shared/DataTable';
import { Badge } from '../../components/ui/Badge';
import { StatsCard } from '../../components/ui/StatsCard';
import { Input } from '../../components/ui/Input';
import PurchaseOrderFormModal from '../../components/suppliers/PurchaseOrderFormModal';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../hooks/useToast';
import { format } from 'date-fns';

export default function PurchaseOrdersListPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [statuses, setStatuses] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    totalValue: 0,
  });

  useEffect(() => {
    loadOrders();
    loadStatuses();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(name, supplier_number),
          status:purchase_order_statuses(name, color)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
      calculateStats(data || []);
    } catch (error: unknown) {
      console.error('Error loading purchase orders:', error);
      showToast(error instanceof Error ? error.message : 'Failed to load purchase orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('master_purchase_order_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setStatuses(data || []);
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  };

  const calculateStats = (orderData: Array<Record<string, unknown> & { status?: { name?: string }; total_amount?: number }>) => {
    const pending = orderData.filter(o => o.status?.name === 'Draft' || o.status?.name === 'Ordered');
    const approved = orderData.filter(o => o.status?.name === 'Approved' || o.status?.name === 'Received');
    const totalValue = orderData.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    setStats({
      total: orderData.length,
      pending: pending.length,
      approved: approved.length,
      totalValue,
    });
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.po_number?.toLowerCase().includes(query) ||
          order.supplier?.name?.toLowerCase().includes(query) ||
          order.supplier?.supplier_number?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status_id === parseInt(statusFilter));
    }

    setFilteredOrders(filtered);
  };

  const handleEdit = (order: Record<string, unknown>) => {
    setSelectedOrder(order);
    setShowAddModal(true);
  };

  const handleDelete = async (order: { id: string; po_number?: string }) => {
    if (!confirm(`Are you sure you want to delete purchase order "${order.po_number}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', order.id);

      if (error) throw error;

      showToast('Purchase order deleted successfully', 'success');
      loadOrders();
    } catch (error: unknown) {
      console.error('Error deleting purchase order:', error);
      showToast(error instanceof Error ? error.message : 'Failed to delete purchase order', 'error');
    }
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setSelectedOrder(null);
  };

  const handleModalSuccess = () => {
    loadOrders();
  };

  const columns = [
    {
      key: 'po_number',
      label: 'PO Number',
      render: (order: Record<string, unknown>) => (
        <button
          onClick={() => navigate(`/purchase-orders/${order.id}`)}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {order.po_number}
        </button>
      ),
    },
    {
      key: 'supplier',
      label: 'Supplier',
      render: (order: Record<string, unknown>) => (
        <div>
          <div className="font-medium">{order.supplier?.name || '-'}</div>
          <div className="text-sm text-gray-500">{order.supplier?.supplier_number}</div>
        </div>
      ),
    },
    {
      key: 'order_date',
      label: 'Order Date',
      render: (order: Record<string, unknown>) => format(new Date(order.order_date), 'MMM dd, yyyy'),
    },
    {
      key: 'expected_delivery',
      label: 'Expected Delivery',
      render: (order: Record<string, unknown>) => order.expected_delivery ? format(new Date(order.expected_delivery), 'MMM dd, yyyy') : '-',
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      render: (order: Record<string, unknown>) => (
        <span className="font-semibold">${order.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (order: Record<string, unknown>) => (
        <Badge style={{ backgroundColor: order.status?.color || '#3b82f6', color: 'white' }}>
          {order.status?.name || 'Unknown'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (order: Record<string, unknown>) => format(new Date(order.created_at), 'MMM dd, yyyy'),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage purchase orders and track deliveries"
        action={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Purchase Order
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total Orders"
          value={stats.total.toString()}
          icon={Package}
        />
        <StatsCard
          title="Pending Orders"
          value={stats.pending.toString()}
          icon={Clock}
          iconColor="text-yellow-600"
        />
        <StatsCard
          title="Approved/Received"
          value={stats.approved.toString()}
          icon={CheckCircle}
          iconColor="text-green-600"
        />
        <StatsCard
          title="Total Value"
          value={`$${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          iconColor="text-blue-600"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by PO number, supplier..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Statuses</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredOrders}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="No purchase orders found"
        />
      </div>

      {showAddModal && (
        <PurchaseOrderFormModal
          isOpen={showAddModal}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          purchaseOrder={selectedOrder}
        />
      )}
    </div>
  );
}
