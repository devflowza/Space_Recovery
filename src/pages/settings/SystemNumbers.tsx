import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { ChevronLeft, Hash, Search } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../lib/logger';

type SequenceScope =
  | 'case'
  | 'invoice'
  | 'quote'
  | 'customer'
  | 'expense'
  | 'asset'
  | 'proforma_invoice'
  | 'inventory'
  | 'transfer'
  | 'deposit'
  | 'company'
  | 'supplier'
  | 'stock'
  | 'purchase_order'
  | 'employee'
  | 'user'
  | 'document'
  | 'clone_drive'
  | 'report'
  | 'report_evaluation'
  | 'report_service'
  | 'report_server'
  | 'report_malware'
  | 'report_forensic'
  | 'report_data_destruction'
  | 'report_prevention';

interface NumberSequence {
  id: string;
  scope: SequenceScope;
  prefix: string;
  padding: number;
  last_number: number;
  annual_reset: boolean;
  created_at: string;
}

const SEQUENCE_CONFIG = [
  { key: 'case', label: 'Case ID', description: 'Data recovery case tracking', category: 'Operations', color: '#10b981' },
  { key: 'invoice', label: 'Invoice Number', description: 'Customer invoicing', category: 'Financial', color: '#8b5cf6' },
  { key: 'quote', label: 'Quote Number', description: 'Price quotations', category: 'Financial', color: '#3b82f6' },
  { key: 'proforma_invoice', label: 'Proforma Invoice Number', description: 'Advance payment invoices', category: 'Financial', color: '#ec4899' },
  { key: 'expense', label: 'Expense Number', description: 'Business expense tracking', category: 'Financial', color: '#ef4444' },
  { key: 'deposit', label: 'Deposit Number', description: 'Bank deposit receipts', category: 'Financial', color: '#f97316' },
  { key: 'transfer', label: 'Transfer Number', description: 'Bank transfer transactions', category: 'Financial', color: '#f59e0b' },
  { key: 'customer', label: 'Customer Number', description: 'Individual client IDs', category: 'Business Partners', color: '#06b6d4' },
  { key: 'company', label: 'Company Number', description: 'Corporate client IDs', category: 'Business Partners', color: '#0ea5e9' },
  { key: 'supplier', label: 'Supplier Number', description: 'Vendor/supplier IDs', category: 'Business Partners', color: '#14b8a6' },
  { key: 'asset', label: 'Asset Number', description: 'Company asset tracking', category: 'Inventory', color: '#6366f1' },
  { key: 'inventory', label: 'Inventory Number', description: 'Inventory item tracking', category: 'Inventory', color: '#8b5cf6' },
  { key: 'clone_drive', label: 'Clone ID', description: 'Physical clone drive resources', category: 'Inventory', color: '#3b82f6' },
  { key: 'stock', label: 'Stock Number', description: 'Stock item management', category: 'Inventory', color: '#a855f7' },
  { key: 'purchase_order', label: 'Purchase Order Number', description: 'Supplier purchase orders', category: 'Operations', color: '#d946ef' },
  { key: 'document', label: 'Document Number', description: 'General document tracking', category: 'Operations', color: '#64748b' },
  { key: 'employee', label: 'Employee Number', description: 'Employee ID numbers', category: 'HR', color: '#22c55e' },
  { key: 'user', label: 'User Number', description: 'System user IDs', category: 'HR', color: '#84cc16' },
  { key: 'report_evaluation', label: 'Evaluation Report Number', description: 'Assessment and recovery feasibility reports', category: 'Reports', color: '#3b82f6' },
  { key: 'report_service', label: 'Service Report Number', description: 'Service work documentation reports', category: 'Reports', color: '#10b981' },
  { key: 'report_server', label: 'Server Report Number', description: 'Server recovery and RAID reports', category: 'Reports', color: '#8b5cf6' },
  { key: 'report_malware', label: 'Malware Report Number', description: 'Malware analysis and remediation reports', category: 'Reports', color: '#ef4444' },
  { key: 'report_forensic', label: 'Forensic Report Number', description: 'Legal forensic investigation reports', category: 'Reports', color: '#6366f1' },
  { key: 'report_data_destruction', label: 'Data Destruction Report Number', description: 'Certified data destruction reports', category: 'Reports', color: '#dc2626' },
  { key: 'report_prevention', label: 'Prevention Report Number', description: 'Preventative recommendations reports', category: 'Reports', color: '#f59e0b' },
];

