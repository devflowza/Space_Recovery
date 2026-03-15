import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { payrollService } from '../../lib/payrollService';
import { payrollKeys } from '../../lib/queryKeys';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabaseClient';

interface Props {
  onClose: () => void;
}

export function AdjustmentFormModal({ onClose }: Props) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employee_id: '',
    adjustment_type: 'bonus',
    amount: '',
    is_deduction: false,
    description: '',
    effective_date: new Date().toISOString().split('T')[0],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_number')
        .eq('employment_status', 'active')
        .is('deleted_at', null)
        .order('first_name');

      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => payrollService.createPayrollAdjustment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.adjustments({}) });
      showToast('Adjustment created successfully', 'success');
      onClose();
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to create adjustment', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employee_id || !formData.amount || !formData.description.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    saveMutation.mutate({
      employee_id: formData.employee_id,
      adjustment_type: formData.adjustment_type,
      amount: parseFloat(formData.amount),
      is_deduction: formData.is_deduction,
      description: formData.description.trim(),
      effective_date: formData.effective_date,
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const employeeOptions = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.first_name} ${emp.last_name} (${emp.employee_number})`,
  }));

  return (
    <Modal isOpen onClose={onClose} title="Add Payroll Adjustment">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Employee <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={employeeOptions}
            value={formData.employee_id}
            onChange={(value) => handleChange('employee_id', value)}
            placeholder="Select employee..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.adjustment_type}
              onChange={(e) => handleChange('adjustment_type', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="bonus">Bonus</option>
              <option value="commission">Commission</option>
              <option value="advance">Salary Advance</option>
              <option value="penalty">Penalty</option>
              <option value="reimbursement">Reimbursement</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Effective Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={formData.effective_date}
              onChange={(e) => handleChange('effective_date', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Amount (OMR) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step="0.001"
            value={formData.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            placeholder="0.000"
          />
        </div>

        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.is_deduction}
              onChange={(e) => handleChange('is_deduction', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">This is a deduction</span>
              <p className="text-xs text-slate-500">
                Check this if the amount should be deducted from the employee's salary
              </p>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Enter reason for adjustment..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Creating...' : 'Create Adjustment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
