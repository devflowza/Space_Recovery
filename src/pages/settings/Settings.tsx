import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { Plus, Edit2, Trash2 } from 'lucide-react';

type MasterDataTable =
  | 'device_types'
  | 'brands'
  | 'capacities'
  | 'accessories'
  | 'service_types'
  | 'case_priorities'
  | 'case_statuses'
  | 'customer_groups'
  | 'payment_methods'
  | 'expense_categories';

interface MasterDataItem {
  id: number;
  name?: string;
  value?: string;
  color?: string;
  created_at: string;
}

const TABLES: { key: MasterDataTable; label: string }[] = [
  { key: 'device_types', label: 'Device Types' },
  { key: 'brands', label: 'Brands' },
  { key: 'capacities', label: 'Capacities' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'service_types', label: 'Service Types' },
  { key: 'case_priorities', label: 'Case Priorities' },
  { key: 'case_statuses', label: 'Case Statuses' },
  { key: 'customer_groups', label: 'Customer Groups' },
  { key: 'payment_methods', label: 'Payment Methods' },
  { key: 'expense_categories', label: 'Expense Categories' },
];

export const Settings: React.FC = () => {
  const [activeTable, setActiveTable] = useState<MasterDataTable>('device_types');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [formValue, setFormValue] = useState('');
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['master_data', activeTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(activeTable)
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as MasterDataItem[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (value: string) => {
      const field = activeTable === 'capacities' ? 'value' : 'name';
      const { error } = await supabase
        .from(activeTable)
        .insert({ [field]: value });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master_data', activeTable] });
      setIsModalOpen(false);
      setFormValue('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, value }: { id: number; value: string }) => {
      const field = activeTable === 'capacities' ? 'value' : 'name';
      const { error } = await supabase
        .from(activeTable)
        .update({ [field]: value })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master_data', activeTable] });
      setIsModalOpen(false);
      setEditingItem(null);
      setFormValue('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from(activeTable)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master_data', activeTable] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValue.trim()) return;

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, value: formValue });
    } else {
      createMutation.mutate(formValue);
    }
  };

  const handleEdit = (item: MasterDataItem) => {
    setEditingItem(item);
    setFormValue(item.name || item.value || '');
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormValue('');
  };

  const columns = [
    {
      key: 'name',
      header: activeTable === 'capacities' ? 'Value' : 'Name',
      render: (row: MasterDataItem) => (
        <div className="flex items-center gap-2">
          {row.color && (
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: row.color }}
            />
          )}
          {row.name || row.value}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '150px',
      render: (row: MasterDataItem) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1 hover:bg-red-100 rounded text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage system master data and configuration</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-slate-200">
          <div className="flex overflow-x-auto">
            {TABLES.map((table) => (
              <button
                key={table.key}
                onClick={() => setActiveTable(table.key)}
                className={`px-6 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTable === table.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {table.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-900">
              {TABLES.find(t => t.key === activeTable)?.label}
            </h2>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add New
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : (
            <Table data={items} columns={columns} />
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Item' : 'Add New Item'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={activeTable === 'capacities' ? 'Value' : 'Name'}
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}
            required
            autoFocus
          />

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit">
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
