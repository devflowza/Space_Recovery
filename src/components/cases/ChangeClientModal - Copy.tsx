import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SearchableSelect } from '../ui/SearchableSelect';
import { User, Mail, Phone, Hash } from 'lucide-react';

interface ChangeClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCustomer: {
    id: string;
    customer_name: string;
    email?: string;
    mobile_number?: string;
    customer_number: string;
  } | null;
  onConfirm: (newCustomerId: string) => void;
  isLoading?: boolean;
}

export const ChangeClientModal: React.FC<ChangeClientModalProps> = ({
  isOpen,
  onClose,
  currentCustomer,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers_enhanced')
        .select('id, customer_number, customer_name, email, mobile_number, city, country')
        .eq('is_active', true)
        .order('customer_name');

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  const handleConfirm = () => {
    if (selectedCustomerId && selectedCustomerId !== currentCustomer?.id) {
      onConfirm(selectedCustomerId);
    }
  };

  const customerOptions = customers.map((customer) => ({
    id: customer.id,
    name: `${customer.customer_name} - ${customer.customer_number}`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Client"
      size="md"
    >
      <div className="space-y-6">
        {/* Current Client Info */}
        {currentCustomer && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Current Client
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-3 h-3 text-blue-600" />
                <span className="text-blue-900 font-medium">{currentCustomer.customer_number}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-3 h-3 text-blue-600" />
                <span className="text-blue-900 font-semibold">{currentCustomer.customer_name}</span>
              </div>
              {currentCustomer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-3 h-3 text-blue-600" />
                  <span className="text-blue-700">{currentCustomer.email}</span>
                </div>
              )}
              {currentCustomer.mobile_number && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-3 h-3 text-blue-600" />
                  <span className="text-blue-700">{currentCustomer.mobile_number}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Client Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Select New Client
          </label>
          <SearchableSelect
            label=""
            options={customerOptions}
            value={selectedCustomerId}
            onChange={(value) => setSelectedCustomerId(value)}
            placeholder="Search by name or customer number..."
            required={false}
            disabled={customersLoading}
          />
          <p className="text-xs text-slate-500 mt-2">
            Search and select the new client for this case
          </p>
        </div>

        {/* Warning Message */}
        {selectedCustomerId && selectedCustomerId !== currentCustomer?.id && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-900">
              <strong>Note:</strong> Changing the client will update this case's customer information.
              This action will be logged in the case history.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedCustomerId || selectedCustomerId === currentCustomer?.id || isLoading}
            style={{ backgroundColor: '#3b82f6' }}
          >
            {isLoading ? 'Changing Client...' : 'Change Client'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
