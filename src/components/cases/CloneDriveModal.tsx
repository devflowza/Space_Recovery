import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SearchableSelect } from '../ui/SearchableSelect';
import { SpaceInsufficientWarningModal } from './SpaceInsufficientWarningModal';
import { Copy, AlertCircle, HardDrive } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CloneDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseNo: string;
  patientDevices: Array<{ id: string; name: string; serial_no?: string }>;
  onSuccess?: () => void;
}

export const CloneDriveModal: React.FC<CloneDriveModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseNo,
  patientDevices,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showSpaceWarning, setShowSpaceWarning] = useState(false);
  const [spaceWarningData, setSpaceWarningData] = useState<{
    cloneId: string;
    totalCapacity: number;
    currentUsed: number;
    availableSpace: number;
    requiredSpace: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    patient_device_id: '',
    resource_clone_drive_id: '',
    storage_path: '',
    storage_server: '',
    storage_type: 'nas' as const,
    physical_location_id: '',
    image_format: 'dd' as const,
    image_size_gb: '',
    retention_days: '180',
    notes: '',
  });

  const [selectedResource, setSelectedResource] = useState<Record<string, unknown> | null>(null);

  const { data: companySettings } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('clone_defaults')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
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

  const { data: resourceCloneDrives = [] } = useQuery({
    queryKey: ['available_resource_clone_drives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_clone_drives')
        .select(`
          id,
          clone_id,
          brand,
          model,
          capacity,
          capacity_gb,
          current_used_gb,
          available_space_gb,
          serial_number,
          status,
          drive_type,
          interface_type,
          condition_rating,
          brands(name),
          capacities(name),
          device_types(name),
          device_interfaces(name)
        `)
        .eq('is_active', true)
        .order('clone_id');
      if (error) throw error;

      return data.map((drive: Record<string, unknown>) => ({
        ...drive,
        brand_name: drive.brands?.name || drive.brand,
        capacity_name: drive.capacities?.name || drive.capacity,
        device_type_name: drive.device_types?.name,
        interface_name: drive.device_interfaces?.name,
        capacity_gb: parseFloat(drive.capacity_gb) || 0,
        current_used_gb: parseFloat(drive.current_used_gb) || 0,
        available_space_gb: parseFloat(drive.available_space_gb) || 0,
      }));
    },
  });

  useEffect(() => {
    if (caseNo && !formData.storage_path) {
      const year = new Date().getFullYear();
      const defaultPath = `/Cases/${year}/${caseNo}`;
      setFormData((prev) => ({ ...prev, storage_path: defaultPath }));
    }
  }, [caseNo, formData.storage_path]);

  useEffect(() => {
    if (companySettings?.clone_defaults?.default_retention_days && isOpen) {
      const defaultRetention = companySettings.clone_defaults.default_retention_days.toString();
      setFormData((prev) => ({ ...prev, retention_days: defaultRetention }));
    }
  }, [companySettings, isOpen]);

  const createCloneMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const estimatedDeletionDate = new Date();
      estimatedDeletionDate.setDate(
        estimatedDeletionDate.getDate() + parseInt(data.retention_days || '180')
      );

      const { data: cloneData, error } = await supabase
        .from('clone_drives')
        .insert([
          {
            case_id: caseId,
            patient_device_id: data.patient_device_id,
            resource_clone_drive_id: data.resource_clone_drive_id || null,
            storage_path: data.storage_path,
            storage_server: data.storage_server || null,
            storage_type: data.storage_type,
            physical_location_id: data.physical_location_id || null,
            image_format: data.image_format,
            image_size_gb: data.image_size_gb ? parseFloat(data.image_size_gb) : 0,
            cloned_by: profile?.id,
            retention_days: parseInt(data.retention_days || '180'),
            estimated_deletion_date: estimatedDeletionDate.toISOString(),
            notes: data.notes || null,
            status: 'active',
          },
        ])
        .select();

      if (error) throw error;
      return cloneData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clone_drives', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
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

    if (!formData.patient_device_id) {
      setError('Please select a patient device');
      return;
    }

    if (!formData.storage_path) {
      setError('Storage path is required');
      return;
    }

    if (selectedResource && formData.image_size_gb && formData.resource_clone_drive_id) {
      const requiredSpace = parseFloat(formData.image_size_gb);
      const availableSpace = selectedResource.available_space_gb || 0;

      if (requiredSpace > availableSpace && requiredSpace > 0) {
        setSpaceWarningData({
          cloneId: selectedResource.clone_id,
          totalCapacity: selectedResource.capacity_gb || 0,
          currentUsed: selectedResource.current_used_gb || 0,
          availableSpace: availableSpace,
          requiredSpace: requiredSpace,
        });
        setShowSpaceWarning(true);
        return;
      }
    }

    createCloneMutation.mutate(formData);
  };

  const handleProceedWithWarning = () => {
    setShowSpaceWarning(false);
    const overrideNote = formData.notes
      ? `${formData.notes}\n\n[Override] Engineer proceeded despite insufficient space warning.`
      : '[Override] Engineer proceeded despite insufficient space warning.';
    createCloneMutation.mutate({ ...formData, notes: overrideNote });
  };

  const handleCancelWarning = () => {
    setShowSpaceWarning(false);
    setSpaceWarningData(null);
  };

  const handleClose = () => {
    const defaultRetention = companySettings?.clone_defaults?.default_retention_days?.toString() || '180';
    setFormData({
      patient_device_id: '',
      resource_clone_drive_id: '',
      storage_path: `/Cases/${new Date().getFullYear()}/${caseNo}`,
      storage_server: '',
      storage_type: 'nas',
      physical_location_id: '',
      image_format: 'dd',
      image_size_gb: '',
      retention_days: defaultRetention,
      notes: '',
    });
    setSelectedResource(null);
    setError(null);
    setShowSpaceWarning(false);
    setSpaceWarningData(null);
    onClose();
  };

  const handleResourceSelect = (resourceId: string) => {
    const resource = resourceCloneDrives.find(r => r.id === resourceId);
    setSelectedResource(resource || null);
    setFormData({ ...formData, resource_clone_drive_id: resourceId });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Clone Drive Record"
      icon={Copy}
      maxWidth="7xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-red-900 mb-0.5">Error</h4>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-slate-900 mb-2.5">
                Patient Device <span className="text-red-500">*</span>
              </h3>
              <SearchableSelect
                label=""
                options={patientDevices.map((device) => ({
                  id: device.id,
                  name: `${device.name}${device.serial_no ? ` (SN: ${device.serial_no})` : ''}`,
                }))}
                value={formData.patient_device_id}
                onChange={(value) =>
                  setFormData({ ...formData, patient_device_id: value })
                }
                placeholder="Select patient device"
                required
                clearable={false}
              />
            </div>

            <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
              <div className="flex items-center gap-2 mb-2.5">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-semibold text-slate-900">
                  Physical Clone Drive
                </h3>
              </div>
              <SearchableSelect
                label=""
                options={resourceCloneDrives.map((drive) => ({
                  id: drive.id,
                  name: `${drive.clone_id} - ${drive.brand_name || drive.brand || 'Unknown'} ${drive.model || ''} (${drive.capacity_name || drive.capacity || 'N/A'})${drive.status !== 'available' ? ` [${drive.status}]` : ''}`,
                }))}
                value={formData.resource_clone_drive_id}
                onChange={handleResourceSelect}
                placeholder="Select from resources"
                clearable={false}
              />
              <p className="text-[11px] text-slate-600 mt-1.5">
                Select a physical drive from your Resources inventory. If the drive you need is not listed, add it in Resources → Clone Drives first.
              </p>
            </div>
          </div>

          <div className="space-y-3 col-span-2">
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
              <h3 className="text-xs font-semibold text-slate-900 mb-2.5">
                Storage Location
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Storage Server"
                  value={formData.storage_server}
                  onChange={(e) =>
                    setFormData({ ...formData, storage_server: e.target.value })
                  }
                  placeholder="e.g., NAS-SERVER-01"
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Storage Type
                  </label>
                  <select
                    value={formData.storage_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        storage_type: e.target.value as typeof formData.storage_type,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="nas">NAS</option>
                    <option value="local">Local Storage</option>
                    <option value="external">External Drive</option>
                    <option value="cloud">Cloud Storage</option>
                    <option value="tape">Tape Backup</option>
                  </select>
                </div>
                <Input
                  label="Storage Path"
                  value={formData.storage_path}
                  onChange={(e) =>
                    setFormData({ ...formData, storage_path: e.target.value })
                  }
                  placeholder="/Cases/2025/C-2025-00123"
                />
                <div>
                  <SearchableSelect
                    label="Physical Location in Facility"
                    options={inventoryLocations.map((loc) => ({
                      id: loc.id,
                      name: loc.name,
                    }))}
                    value={formData.physical_location_id}
                    onChange={(value) =>
                      setFormData({ ...formData, physical_location_id: value })
                    }
                    placeholder="Select physical storage location"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedResource && (
          <div className="bg-white border-2 border-blue-300 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-blue-200">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Selected Drive Details</h3>
            </div>

            <div className="grid grid-cols-6 gap-2.5">
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="text-[10px] font-medium text-slate-500 mb-0.5">Clone ID</div>
                <div className="font-mono font-bold text-blue-700 text-xs">{selectedResource.clone_id}</div>
              </div>

              <div className="bg-slate-50 rounded-lg p-2">
                <div className="text-[10px] font-medium text-slate-500 mb-0.5">Brand</div>
                <div className="text-slate-900 font-semibold text-xs truncate">{selectedResource.brand_name || selectedResource.brand || 'N/A'}</div>
              </div>

              <div className="bg-slate-50 rounded-lg p-2">
                <div className="text-[10px] font-medium text-slate-500 mb-0.5">Type / Interface</div>
                <div className="text-slate-900 font-semibold text-xs truncate">
                  {selectedResource.device_type_name || selectedResource.drive_type?.toUpperCase() || 'N/A'} / {selectedResource.interface_name || selectedResource.interface_type?.toUpperCase() || 'N/A'}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-2">
                <div className="text-[10px] font-medium text-slate-500 mb-0.5">Capacity</div>
                <div className="text-slate-900 font-semibold text-xs">{selectedResource.capacity_name || selectedResource.capacity || 'N/A'}</div>
              </div>

              <div className="bg-slate-50 rounded-lg p-2">
                <div className="text-[10px] font-medium text-slate-500 mb-0.5">Condition</div>
                <div className="text-slate-900 font-semibold text-xs">{selectedResource.condition_rating}/5</div>
              </div>

              <div className="bg-slate-50 rounded-lg p-2">
                <div className="text-[10px] font-medium text-slate-500 mb-0.5">Status</div>
                <div className="text-slate-900 font-semibold text-xs capitalize">{selectedResource.status}</div>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2.5 mt-2.5">
              {selectedResource.serial_number && (
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-[10px] font-medium text-slate-500 mb-0.5">Serial Number</div>
                  <div className="font-mono text-slate-900 text-xs truncate">{selectedResource.serial_number}</div>
                </div>
              )}

              {selectedResource.capacity_gb > 0 && (
                <>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-2 border border-slate-200">
                    <div className="text-[10px] font-medium text-slate-600 mb-0.5">Total Capacity</div>
                    <div className="text-sm font-bold text-slate-900">
                      {selectedResource.capacity_gb >= 1024
                        ? `${(selectedResource.capacity_gb / 1024).toFixed(2)} TB`
                        : `${Math.round(selectedResource.capacity_gb)} GB`}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 border border-blue-200">
                    <div className="text-[10px] font-medium text-blue-700 mb-0.5">Used Space</div>
                    <div className="text-sm font-bold text-blue-600">
                      {selectedResource.current_used_gb >= 1024
                        ? `${(selectedResource.current_used_gb / 1024).toFixed(2)} TB`
                        : `${Math.round(selectedResource.current_used_gb)} GB`}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 border border-green-200">
                    <div className="text-[10px] font-medium text-green-700 mb-0.5">Available Space</div>
                    <div className="text-sm font-bold text-green-600">
                      {selectedResource.available_space_gb >= 1024
                        ? `${(selectedResource.available_space_gb / 1024).toFixed(2)} TB`
                        : `${Math.round(selectedResource.available_space_gb)} GB`}
                    </div>
                  </div>
                  <div className="col-span-2 bg-white rounded-lg p-2 border border-slate-200 flex flex-col justify-center">
                    <div className="flex justify-between text-[10px] text-slate-600 mb-0.5">
                      <span className="font-medium">Storage Utilization</span>
                      <span className="font-semibold">
                        {selectedResource.capacity_gb > 0
                          ? `${((selectedResource.current_used_gb / selectedResource.capacity_gb) * 100).toFixed(1)}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all"
                        style={{
                          width: `${selectedResource.capacity_gb > 0 ? (selectedResource.current_used_gb / selectedResource.capacity_gb) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Image Format
            </label>
            <select
              value={formData.image_format}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  image_format: e.target.value as typeof formData.image_format,
                })
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="dd">DD (Raw)</option>
              <option value="e01">E01 (EnCase)</option>
              <option value="raw">RAW</option>
              <option value="aff">AFF</option>
              <option value="proprietary">Proprietary</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-span-2">
            <Input
              label="Image Size (GB)"
              type="number"
              step="0.01"
              value={formData.image_size_gb}
              onChange={(e) =>
                setFormData({ ...formData, image_size_gb: e.target.value })
              }
              placeholder="0"
            />
          </div>
          <Input
            label="Retention Days"
            type="number"
            value={formData.retention_days}
            onChange={(e) =>
              setFormData({ ...formData, retention_days: e.target.value })
            }
            placeholder="180"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes about this clone..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createCloneMutation.isPending}
          >
            {createCloneMutation.isPending ? 'Creating...' : 'Create Clone Record'}
          </Button>
        </div>
      </form>

      {spaceWarningData && (
        <SpaceInsufficientWarningModal
          isOpen={showSpaceWarning}
          onClose={handleCancelWarning}
          onProceed={handleProceedWithWarning}
          cloneId={spaceWarningData.cloneId}
          totalCapacity={spaceWarningData.totalCapacity}
          currentUsed={spaceWarningData.currentUsed}
          availableSpace={spaceWarningData.availableSpace}
          requiredSpace={spaceWarningData.requiredSpace}
        />
      )}
    </Modal>
  );
};
