import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { createPayment } from '@/lib/paymentsService';
import { deleteCaseService } from '@/lib/caseService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { logger } from '../../../lib/logger';

interface UseCaseMutationsParams {
  id: string | undefined;
  caseData: any;
  devices: any[];
  modals: {
    setNewNote: (v: string) => void;
    setShowRecordPaymentModal: (v: boolean) => void;
    setSelectedInvoiceForPayment: (v: any) => void;
    setShowMarkAsDeliveredModal: (v: boolean) => void;
    setSelectedClone: (v: any) => void;
    setShowPreserveLongTermModal: (v: boolean) => void;
    setShowDuplicateModal: (v: boolean) => void;
    setShowDeleteModal: (v: boolean) => void;
  };
}

export function useCaseMutations({ id, caseData, devices, modals }: UseCaseMutationsParams) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();

  const addNoteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      const { error } = await supabase
        .from('case_internal_notes')
        .insert({
          case_id: id,
          author_id: profile?.id,
          note_text: noteText,
          private: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case_notes', id] });
      modals.setNewNote('');
    },
  });

  const updateCaseStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { data, error } = await supabase
        .from('cases')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) {
        logger.error('Error updating status:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case_history', id] });
    },
    onError: (error) => {
      logger.error('Status update failed:', error);
      toast.error('Failed to update status. Please try again.');
    },
  });

  const updateCasePriorityMutation = useMutation({
    mutationFn: async (newPriority: string) => {
      const { data, error } = await supabase
        .from('cases')
        .update({ priority: newPriority, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) {
        logger.error('Error updating priority:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case_history', id] });
    },
    onError: (error) => {
      logger.error('Priority update failed:', error);
      toast.error('Failed to update priority. Please try again.');
    },
  });

  const updateAssignedEngineerMutation = useMutation({
    mutationFn: async (newEngineerId: string | null) => {
      const { data, error } = await supabase
        .from('cases')
        .update({ assigned_engineer_id: newEngineerId, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) {
        logger.error('Error updating assigned engineer:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case_history', id] });
    },
    onError: (error) => {
      logger.error('Assigned engineer update failed:', error);
      toast.error('Failed to update assigned engineer. Please try again.');
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async ({
      paymentData,
      allocations,
    }: {
      paymentData: Omit<import('@/lib/paymentsService').Payment, 'id' | 'payment_number' | 'created_at' | 'updated_at'>;
      allocations: Array<{ invoice_id: string; amount: number }>;
    }) => {
      return createPayment(paymentData, allocations);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'case', id] });
      queryClient.invalidateQueries({ queryKey: ['case_financial_summary', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      modals.setShowRecordPaymentModal(false);
      modals.setSelectedInvoiceForPayment(null);
    },
  });

  const updateCaseInfoMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from('cases')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  const updateDeviceInfoMutation = useMutation({
    mutationFn: async ({ deviceId, updates }: { deviceId: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('case_devices')
        .update(updates)
        .eq('id', deviceId);

      if (error) {
        logger.error('Error updating device:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case_devices', id] });
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  const updateCustomerInfoMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from('customers_enhanced')
        .update(updates)
        .eq('id', caseData?.customer_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
    },
  });

  const markAsDeliveredMutation = useMutation({
    mutationFn: async ({ cloneId, updateCaseStatus, deliveryNotes, retentionDays }: { cloneId: string; updateCaseStatus: boolean; deliveryNotes: string; retentionDays: number }) => {
      const deliveryDate = new Date();
      const retentionDeadline = new Date(deliveryDate.getTime() + retentionDays * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('clone_drives')
        .update({
          status: 'delivered',
          retention_days: retentionDays,
          delivered_date: deliveryDate.toISOString(),
          delivered_by: profile?.id,
          retention_deadline: retentionDeadline.toISOString(),
          notes: deliveryNotes || null,
        })
        .eq('id', cloneId);

      if (error) throw error;

      if (updateCaseStatus && id) {
        const { error: caseError } = await supabase
          .from('cases')
          .update({ status: 'Delivered' })
          .eq('id', id);

        if (caseError) throw caseError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['clone_drives', id] });
      queryClient.invalidateQueries({ queryKey: ['resource_clone_drives'] });
      modals.setShowMarkAsDeliveredModal(false);
      modals.setSelectedClone(null);
    },
  });

  const preserveLongTermMutation = useMutation({
    mutationFn: async ({ cloneId, preserveReason }: { cloneId: string; preserveReason: string }) => {
      const { error } = await supabase
        .from('clone_drives')
        .update({
          status: 'preserved',
          preserve_reason: preserveReason,
        })
        .eq('id', cloneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clone_drives', id] });
      queryClient.invalidateQueries({ queryKey: ['resource_clone_drives'] });
      modals.setShowPreserveLongTermModal(false);
      modals.setSelectedClone(null);
    },
  });

  const duplicateCaseMutation = useMutation({
    mutationFn: async () => {
      const { data: nextCaseNumber, error: numberError } = await supabase
        .rpc('get_next_case_number');

      if (numberError) {
        logger.error('Error getting next case number:', numberError);
        throw new Error('Failed to get next case number');
      }

      const newCaseData: Record<string, unknown> = {
        case_no: nextCaseNumber,
        customer_id: caseData!.customer_id,
        service_type_id: caseData!.service_type_id,
        priority: caseData!.priority,
        status: 'Received',
        client_reference: caseData!.case_no,
        title: caseData!.title,
        summary: caseData!.summary,
        important_data: caseData!.important_data,
        accessories: caseData!.accessories,
        created_by: profile?.id,
      };

      if (caseData!.contact_id) {
        newCaseData.contact_id = caseData!.contact_id;
      }
      if (caseData!.assigned_engineer_id) {
        newCaseData.assigned_engineer_id = caseData!.assigned_engineer_id;
      }
      if (caseData!.company_id) {
        newCaseData.company_id = caseData!.company_id;
      }

      const { data: newCase, error: caseError } = await supabase
        .from('cases')
        .insert(newCaseData)
        .select()
        .single();

      if (caseError) {
        logger.error('Error creating duplicate case:', caseError);
        throw new Error(`Failed to duplicate case: ${caseError.message}`);
      }

      if (devices && devices.length > 0) {
        const devicesToInsert = devices.map(device => ({
          case_id: newCase.id,
          device_type_id: device.device_type_id,
          brand_id: device.brand_id,
          model: device.model,
          serial_no: device.serial_no,
          capacity_id: device.capacity_id,
          condition_id: device.condition_id,
          accessories: device.accessories,
          device_problem: device.device_problem,
          recovery_requirements: device.recovery_requirements,
          device_password: device.device_password,
          encryption_type_id: device.encryption_type_id,
          device_role_id: device.device_role_id,
          is_primary: device.is_primary,
          role_notes: device.role_notes,
          created_by: profile?.id,
        }));

        const { data: newDevices, error: devicesError } = await supabase
          .from('case_devices')
          .insert(devicesToInsert)
          .select('id');

        if (devicesError) {
          logger.error('Error duplicating devices:', devicesError);
          throw new Error(`Failed to duplicate devices: ${devicesError.message}`);
        }

        const deviceIdMapping: Record<string, string> = {};
        devices.forEach((oldDevice, index) => {
          if (newDevices && newDevices[index]) {
            deviceIdMapping[oldDevice.id] = newDevices[index].id;
          }
        });

        const devicesWithParents = devices.filter(d => d.parent_device_id);
        if (devicesWithParents.length > 0 && newDevices) {
          for (let i = 0; i < devices.length; i++) {
            const oldDevice = devices[i];
            if (oldDevice.parent_device_id && deviceIdMapping[oldDevice.parent_device_id]) {
              const newDeviceId = newDevices[i]?.id;
              const newParentId = deviceIdMapping[oldDevice.parent_device_id];

              if (newDeviceId && newParentId) {
                const { error: updateError } = await supabase
                  .from('case_devices')
                  .update({ parent_device_id: newParentId })
                  .eq('id', newDeviceId);

                if (updateError) {
                  logger.error('Error updating parent_device_id:', updateError);
                }
              }
            }
          }
        }
      }

      return newCase;
    },
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      modals.setShowDuplicateModal(false);
      navigate(`/cases/${newCase.id}`);
    },
    onError: (error) => {
      logger.error('Case duplication error:', error);
      toast.error(`Failed to duplicate case: ${(error as Error).message}`);
    },
  });

  const deleteCaseMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('No case ID');
      return await deleteCaseService(id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success(`Case ${result.case_number} deleted successfully. ${result.total_records_deleted} total records removed.`);
      navigate('/cases');
    },
    onError: (error: Error) => {
      logger.error('Failed to delete case:', error);
      toast.error(`Failed to delete case: ${error.message}`);
    },
  });

  return {
    addNoteMutation,
    updateCaseStatusMutation,
    updateCasePriorityMutation,
    updateAssignedEngineerMutation,
    createPaymentMutation,
    updateCaseInfoMutation,
    updateDeviceInfoMutation,
    updateCustomerInfoMutation,
    markAsDeliveredMutation,
    preserveLongTermMutation,
    duplicateCaseMutation,
    deleteCaseMutation,
    queryClient,
    navigate,
    profile,
    toast,
  };
}
