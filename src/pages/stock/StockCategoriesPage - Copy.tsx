import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Plus, CreditCard as Edit2, Trash2, ChevronRight, Tag, Layers } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import {
  getStockCategories,
  createStockCategory,
  updateStockCategory,
  deleteStockCategory,
  type StockCategory,
} from '../../lib/stockService';
import { stockKeys } from '../../lib/queryKeys';
import { useToast } from '../../hooks/useToast';

type TabType = 'internal' | 'saleable';

interface CategoryFormData {
  name: string;
  description: string;
  parent_category_id: string;
  category_type: 'internal' | 'saleable';
  sort_order: string;
}

const defaultForm: CategoryFormData = {
  name: '',
  description: '',
  parent_category_id: '',
  category_type: 'internal',
  sort_order: '0',
};

interface CategoryTreeNode extends StockCategory {
  children: CategoryTreeNode[];
  itemCount: number;
}

function buildTree(categories: StockCategory[], type: TabType): CategoryTreeNode[] {
  const filtered = categories.filter((c) => c.category_type === type);
  const map = new Map<string, CategoryTreeNode>();

  for (const cat of filtered) {
    map.set(cat.id, { ...cat, children: [], itemCount: 0 });
  }

  const roots: CategoryTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parent_category_id && map.has(node.parent_category_id)) {
      map.get(node.parent_category_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

interface CategoryRowProps {
  node: CategoryTreeNode;
  depth: number;
  allCategories: StockCategory[];
  onEdit: (cat: StockCategory) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({
  node,
  depth,
  onEdit,
  onDelete,
  deletingId,
  onConfirmDelete,
  onCancelDelete,
}) => {
  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
            {depth > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            )}
            {node.children.length > 0 ? (
              <Layers className="w-4 h-4 text-blue-500 flex-shrink-0" />
            ) : (
              <Tag className="w-4 h-4 text-slate-400 flex-shrink-0" />
            )}
            <span className={`font-medium ${depth === 0 ? 'text-slate-900' : 'text-slate-700'}`}>
              {node.name}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-500">
          {node.description || <span className="text-slate-300 italic">No description</span>}
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            {node.children.length}
          </span>
        </td>
        <td className="px-4 py-3">
          <Badge variant={node.category_type === 'internal' ? 'info' : 'success'} size="sm">
            {node.category_type === 'internal' ? 'Internal' : 'Saleable'}
          </Badge>
        </td>
        <td className="px-4 py-3 text-sm text-slate-500 text-center">
          {node.sort_order ?? 0}
        </td>
        <td className="px-4 py-3">
          {deletingId === node.id ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600 font-medium">Delete?</span>
              <button
                onClick={() => onConfirmDelete(node.id)}
                className="px-2.5 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 font-medium transition-colors"
              >
                Yes
              </button>
              <button
                onClick={onCancelDelete}
                className="px-2.5 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 font-medium transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(node)}
                className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-blue-600"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(node.id)}
                className="p-1.5 hover:bg-red-50 rounded-md transition-colors text-slate-500 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </td>
      </tr>
      {node.children.map((child) => (
        <CategoryRow
          key={child.id}
          node={child}
          depth={depth + 1}
          allCategories={[]}
          onEdit={onEdit}
          onDelete={onDelete}
          deletingId={deletingId}
          onConfirmDelete={onConfirmDelete}
          onCancelDelete={onCancelDelete}
        />
      ))}
    </>
  );
};

export const StockCategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('internal');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<StockCategory | null>(null);
  const [form, setForm] = useState<CategoryFormData>(defaultForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: stockKeys.categories(),
    queryFn: () => getStockCategories(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createStockCategory>[0]) => createStockCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.categories() });
      toast.success('Category created successfully');
      closeModal();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateStockCategory>[1] }) =>
      updateStockCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.categories() });
      toast.success('Category updated successfully');
      closeModal();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStockCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.categories() });
      toast.success('Category deleted');
      setDeletingId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete category');
      setDeletingId(null);
    },
  });

  const openAdd = () => {
    setEditingCategory(null);
    setForm({ ...defaultForm, category_type: activeTab });
    setIsModalOpen(true);
  };

  const openEdit = (cat: StockCategory) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name,
      description: cat.description ?? '',
      parent_category_id: cat.parent_category_id ?? '',
      category_type: (cat.category_type as 'internal' | 'saleable') ?? 'internal',
      sort_order: String(cat.sort_order ?? 0),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setForm(defaultForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      parent_category_id: form.parent_category_id || null,
      category_type: form.category_type,
      sort_order: parseInt(form.sort_order, 10) || 0,
    };
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = categories.filter(
    (c) =>
      c.category_type === form.category_type &&
      (!editingCategory || c.id !== editingCategory.id)
  );

  const treeRoots = buildTree(categories, activeTab);

  const tabCounts = {
    internal: categories.filter((c) => c.category_type === 'internal').length,
    saleable: categories.filter((c) => c.category_type === 'saleable').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Stock Categories"
        description="Organize your stock items into categories and subcategories"
        icon={FolderOpen}
        actions={
          <Button onClick={openAdd} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Category
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="border-b border-slate-200 px-4 flex items-center gap-0">
          {(['internal', 'saleable'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors capitalize flex items-center gap-2 ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'internal' ? 'Internal Supplies' : 'Backup Devices'}
              <span
                className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  activeTab === tab
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tabCounts[tab]}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : treeRoots.length === 0 ? (
          <div className="py-16 text-center">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No categories yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Add your first {activeTab === 'internal' ? 'internal' : 'saleable'} category
            </p>
            <Button onClick={openAdd} size="sm" className="mt-4">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Category
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-64">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                    Sub-cats
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
                    Type
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">
                    Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {treeRoots.map((node) => (
                  <CategoryRow
                    key={node.id}
                    node={node}
                    depth={0}
                    allCategories={categories}
                    onEdit={openEdit}
                    onDelete={(id) => setDeletingId(id)}
                    deletingId={deletingId}
                    onConfirmDelete={(id) => deleteMutation.mutate(id)}
                    onCancelDelete={() => setDeletingId(null)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        icon={FolderOpen}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Cleaning Supplies"
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category Type <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              value={form.category_type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  category_type: e.target.value as 'internal' | 'saleable',
                  parent_category_id: '',
                }))
              }
            >
              <option value="internal">Internal</option>
              <option value="saleable">Saleable</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Parent Category
            </label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              value={form.parent_category_id}
              onChange={(e) => setForm((f) => ({ ...f, parent_category_id: e.target.value }))}
            >
              <option value="">— None (Top Level) —</option>
              {parentOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Sort Order"
            type="number"
            min="0"
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            placeholder="0"
          />

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Add Category'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StockCategoriesPage;
