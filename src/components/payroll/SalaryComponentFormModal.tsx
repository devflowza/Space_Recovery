import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { payrollService } from '../../lib/payrollService';
import { payrollKeys } from '../../lib/queryKeys';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { useToast } from '../../hooks/useToast';
import type { Database } from '../../types/database.types';

type SalaryComponent = Database['public']['Tables']['salary_components']['Row'];
type SalaryComponentInsert = Database['public']['Tables']['salary_components']['Insert'];

interface Props {
  component: SalaryComponent | null;
  onClose: () => void;
}

export function SalaryComponentFormModal({ component, onClose }: Props) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!component;

  const [formData, setFormData] = useState({
    code: component?.code || '',
    name: component?.name || '',
    name_ar: component?.name_ar || '',
    component_type: component?.component_type || 'earning',
    calculation_type: component?.calculation_type || 'fixed',
    default_amount: component?.default_amount?.toString() || '0',
    percentage_of: component?.percentage_of || 'basic_salary',
    is_taxable: component?.is_taxable ?? true,
    is_recurring: component?.is_recurring ?? true,
    is_mandatory: component?.is_mandatory ?? false,
  });

  const saveMutation = useMutation({
    mutationFn: (data: SalaryComponentInsert) => {
      if (isEditing) {
        return payrollService.updateSalaryComponent(component.id, data);
      }
      return payrollService.createSalaryComponent(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.salaryComponents() });
      showToast(
        isEditing ? 'Component updated successfully' : 'Component created successfully',
        'success'
      );
      onClose();
    },
    onError: (error: unknown) => {
      showToast(error instanceof Error ? error.message : 'Failed to save component', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim() || !formData.name.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    const submitData: SalaryComponentInsert = {
      code: formData.code.toUpperCase().trim(),
      name: formData.name.trim(),
      name_ar: formData.name_ar.trim() || null,
      component_type: formData.component_type as SalaryComponentInsert['component_type'],
      calculation_type: formData.calculation_type as SalaryComponentInsert['calculation_type'],
      default_amount: parseFloat(formData.default_amount) || 0,
      percentage_of: formData.calculation_type === 'percentage' ? formData.percentage_of : null,
      is_taxable: formData.is_taxable,
      is_recurring: formData.is_recurring,
      is_mandatory: formData.is_mandatory,
      is_active: true,
    };

    saveMutation.mutate(submitData);
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Edit Salary Component' : 'Add Salary Component'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Code <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              placeholder="e.g., BASIC, HRA, PASI"
              disabled={isEditing}
              className="uppercase"
            />
            <p className="text-xs text-slate-500 mt-1">
              Unique identifier for the component
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Component Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.component_type}
              onChange={(e) => handleChange('component_type', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="earning">Earning</option>
              <option value="allowance">Allowance</option>
              <option value="bonus">Bonus</option>
              <option value="deduction">Deduction</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Basic Salary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Arabic Name
            </label>
            <Input
              value={formData.name_ar}
              onChange={(e) => handleChange('name_ar', e.target.value)}
              placeholder="e.g., الراتب الأساسي"
              dir="rtl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Calculation Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.calculation_type}
              onChange={(e) => handleChange('calculation_type', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Default Value
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.001"
                value={formData.default_amount}
                onChange={(e) => handleChange('default_amount', e.target.value)}
                placeholder="0"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                {formData.calculation_type === 'percentage' ? '%' : 'OMR'}
              </div>
            </div>
          </div>

          {formData.calculation_type === 'percentage' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Percentage Of
              </label>
              <select
                value={formData.percentage_of}
                onChange={(e) => handleChange('percentage_of', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="basic_salary">Basic Salary</option>
                <option value="gross_salary">Gross Salary</option>
              </select>
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.is_taxable}
              onChange={(e) => handleChange('is_taxable', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">Taxable</span>
              <p className="text-xs text-slate-500">Include in taxable income calculations</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.is_recurring}
              onChange={(e) => handleChange('is_recurring', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">Recurring</span>
              <p className="text-xs text-slate-500">Apply automatically every payroll period</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.is_mandatory}
              onChange={(e) => handleChange('is_mandatory', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">Mandatory</span>
              <p className="text-xs text-slate-500">Required component for all employees</p>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
