import React from 'react';
import { Copy, HardDriveDownload } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { CloneDriveCard } from '../CloneDriveCard';
import { CreateCloneDriveModal, type CreateCloneDriveFormValues } from '../CreateCloneDriveModal';
import { ExtractCloneConfirmationModal } from '../ExtractCloneConfirmationModal';
import { ArchiveCloneConfirmationModal } from '../ArchiveCloneConfirmationModal';
import { SpaceInsufficientWarningModal } from '../SpaceInsufficientWarningModal';

interface CloneDriveData {
  id: string;
  case_id?: string | null;
  patient_device_id?: string | null;
  device_id?: string | null;
  storage_path?: string | null;
  clone_date?: string | null;
  status?: string | null;
  image_size_gb?: number | null;
  physical_location?: { name?: string | null } | null;
  cloned_by_user?: { full_name?: string | null } | null;
  [key: string]: unknown;
}

interface DeviceData {
  id: string;
  device_type?: { name?: string | null } | null;
  serial_number?: string | null;
  [key: string]: unknown;
}

interface SpaceWarningInfo {
  cloneLabel: string;
  totalCapacity: number;
  currentUsed: number;
  availableSpace: number;
  requiredSpace: number;
}

interface CaseCloneDrivesTabProps {
  caseId: string;
  caseData: { case_no?: string | null; [key: string]: unknown };
  devices: DeviceData[];
  cloneDrives: CloneDriveData[];

  onSetViewCloneModal: (clone: Record<string, unknown>) => void;
  onSetSelectedClone: (clone: Record<string, unknown> | null) => void;
  onSetShowMarkAsDeliveredModal: (v: boolean) => void;
  onSetShowPreserveLongTermModal: (v: boolean) => void;

  // Create flow
  showCreateModal: boolean;
  onOpenCreateModal: () => void;
  onCloseCreateModal: () => void;
  onCreateCloneSubmit: (values: CreateCloneDriveFormValues) => void;
  onCreateCloneSpaceShort: (info: {
    values: CreateCloneDriveFormValues;
    resource: { id: string; label: string; capacity_gb: number; used_gb: number; available_gb: number };
  }) => boolean;
  isCreatingClone: boolean;

  // Extract flow
  showExtractModal: boolean;
  selectedClone: Record<string, unknown> | null;
  onCloseExtractModal: () => void;
  onConfirmExtract: () => void;
  isExtracting: boolean;
  onRequestExtract: (clone: Record<string, unknown>) => void;

  // Archive flow
  showArchiveModal: boolean;
  onCloseArchiveModal: () => void;
  onConfirmArchive: () => void;
  isArchiving: boolean;
  onRequestArchive: (clone: Record<string, unknown>) => void;

  // Space warning
  showSpaceWarningModal: boolean;
  spaceWarningInfo: SpaceWarningInfo | null;
  onCloseSpaceWarning: () => void;
  onProceedSpaceWarning: () => void;
}

const buildDeviceLabel = (device: DeviceData | undefined): string => {
  if (!device) return 'Unknown Device';
  const type = device.device_type?.name ?? 'Device';
  const serial = device.serial_number ? ` (${device.serial_number})` : '';
  return `${type}${serial}`;
};

