import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SearchableSelect } from '../ui/SearchableSelect';
import { HardDrive, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ResourceCloneDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDrive?: Record<string, unknown>;
  onSuccess?: () => void;
}

export const ResourceCloneDriveModal: React.FC<ResourceCloneDriveModalProps> = ({
  isOpen,
  onClose,
  editingDrive,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    serial_number: editingDrive?.serial_number || '',
    brand_id: editingDrive?.brand_id || '',
    model: editingDrive?.model || '',
    capacity_id: editingDrive?.capacity_id || '',
    device_type_id: editingDrive?.device_type_id || '',
    interface_id: editingDrive?.interface_id || '',
    purchase_date: editingDrive?.purchase_date || '',
    purchase_cost: editingDrive?.purchase_cost || '',
    vendor: editingDrive?.vendor || '',
    warranty_expiry: editingDrive?.warranty_expiry || '',
    status: editingDrive?.status || 'available',
    condition_id: editingDrive?.condition_id || '',
    storage_location_id: editingDrive?.storage_location_id || '',
    physical_location_notes: editingDrive?.physical_location_notes || '',
    notes: editingDrive?.notes || '',
  });

  const { data: inventoryLocations = [] } = useQuery({
    queryKey: ['inventory_locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_locations')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog_device_brands')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: capacities = [] } = useQuery({
    queryKey: ['capacities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog_device_capacities')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: deviceTypes = [] } = useQuery({
    queryKey: ['device_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog_device_types')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: deviceInterfaces = [] } = useQuery({
    queryKey: ['device_interfaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog_device_interfaces')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: deviceConditions = [] } = useQuery({
    queryKey: ['device_conditions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog_device_conditions')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        serial_number: data.serial_number || null,
        brand_id: data.brand_id || null,
        model: data.model || null,
        capacity_id: data.capacity_id || null,
        device_type_id: data.device_type_id || null,
        interface_id: data.interface_id || null,
        purchase_date: data.purchase_date || null,
        purchase_cost: data.purchase_cost ? parseFloat(data.purchase_cost) : 0,
        vendor: data.vendor || null,
        warranty_expiry: data.warranty_expiry || null,
        status: data.status,
        condition_id: data.condition_id || null,
        storage_location_id: data.storage_location_id || null,
        physical_location_notes: data.physical_location_notes || null,
        notes: data.notes || null,
        created_by: profile?.id,
      };

      if (editingDrive) {
        const { error } = await supabase
          .from('resource_clone_drives')
          .update(payload)
          .eq('id', editingDrive.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('resource_clone_drives')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource_clone_drives'] });
      onSuccess?.();
      handleClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.brand_id && !formData.model && !formData.serial_number) {
      setError('Please provide at least Brand, Model, or Serial Number');
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({
      serial_number: '',
      brand_id: '',
      model: '',
      capacity_id: '',
      device_type_id: '',
      interface_id: '',
      purchase_date: '',
      purchase_cost: '',
      vendor: '',
      warranty_expiry: '',
      status: 'available',
      condition_id: '',
      storage_location_id: '',
      physical_location_notes: '',
      notes: '',
    });
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingDrive ? `Edit Clone Drive ${editingDrive.clone_id}` : 'Add Clone Drive to Resources'}
      icon={HardDrive}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-900 mb-1">Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {editingDrive && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">
                Clone ID: {editingDrive.clone_id}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
              Drive Specifications
            </h3>

            <Input
              label="Serial Number"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              placeholder="e.g., WD-WCAV12345678"
            />

            <SearchableSelect
              label="Brand"
              options={brands.map((brand) => ({
                id: brand.id.toString(),
                name: brand.name,
              }))}
              value={formData.brand_id}
              onChange={(value) => setFormData({ ...formData, brand_id: value })}
              placeholder="Select brand"
            />

            <Input
              label="Model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="e.g., WD10EZEX"
            />

            <SearchableSelect
              label="Capacity"
              options={capacities.map((cap) => ({
                id: cap.id.toString(),
                name: cap.name,
              }))}
              value={formData.capacity_id}
              onChange={(value) => setFormData({ ...formData, capacity_id: value })}
              placeholder="Select capacity"
            />

            <div className="grid grid-cols-2 gap-4">
              <SearchableSelect
                label="Device Type"
                options={deviceTypes.map((type) => ({
                  id: type.id.toString(),
                  name: type.name,
                }))}
                value={formData.device_type_id}
                onChange={(value) => setFormData({ ...formData, device_type_id: value })}
                placeholder="Select device type"
              />

              <SearchableSelect
                label="Interface"
                options={deviceInterfaces.map((iface) => ({
                  id: iface.id.toString(),
                  name: iface.name,
                }))}
                value={formData.interface_id}
                onChange={(value) => setFormData({ ...formData, interface_id: value })}
                placeholder="Select interface"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
              Status & Location
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">Available</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                  <option value="lost">Lost</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>

              <SearchableSelect
                label="Condition Rating"
                options={deviceConditions.map((condition) => ({
                  id: condition.id.toString(),
                  name: condition.name,
                }))}
                value={formData.condition_id}
                onChange={(value) => setFormData({ ...formData, condition_id: value })}
                placeholder="Select condition"
              />
            </div>

            <SearchableSelect
              label="Storage Location"
              options={inventoryLocations.map((loc) => ({
                id: loc.id,
                name: loc.name,
              }))}
              value={formData.storage_location_id}
              onChange={(value) => setFormData({ ...formData, storage_location_id: value })}
              placeholder="Select physical location"
            />

            <Input
              label="Location Notes"
              value={formData.physical_location_notes}
              onChange={(e) => setFormData({ ...formData, physical_location_notes: e.target.value })}
              placeholder="e.g., Shelf A3, Bay 5"
            />

            <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 pt-4">
              Purchase Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Purchase Date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              />
              <Input
                label="Purchase Cost"
                type="number"
                step="0.01"
                value={formData.purchase_cost}
                onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <Input
              label="Vendor"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="e.g., Tech Supplier Inc."
            />

            <Input
              label="Warranty Expiry"
              type="date"
              value={formData.warranty_expiry}
              onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional information about this drive..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
            {saveMutation.isPending
              ? editingDrive ? 'Updating...' : 'Adding...'
              : editingDrive ? 'Update Drive' : 'Add Drive'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
