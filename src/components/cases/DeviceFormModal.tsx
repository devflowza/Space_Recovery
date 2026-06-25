import React, { useState, useEffect, useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SearchableSelect } from '../ui/SearchableSelect';
import { HardDrive, Eye, EyeOff, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { diagnosticsService } from '../../lib/diagnosticsService';
import { setPrimaryDevice } from '../../lib/deviceService';
import { logger } from '../../lib/logger';
import type { Database } from '../../types/database.types';
import { DeviceDetailsForm } from './device-form/DeviceDetailsForm';
import { useDeviceFormCatalogs } from '../../lib/devices/deviceCatalogQueries';
import {
  hydrateDeviceForm,
  serializeDeviceForm,
  validateDeviceForm,
  type LoadedDevice,
} from '../../lib/devices/deviceFormSerialization';
import { BASIC_FIELDS, getDeviceFamilyConfig } from '../../lib/devices/deviceFieldConfig';
import { resolveDeviceFamily } from '../../lib/devices/deviceFamily';

type CaseDeviceInsert = Database['public']['Tables']['case_devices']['Insert'];
type CaseDeviceUpdate = Database['public']['Tables']['case_devices']['Update'];

// Shape of `deviceData` accepted by this modal. Editing flow passes a row from
// `case_devices` (uuid id, bigint device_role_id, uuid FK columns, etc.). The
// optional shape keeps the prop tolerant of partial rows from callers; the modal
// re-fetches the full row on edit so dynamic technical fields hydrate correctly.
export interface DeviceFormDeviceData {
  id?: string;
  device_role_id?: number | string | null;
  device_type_id?: string | null;
  brand_id?: string | null;
  model?: string | null;
  serial_number?: string | null;
  capacity_id?: string | null;
  condition_id?: string | null;
  accessories?: string[] | null;
  symptoms?: string | null;
  notes?: string | null;
  password?: string | null;
  encryption_id?: string | null;
  is_primary?: boolean | null;
  role_notes?: string | null;
}

interface DeviceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  deviceData?: DeviceFormDeviceData | null;
  onSuccess: () => void;
}

