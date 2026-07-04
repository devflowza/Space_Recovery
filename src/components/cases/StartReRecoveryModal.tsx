import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { RotateCcw, Info, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabaseClient';
import { createReRecoveryCase } from '../../lib/caseService';
import { useToast } from '../../hooks/useToast';

interface StartReRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCaseId: string;
  originalCaseNumber: string;
  customerName: string;
  actor: { id?: string | null; tenantId: string };
  onCreated: (newCaseId: string) => void;
}

/**
 * Start a Re-Recovery: create a NEW case linked to this one (the device came
 * back for another attempt). The original case is untouched — its full history
 * is preserved and the two are cross-linked. Copies the device(s) into a fresh
 * intake with new custody.
 */
export const StartReRecoveryModal: React.FC<StartReRecoveryModalProps> = ({
  isOpen,
  onClose,
  sourceCaseId,
  originalCaseNumber,
  customerName,
  actor,
  onCreated,
}) => {
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: src, error: srcErr } = await supabase
        .from('cases')
        .select('customer_id, case_no, service_type_id, priority, title, contact_id, assigned_to, company_id')
        .eq('id', sourceCaseId)
        .maybeSingle();
      if (srcErr) throw srcErr;
      if (!src) throw new Error('Source case not found');

      const { data: devices, error: devErr } = await supabase
        .from('case_devices')
        .select('device_type_id, brand_id, model, serial_number, capacity_id, condition_id, accessories, symptoms, notes, password, encryption_id, device_role_id, is_primary, role_notes')
        .eq('case_id', sourceCaseId)
        .is('deleted_at', null);
      if (devErr) throw devErr;

      return createReRecoveryCase(
        {
          customer_id: src.customer_id,
          case_no: src.case_no,
          service_type_id: src.service_type_id,
          priority: src.priority,
          title: src.title,
          contact_id: src.contact_id ?? undefined,
          assigned_engineer_id: src.assigned_to ?? undefined,
          company_id: src.company_id ?? undefined,
        },
        devices ?? [],
        actor,
        sourceCaseId,
      );
    },
    onSuccess: (newCase) => {
      toast.success(`Re-recovery case ${newCase.case_number ?? ''} created`);
      onCreated(newCase.id);
      onClose();
    },
    onError: (err: unknown) => {
      toast.error(`Could not start re-recovery: ${(err as Error).message}`);
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start Re-Recovery" icon={RotateCcw} size="sm">
      <div className="mb-4 flex gap-2 rounded border-l-4 border-info bg-info-muted p-3">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-info" />
        <p className="text-sm text-info">
          Creates a <strong>new linked case</strong> for another recovery attempt on this device.
          This case (#{originalCaseNumber}) and its history stay exactly as they are — the two are
          cross-linked so the full attempt history is preserved.
        </p>
      </div>

      <div className="mb-5 space-y-3">
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm font-medium text-slate-600">Original job</span>
          <span className="text-sm font-semibold text-slate-900">#{originalCaseNumber}</span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm font-medium text-slate-600">Customer</span>
          <span className="text-sm font-semibold text-slate-900">{customerName}</span>
        </div>
      </div>

      <div className="mb-5 flex gap-2 rounded-lg border border-warning/30 bg-warning-muted p-3">
        <p className="text-sm text-warning">
          The new case starts at <strong>Device Received</strong> with a fresh custody record and its
          own job number, billing, and quote. Record it as a re-recovery of #{originalCaseNumber}.
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="flex items-center gap-2"
          style={{ backgroundColor: 'rgb(var(--color-primary))' }}
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          {mutation.isPending ? 'Creating…' : 'Create Re-Recovery Case'}
        </Button>
      </div>
    </Modal>
  );
};
