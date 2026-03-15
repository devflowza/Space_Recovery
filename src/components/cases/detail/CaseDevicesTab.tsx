import React from 'react';
import { HardDrive, Grid2x2 as Grid, History, Clock, Eye, EyeOff, Shield, Package, CheckCircle2 } from 'lucide-react';
import { CreditCard as Edit } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { DeviceRoleBadge } from '../../ui/DeviceRoleBadge';
import { getDeviceIconComponent } from '@/lib/deviceIconMapper';
import { formatDate, formatDateTime } from '@/lib/format';

interface CaseDevicesTabProps {
  caseData: Record<string, unknown>;
  devices: Record<string, unknown>[];
  expandedDevices: Set<string>;
  showPassword: boolean;
  onToggleDeviceDetails: (deviceId: string) => void;
  onSetShowDeviceModal: (v: boolean) => void;
  onSetEditingDevice: (device: Record<string, unknown> | null) => void;
  onSetShowPassword: (v: boolean) => void;
}

export const CaseDevicesTab: React.FC<CaseDevicesTabProps> = ({
  caseData,
  devices,
  expandedDevices,
  showPassword,
  onToggleDeviceDetails,
  onSetShowDeviceModal,
  onSetEditingDevice,
  onSetShowPassword,
}) => {
  const patientDevices = devices.filter(d => d.device_role?.name?.toLowerCase() === 'patient');
  const backupAndSupportDevices = devices.filter(d => {
    const roleName = d.device_role?.name?.toLowerCase();
    return roleName === 'backup' || roleName === 'donor';
  });

  const renderDeviceCard = (device: Record<string, unknown>, idx: number) => {
    const isExpanded = expandedDevices.has(device.id);
    const DeviceIcon = getDeviceIconComponent(device.device_type?.name);
    return (
      <Card key={device.id}>
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5 mb-1">
                <DeviceIcon className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <span className="truncate">Device {idx + 1}: {device.device_type?.name || 'Unknown Device Type'}</span>
              </h4>
              <p className="text-xs text-slate-600 truncate mb-0.5">{device.brand?.name} {device.model}</p>
              {device.serial_no && (
                <p className="text-xs text-slate-500 font-mono">s/n: {device.serial_no}</p>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              {device.is_primary && (
                <Badge variant="custom" color="#3b82f6" size="sm">Primary</Badge>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onToggleDeviceDetails(device.id)}
                className="!p-1.5"
                title={isExpanded ? 'Hide details' : 'View details'}
              >
                {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onSetEditingDevice(device);
                  onSetShowDeviceModal(true);
                }}
                className="!p-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {device.capacity && (
                  <div>
                    <span className="text-slate-500 text-xs block mb-0.5">Capacity</span>
                    <span className="text-slate-900 text-sm">{device.capacity.name}</span>
                  </div>
                )}
                {device.condition && (
                  <div>
                    <span className="text-slate-500 text-xs block mb-0.5">Condition</span>
                    <span className="text-slate-900 text-sm">{device.condition.name}</span>
                  </div>
                )}
              </div>
              {device.encryption_type && (
                <div>
                  <span className="text-slate-500 text-xs block mb-0.5">Encryption</span>
                  <span className="text-slate-900 text-sm flex items-center gap-1">
                    <Shield className="w-3 h-3 text-red-500" />
                    {device.encryption_type.name}
                  </span>
                </div>
              )}
              {device.device_problem && (
                <div>
                  <span className="text-slate-500 text-xs font-medium block mb-1">Problem Description</span>
                  <p className="text-slate-900 text-xs leading-relaxed">{device.device_problem}</p>
                </div>
              )}
              {device.recovery_requirements && (
                <div>
                  <span className="text-slate-500 text-xs font-medium block mb-1">Recovery Requirements</span>
                  <p className="text-slate-900 text-xs leading-relaxed">{device.recovery_requirements}</p>
                </div>
              )}
              {device.device_password && (
                <div>
                  <span className="text-slate-500 text-xs font-medium block mb-1.5">Device Password</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={device.device_password}
                      readOnly
                      className="font-mono text-xs bg-slate-50 px-2 py-1.5 rounded border border-slate-300 flex-1"
                    />
                    <Button variant="secondary" size="sm" onClick={() => onSetShowPassword(!showPassword)} className="!p-1.5">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <HardDrive className="w-6 h-6 text-orange-600" />
                Devices ({devices.length})
              </h2>
              <p className="text-sm text-slate-600 mt-1">Manage patient devices, backup devices, and donor parts</p>
            </div>
            <Button
              onClick={() => {
                onSetEditingDevice(null);
                onSetShowDeviceModal(true);
              }}
              style={{ backgroundColor: '#10b981' }}
              size="sm"
            >
              <HardDrive className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </div>
        </div>
      </Card>

      {caseData.checkout_date && (
        <Card className="bg-green-50 border-green-200">
          <div className="p-4">
            <div className="flex items-center gap-2 text-green-900 font-semibold mb-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Checked Out</span>
            </div>
            <div className="text-sm text-green-800 flex flex-wrap gap-6">
              <div><span className="font-medium">Collected by: </span>{caseData.checkout_collector_name}</div>
              <div><span className="font-medium">Date: </span>{formatDate(caseData.checkout_date)}</div>
              {caseData.recovery_outcome && (
                <div><span className="font-medium">Outcome: </span>{caseData.recovery_outcome}</div>
              )}
            </div>
          </div>
        </Card>
      )}

      {devices.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="mb-4">No devices registered for this case</p>
            <Button
              onClick={() => {
                onSetEditingDevice(null);
                onSetShowDeviceModal(true);
              }}
              variant="secondary"
              size="sm"
            >
              <HardDrive className="w-4 h-4 mr-2" />
              Add Your First Device
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {/* Patient Devices */}
          <div className="flex flex-col space-y-4 flex-1 min-w-0">
            <Card className="bg-blue-50 border-blue-200 flex-shrink-0">
              <div className="p-3">
                <h3 className="text-base font-bold text-blue-900 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-blue-700" />
                  Patient Devices ({patientDevices.length})
                </h3>
                <p className="text-xs text-blue-700 mt-1">Primary devices requiring data recovery</p>
              </div>
            </Card>
            <div className="overflow-y-auto max-h-[calc(100vh-450px)] space-y-3 pr-1">
              {patientDevices.length === 0 ? (
                <Card>
                  <div className="p-4 text-center text-slate-500">
                    <HardDrive className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs">No patient devices registered</p>
                  </div>
                </Card>
              ) : (
                patientDevices.map((device, idx) => renderDeviceCard(device, idx))
              )}
            </div>
          </div>

          {/* Backup & Support */}
          <div className="flex flex-col space-y-4 flex-1 min-w-0">
            <Card className="bg-green-50 border-green-200 flex-shrink-0">
              <div className="p-3">
                <h3 className="text-base font-bold text-green-900 flex items-center gap-2">
                  <Grid className="w-4 h-4 text-green-700" />
                  Backup & Support ({backupAndSupportDevices.length})
                </h3>
                <p className="text-xs text-green-700 mt-1">Backup devices and donor parts for recovery operations</p>
              </div>
            </Card>
            <div className="overflow-y-auto max-h-[calc(100vh-450px)] space-y-3 pr-1">
              {backupAndSupportDevices.length === 0 ? (
                <Card>
                  <div className="p-4 text-center text-slate-500">
                    <Grid className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs">No backup or donor devices registered</p>
                  </div>
                </Card>
              ) : (
                backupAndSupportDevices.map((device, idx) => renderDeviceCard(device, idx))
              )}
            </div>
          </div>

          {/* Device History */}
          <div className="flex flex-col space-y-4 flex-1 min-w-0">
            <Card className="bg-slate-50 border-slate-200 flex-shrink-0">
              <div className="p-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-700" />
                  Device History ({devices.length})
                </h3>
                <p className="text-xs text-slate-600 mt-1">Chronological record of all device additions</p>
              </div>
            </Card>
            <Card className="overflow-y-auto max-h-[calc(100vh-450px)]">
              <div className="p-4">
                <div className="space-y-3">
                  {devices
                    .slice()
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((device) => {
                      const DeviceIcon = getDeviceIconComponent(device.device_type?.name);
                      return (
                        <div key={device.id} className="flex items-start gap-3 pb-3 border-b border-slate-200 last:border-0 last:pb-0">
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                              <DeviceIcon className="w-4 h-4 text-slate-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                  <h4 className="font-semibold text-slate-900 text-sm truncate">
                                    {device.device_type?.name || 'Unknown Device Type'}
                                  </h4>
                                  {device.device_role && (
                                    <DeviceRoleBadge role={device.device_role.name} size="sm" />
                                  )}
                                  {device.is_primary && (
                                    <Badge variant="custom" color="#3b82f6" size="sm">Primary</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 truncate">
                                  {device.brand?.name} {device.model}
                                  {device.serial_no && (
                                    <span className="ml-1.5 font-mono text-xs">S/N: {device.serial_no}</span>
                                  )}
                                </p>
                                <div className="mt-1 space-y-0.5">
                                  <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDateTime(device.created_at)}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Added by {device.created_by_profile?.full_name || 'System'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