export const DeviceFormModal: React.FC<DeviceFormModalProps> = ({
  isOpen,
  onClose,
  caseId,
  deviceData,
  onSuccess,
}) => {
  const isEditMode = !!deviceData;
  const { profile } = useAuth();
  const toast = useToast();
  const passwordId = useId();
  const symptomsId = useId();
  const recoveryNotesId = useId();
  const roleNotesId = useId();

  // Structural fields owned by this modal (role gate, donor sourcing, custody/
  // recovery context). Device identity + technical/diagnostic fields are owned by
  // <DeviceDetailsForm> and live in `detailState`.
  const [formData, setFormData] = useState({
    device_role_id: '',
    symptoms: '',
    recovery_notes: '',
    password: '',
    is_primary: false,
    role_notes: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [selectedDonorInventoryId, setSelectedDonorInventoryId] = useState('');

  // Dynamic per-family device form state. `detailState` is ALWAYS derived via
  // hydrateDeviceForm (loads every ALL_FIELD_DEFS key) so serialize never NULLs a
  // hidden-family column. `loadedRef` is the same {device, diagnostics} we
  // hydrated from and is passed back to serializeDeviceForm to preserve hidden
  // technical_details/result keys.
  const { options: deviceCatalogs } = useDeviceFormCatalogs();
  const [detailState, setDetailState] = useState<Record<string, unknown>>(
    () => hydrateDeviceForm({ device: {}, diagnostics: null }),
  );
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [loadedRef, setLoadedRef] = useState<LoadedDevice>({ device: {}, diagnostics: null });
  const onDetailChange = (key: string, value: unknown) =>
    setDetailState(prev => ({ ...prev, [key]: value }));

  const { data: deviceRoles = [] } = useQuery({
    queryKey: ['device_roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog_device_roles')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: donorInventory = [] } = useQuery({
    queryKey: ['donor_inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          id,
          name,
          serial_number,
          model,
          quantity,
          purchase_price,
          brand_id,
          capacity_id,
          brand:catalog_device_brands(name),
          capacity:catalog_device_capacities(name)
        `)
        .eq('is_donor', true)
        .gt('quantity', 0)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // Load device + diagnostics and hydrate the dynamic form. On edit we fetch the
  // FULL case_devices row (deviceData may be partial) so technical_details/dom/
  // part_number/dcm hydrate; on add we start from an empty hydrated state.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (deviceData?.id) {
        const [{ data: fullRow }, diagnosticsRow] = await Promise.all([
          supabase
            .from('case_devices')
            .select('*')
            .eq('id', deviceData.id)
            .is('deleted_at', null)
            .maybeSingle(),
          diagnosticsService
            .getDiagnosticsWithDevice(deviceData.id)
            .catch((error) => {
              logger.error('Error loading diagnostics:', error);
              return null;
            }),
        ]);

        if (cancelled) return;

        const device = (fullRow ?? {}) as Record<string, unknown>;
        const diagnostics =
          (diagnosticsRow?.result as Record<string, unknown> | undefined) ?? null;
        const loaded: LoadedDevice = { device, diagnostics };
        setLoadedRef(loaded);
        setDetailState(hydrateDeviceForm(loaded));
        setDetailErrors({});

        const src = (fullRow ?? deviceData) as DeviceFormDeviceData;
        setFormData({
          device_role_id: src.device_role_id != null ? src.device_role_id.toString() : '',
          symptoms: src.symptoms ?? '',
          recovery_notes: src.notes ?? '',
          password: src.password ?? '',
          is_primary: src.is_primary ?? false,
          role_notes: src.role_notes ?? '',
        });
        setSelectedDonorInventoryId('');
      } else {
        const loaded: LoadedDevice = { device: {}, diagnostics: null };
        setLoadedRef(loaded);
        setDetailState(hydrateDeviceForm(loaded));
        setDetailErrors({});
        setFormData({
          device_role_id: '',
          symptoms: '',
          recovery_notes: '',
          password: '',
          is_primary: false,
          role_notes: '',
        });
        setSelectedDonorInventoryId('');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [deviceData]);

  // Default new devices to the Patient role once the role catalog has loaded,
  // without clobbering a role the user already picked.
  useEffect(() => {
    if (deviceData) return;
    const patientRole = deviceRoles.find(r => r.name.toLowerCase() === 'patient');
    if (patientRole?.id != null) {
      setFormData(prev =>
        prev.device_role_id ? prev : { ...prev, device_role_id: patientRole.id.toString() },
      );
    }
  }, [deviceData, deviceRoles]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const selectedRole = deviceRoles.find(
        r => r.id != null && r.id.toString() === formData.device_role_id,
      );
      const submitIsDonorRole = selectedRole?.name.toLowerCase() === 'donor';

      const typeName =
        deviceCatalogs.device_types?.find(o => o.id === detailState.device_type_id)?.name ?? '';
      const family = resolveDeviceFamily(typeName);

      // Validate the visible dynamic fields (Basic + current family Technical).
      // Donor identity is sourced from inventory, so the dynamic-form requireds
      // (e.g. Device Type) do not apply to donor devices.
      if (!submitIsDonorRole) {
        const visible = [...BASIC_FIELDS, ...getDeviceFamilyConfig(family).technical];
        const { ok, errors } = validateDeviceForm(detailState, visible);
        setDetailErrors(errors);
        if (!ok) {
          setIsSubmitting(false);
          return;
        }
      } else {
        setDetailErrors({});
      }

      // Serialize from the hydrated state + the row we hydrated from (loadedRef) so
      // hidden-family technical_details/result keys are preserved, never NULLed.
      const { devicePatch, diagnosticsPatch, hasDiagnostics } = serializeDeviceForm(
        detailState,
        loadedRef,
      );

      // Structural fields owned by the modal (unchanged behavior across roles).
      const structural: Record<string, unknown> = {
        case_id: caseId,
        tenant_id: profile?.tenant_id ?? '',
        device_role_id: formData.device_role_id ? Number(formData.device_role_id) : null,
        password: formData.password || null,
        role_notes: formData.role_notes || null,
        symptoms: formData.symptoms || null,
        notes: formData.recovery_notes || null,
      };

      // Donor role sources Basic identity from the selected inventory item; this
      // override wins over the dynamic-form values (preserves existing behavior).
      let devicePayload: Record<string, unknown> = { ...structural, ...devicePatch };
      if (submitIsDonorRole && selectedDonorInventoryId) {
        const donor = donorInventory.find(d => d.id === selectedDonorInventoryId);
        if (donor) {
          devicePayload = {
            ...devicePayload,
            brand_id: donor.brand_id ?? null,
            model: donor.model ?? null,
            serial_number: donor.serial_number ?? null,
            capacity_id: donor.capacity_id ?? null,
          };
        }
      }

      let deviceId: string | undefined = deviceData?.id;

      if (isEditMode && deviceData?.id) {
        const { error } = await supabase
          .from('case_devices')
          .update(devicePayload as CaseDeviceUpdate)
          .eq('id', deviceData.id);

        if (error) throw error;
      } else {
        const insertPayload = {
          ...devicePayload,
          created_by: profile?.id ?? null,
        } as CaseDeviceInsert;
        const { data: insertedDevice, error } = await supabase
          .from('case_devices')
          .insert([insertPayload])
          .select('id')
          .maybeSingle();

        if (error) throw error;
        deviceId = insertedDevice?.id;
      }

      if (formData.is_primary && deviceId) {
        await setPrimaryDevice(deviceId, caseId);
      }

      if (submitIsDonorRole && selectedDonorInventoryId && deviceId) {
        const donor = donorInventory.find(d => d.id === selectedDonorInventoryId);
        if (donor) {
          const { error: assignmentError } = await supabase
            .from('inventory_case_assignments')
            .insert([{
              tenant_id: profile?.tenant_id ?? '',
              item_id: selectedDonorInventoryId,
              case_id: caseId,
              assigned_by: profile?.id ?? null,
              purpose: 'donor_part',
              notes: `Donor for case device ${deviceId}`,
            }]);

          if (assignmentError) {
            logger.error('Error creating inventory case assignment:', assignmentError);
          }
        }
      }

      // Persist component diagnostics for ANY role (patient-only gate removed). The
      // serializer reports whether any inspection field carries a value; the legacy
      // 4-value category is computed fresh from the current device type at save.
      if (deviceId && hasDiagnostics) {
        try {
          const category = diagnosticsService.determineDeviceCategory(typeName);
          await diagnosticsService.upsertDeviceDiagnostics({
            case_device_id: deviceId,
            ...diagnosticsPatch,
            device_type_category: category,
          } as Parameters<typeof diagnosticsService.upsertDeviceDiagnostics>[0]);
        } catch (error) {
          logger.error('Error saving diagnostics:', error);
          // The device record itself saved; surface the inspection-save failure
          // loudly rather than swallowing it (a silent drop reads as success
          // while the technician's findings are lost).
          toast.error(
            `Device saved, but the inspection/diagnostics did NOT save: ${
              error instanceof Error ? error.message : 'unknown error'
            }. Re-open the device and retry.`
          );
        }
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      logger.error('Error saving device:', error);
      toast.error(`Failed to save device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deviceData?.id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('case_devices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deviceData.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error: unknown) {
      logger.error('Error deleting device:', error);
      toast.error(`Failed to delete device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  const selectedRole = deviceRoles.find(r => r.id != null && r.id.toString() === formData.device_role_id);
  const roleName = selectedRole?.name.toLowerCase() || '';
  const isPatientRole = roleName === 'patient';
  const isDonorRole = roleName === 'donor';

  const availableDeviceRoles = deviceRoles.filter(r => r.name.toLowerCase() !== 'clone');

  const isFormValid = !!formData.device_role_id && (
    isDonorRole
      ? !!selectedDonorInventoryId
      : (!!detailState.device_type_id || !!detailState.serial_number)
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit Device' : 'Add Device'} maxWidth="4xl" closeOnBackdrop={false}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4 p-4 bg-slate-50 rounded-lg">
            <HardDrive className="w-5 h-5 text-warning" />
            <div>
              <h3 className="font-semibold text-slate-900">
                {isEditMode ? 'Update Device Information' : 'Add New Device to Case'}
              </h3>
              <p className="text-sm text-slate-600">
                {isEditMode ? 'Modify the device details below' : 'Fill in the device details to add it to this case'}
              </p>
            </div>
          </div>

          <SearchableSelect
            label="Device Role"
            value={formData.device_role_id}
            onChange={(value) => {
              const role = deviceRoles.find(r => r.id != null && r.id.toString() === value);
              const newRoleName = role?.name.toLowerCase() || '';

              setFormData({
                ...formData,
                device_role_id: value,
                is_primary: newRoleName === 'patient' ? formData.is_primary : false,
                symptoms: newRoleName === 'backup' ? '' : formData.symptoms,
                recovery_notes: newRoleName === 'backup' ? '' : formData.recovery_notes,
              });

              if (newRoleName === 'donor') {
                setSelectedDonorInventoryId('');
              }
            }}
            options={availableDeviceRoles.map(r => ({ id: r.id.toString(), name: r.name }))}
            placeholder="Select device role..."
            required
            clearable={false}
          />

          {isDonorRole && (
            <SearchableSelect
              label="Select Donor from Inventory"
              value={selectedDonorInventoryId}
              onChange={setSelectedDonorInventoryId}
              options={donorInventory.map(d => ({
                id: d.id,
                name: `${d.name}${d.model ? ` - ${d.model}` : ''}${d.serial_number ? ` (S/N: ${d.serial_number})` : ''} - Available: ${d.quantity}`,
              }))}
              placeholder="Select donor device from inventory..."
              required
              clearable={false}
            />
          )}

          {/* Dynamic per-family device details (identity + technical + component
              diagnostics). Donor devices source identity from inventory above and
              therefore do not show the dynamic form (preserves prior behavior). */}
          {!isDonorRole && (
            <DeviceDetailsForm
              state={detailState}
              onChange={onDetailChange}
              options={deviceCatalogs}
              errors={detailErrors}
            />
          )}

          {isPatientRole && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_primary}
                onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-slate-700">
                Mark as Primary Device
              </span>
            </label>
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Advanced Options
            </button>
          </div>

          {showAdvancedOptions && (
            <div className="space-y-4">
              <div>
                <label htmlFor={passwordId} className="block text-sm font-medium text-slate-700 mb-2">
                  Device Password
                </label>
                <div className="flex items-center gap-2">
                  <form className="contents" onSubmit={(e) => e.preventDefault()}>
                    <input
                      id={passwordId}
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter device password if applicable..."
                      autoComplete="off"
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </form>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {isPatientRole && (
                <>
                  <div>
                    <label htmlFor={symptomsId} className="block text-sm font-medium text-slate-700 mb-2">
                      Device Problem
                    </label>
                    <textarea
                      id={symptomsId}
                      value={formData.symptoms}
                      onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                      placeholder="Describe the device problem or symptoms..."
                      rows={2}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor={recoveryNotesId} className="block text-sm font-medium text-slate-700 mb-2">
                      Recovery Requirements
                    </label>
                    <textarea
                      id={recoveryNotesId}
                      value={formData.recovery_notes}
                      onChange={(e) => setFormData({ ...formData, recovery_notes: e.target.value })}
                      placeholder="Specify what data needs to be recovered..."
                      rows={2}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor={roleNotesId} className="block text-sm font-medium text-slate-700 mb-2">
                  Role-Specific Notes
                </label>
                <textarea
                  id={roleNotesId}
                  value={formData.role_notes}
                  onChange={(e) => setFormData({ ...formData, role_notes: e.target.value })}
                  placeholder="Additional notes specific to this device role..."
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <div>
              {isEditMode && (
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-danger-muted text-danger hover:bg-danger/15"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Device
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                style={{ backgroundColor: 'rgb(var(--color-success))' }}
              >
                {isSubmitting ? 'Saving...' : isEditMode ? 'Update Device' : 'Add Device'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Device"
      >
        <div className="space-y-4">
          <p className="text-slate-700">
            Are you sure you want to delete this device? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-danger hover:bg-danger/90 text-danger-foreground"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Device'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