export const SystemNumbers: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<NumberSequence | null>(null);
  const [formData, setFormData] = useState({ prefix: '', last_number: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['number_sequences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('number_sequences')
        .select('*')
        .order('scope', { ascending: true });

      if (error) throw error;
      return data as NumberSequence[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, prefix, last_number }: { id: string; prefix: string; last_number: number }) => {
      const { data, error } = await supabase
        .rpc('update_number_sequence', {
          p_id: id,
          p_prefix: prefix,
          p_last_number: last_number
        });

      if (error) {
        logger.error('Error updating number sequence:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['number_sequences'] });
      setIsModalOpen(false);
      setEditingSequence(null);
      setFormData({ prefix: '', last_number: 0 });

      toast.success('Number sequence updated successfully');
    },
    onError: (error: Error) => {
      logger.error('Failed to update number sequence:', error);
      toast.error(`Failed to update: ${error.message || 'Unknown error occurred'}`);
    },
  });

  const handleEdit = (sequence: NumberSequence) => {
    setEditingSequence(sequence);
    setFormData({ prefix: sequence.prefix, last_number: sequence.last_number });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSequence) return;

    updateMutation.mutate({
      id: editingSequence.id,
      prefix: formData.prefix,
      last_number: formData.last_number,
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSequence(null);
    setFormData({ prefix: '', last_number: 0 });
  };

  const formatNumber = (seq: NumberSequence) => {
    const nextNum = seq.last_number + 1;
    return seq.prefix + nextNum.toString().padStart(seq.padding, '0');
  };

  const formatCurrentNumber = (seq: NumberSequence) => {
    if (seq.last_number === 0) return 'Not assigned';
    return seq.prefix + seq.last_number.toString().padStart(seq.padding, '0');
  };

  const categories = ['All', ...Array.from(new Set(SEQUENCE_CONFIG.map(s => s.category)))];

  const filteredSequenceTypes = SEQUENCE_CONFIG.filter(type => {
    const matchesSearch = type.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          type.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || type.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-all hover:gap-3 font-medium"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>Back to Settings</span>
      </button>

      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-start gap-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: '#6366f1',
              boxShadow: '0 10px 40px -10px #6366f180'
            }}
          >
            <Hash className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">System & Numbers</h1>
            <p className="text-slate-600 text-base">Configure automatic numbering sequences for all entities</p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search sequences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Number Sequences ({filteredSequenceTypes.length})
              </h2>
              <p className="text-slate-500">Configure prefixes and current numbers for automatic numbering</p>
            </div>

            {isLoading ? (
              <div className="text-center py-16">
                <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 mt-4">Loading sequences...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSequenceTypes.map((type) => {
                  const sequence = sequences.find(s => s.scope === type.key);
                  if (!sequence) return null;

                  return (
                    <div
                      key={type.key}
                      className="group border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all hover:border-slate-300 bg-gradient-to-r from-white to-slate-50/20"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-base font-bold text-slate-900">{type.label}</h3>
                            <Badge
                              variant="custom"
                              color={type.color}
                              size="sm"
                              className="text-xs"
                            >
                              {type.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500">{type.description}</p>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                            Current Number
                          </div>
                          <Badge
                            variant="custom"
                            color={type.color}
                            size="md"
                            className="font-mono"
                          >
                            {formatCurrentNumber(sequence)}
                          </Badge>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                            Next Number
                          </div>
                          <Badge
                            variant="success"
                            size="md"
                            className="font-mono"
                          >
                            {formatNumber(sequence)}
                          </Badge>
                        </div>

                        <button
                          onClick={() => handleEdit(sequence)}
                          className="p-2.5 hover:bg-blue-50 rounded-lg transition-all hover:scale-110"
                          style={{ color: type.color }}
                          title="Edit Sequence"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={`Edit ${editingSequence ? SEQUENCE_CONFIG.find(t => t.key === editingSequence.scope)?.label : ''}`}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Prefix
            </label>
            <Input
              value={formData.prefix}
              onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
              placeholder="INV-"
              className="font-mono"
            />
            <p className="text-xs text-slate-500 mt-2">
              The prefix that appears before the number (e.g., INV-0001)
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Last Assigned Number
            </label>
            <Input
              type="number"
              value={formData.last_number}
              onChange={(e) => setFormData({ ...formData, last_number: parseInt(e.target.value) || 0 })}
              min="0"
              className="font-mono"
            />
            <p className="text-xs text-slate-500 mt-2">
              Next assignment will be: <span className="font-semibold">{formData.prefix}{(formData.last_number + 1).toString().padStart(editingSequence?.padding || 4, '0')}</span>
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" style={{ backgroundColor: '#6366f1' }} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update Sequence'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