export const CaseCloneDrivesTab: React.FC<CaseCloneDrivesTabProps> = ({
  caseId,
  caseData,
  devices,
  cloneDrives,
  onSetViewCloneModal,
  onSetSelectedClone,
  onSetShowMarkAsDeliveredModal,
  onSetShowPreserveLongTermModal,
  showCreateModal,
  onOpenCreateModal,
  onCloseCreateModal,
  onCreateCloneSubmit,
  onCreateCloneSpaceShort,
  isCreatingClone,
  showExtractModal,
  selectedClone,
  onCloseExtractModal,
  onConfirmExtract,
  isExtracting,
  onRequestExtract,
  showArchiveModal,
  onCloseArchiveModal,
  onConfirmArchive,
  isArchiving,
  onRequestArchive,
  showSpaceWarningModal,
  spaceWarningInfo,
  onCloseSpaceWarning,
  onProceedSpaceWarning,
}) => {
  const selectedClonePatientDeviceName = React.useMemo(() => {
    if (!selectedClone) return undefined;
    const deviceId = (selectedClone.device_id ?? selectedClone.patient_device_id) as
      | string
      | undefined;
    if (!deviceId) return undefined;
    const match = devices.find((d) => d.id === deviceId);
    return buildDeviceLabel(match);
  }, [selectedClone, devices]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Copy className="w-6 h-6 text-primary" />
                Clone Drives & Disk Images
              </h2>
              <p className="text-sm text-slate-600 mt-1">Track disk images and clone storage locations for data recovery</p>
            </div>
            <Button
              onClick={onOpenCreateModal}
              className="flex items-center gap-2"
              disabled={devices.length === 0}
              title={devices.length === 0 ? 'Add a device to the case first' : 'Create new clone drive'}
            >
              <HardDriveDownload className="w-4 h-4" />
              Create Clone Drive
            </Button>
          </div>

          {cloneDrives.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Copy className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium mb-2">No clone drives recorded</p>
              <p className="text-sm">Create a record when you create a disk image or clone</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {cloneDrives.map((clone) => {
                const deviceId = (clone.device_id ?? clone.patient_device_id) as
                  | string
                  | undefined;
                const patientDevice = deviceId
                  ? devices.find((d) => d.id === deviceId)
                  : undefined;
                const patientDeviceName = buildDeviceLabel(patientDevice);

                const cloneForCard = {
                  ...(clone as unknown as Record<string, unknown>),
                  physical_location_name: clone.physical_location?.name ?? undefined,
                  cloned_by_name: clone.cloned_by_user?.full_name ?? undefined,
                } as unknown as React.ComponentProps<typeof CloneDriveCard>['clone'];
                return (
                  <CloneDriveCard
                    key={clone.id}
                    clone={cloneForCard}
                    caseNo={caseData.case_no ?? undefined}
                    patientDeviceName={patientDeviceName}
                    onView={(c) => onSetViewCloneModal(c as unknown as Record<string, unknown>)}
                    onMarkAsDelivered={(c) => {
                      onSetSelectedClone(c as unknown as Record<string, unknown>);
                      onSetShowMarkAsDeliveredModal(true);
                    }}
                    onPreserve={(c) => {
                      onSetSelectedClone(c as unknown as Record<string, unknown>);
                      onSetShowPreserveLongTermModal(true);
                    }}
                    onExtract={(c) => onRequestExtract(c as unknown as Record<string, unknown>)}
                    onArchive={(c) => onRequestArchive(c as unknown as Record<string, unknown>)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {cloneDrives.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4">
              <div className="text-sm text-slate-600">Total Clones</div>
              <div className="text-2xl font-bold text-slate-900">{cloneDrives.length}</div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="text-sm text-slate-600">Active</div>
              <div className="text-2xl font-bold text-success">
                {cloneDrives.filter(c => c.status === 'active').length}
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="text-sm text-slate-600">Extracted</div>
              <div className="text-2xl font-bold text-info">
                {cloneDrives.filter(c => c.status === 'extracted').length}
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="text-sm text-slate-600">Total Size</div>
              <div className="text-2xl font-bold text-slate-900">
                {cloneDrives.reduce((sum, c) => sum + (c.image_size_gb || 0), 0).toFixed(0)} GB
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Create Clone Drive Modal */}
      <CreateCloneDriveModal
        isOpen={showCreateModal}
        onClose={onCloseCreateModal}
        caseId={caseId}
        caseNo={caseData.case_no ?? undefined}
        devices={devices}
        onSubmit={onCreateCloneSubmit}
        onSpaceShort={onCreateCloneSpaceShort}
        isLoading={isCreatingClone}
      />

      {/* Extract Confirmation Modal */}
      <ExtractCloneConfirmationModal
        isOpen={showExtractModal}
        onClose={onCloseExtractModal}
        onConfirm={onConfirmExtract}
        clone={
          selectedClone
            ? (selectedClone as unknown as React.ComponentProps<
                typeof ExtractCloneConfirmationModal
              >['clone'])
            : null
        }
        caseNo={caseData.case_no ?? undefined}
        patientDeviceName={selectedClonePatientDeviceName}
        isLoading={isExtracting}
      />

      {/* Archive Confirmation Modal */}
      <ArchiveCloneConfirmationModal
        isOpen={showArchiveModal}
        onClose={onCloseArchiveModal}
        onConfirm={onConfirmArchive}
        clone={
          selectedClone
            ? (selectedClone as unknown as React.ComponentProps<
                typeof ArchiveCloneConfirmationModal
              >['clone'])
            : null
        }
        caseNo={caseData.case_no ?? undefined}
        patientDeviceName={selectedClonePatientDeviceName}
        isLoading={isArchiving}
      />

      {/* Space Insufficient Warning Modal */}
      {spaceWarningInfo && (
        <SpaceInsufficientWarningModal
          isOpen={showSpaceWarningModal}
          onClose={onCloseSpaceWarning}
          onProceed={onProceedSpaceWarning}
          cloneId={spaceWarningInfo.cloneLabel}
          totalCapacity={spaceWarningInfo.totalCapacity}
          currentUsed={spaceWarningInfo.currentUsed}
          availableSpace={spaceWarningInfo.availableSpace}
          requiredSpace={spaceWarningInfo.requiredSpace}
        />
      )}
    </div>
  );
};
