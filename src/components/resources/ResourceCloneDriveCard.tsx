import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  HardDrive,
  MapPin,
  Activity,
  Copy,
} from 'lucide-react';
import type { Database } from '../../types/database.types';

type ResourceCloneDriveRow = Database['public']['Tables']['resource_clone_drives']['Row'];

export interface ResourceCloneDriveWithRelations extends ResourceCloneDriveRow {
  brand?: { name: string } | null;
  capacity_ref?: { name: string; gb_value: number | null } | null;
  interface_ref?: { name: string } | null;
}

interface ResourceCloneDriveCardProps {
  drive: ResourceCloneDriveWithRelations;
  onEdit: () => void;
  onViewHistory?: () => void;
}

export const ResourceCloneDriveCard: React.FC<ResourceCloneDriveCardProps> = ({
  drive,
  onEdit,
  onViewHistory,
}) => {
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'available':
        return '#10b981';
      case 'in_use':
        return '#3b82f6';
      case 'maintenance':
        return '#f59e0b';
      case 'retired':
        return '#6b7280';
      case 'lost':
      case 'damaged':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getStatusLabel = (status: string | null) => {
    if (!status) return 'Unknown';
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getConditionColor = (condition: string | null) => {
    switch (condition) {
      case 'excellent':
        return '#10b981';
      case 'good':
        return '#3b82f6';
      case 'fair':
        return '#f59e0b';
      case 'poor':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getConditionLabel = (condition: string | null) => {
    if (!condition) return 'Unknown';
    return condition.charAt(0).toUpperCase() + condition.slice(1);
  };

  const brandName = drive.brand?.name ?? 'Unknown Brand';
  const capacityName = drive.capacity_ref?.name ?? null;
  const interfaceName = drive.interface_ref?.name ?? null;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${getStatusColor(drive.status)}20` }}
            >
              <HardDrive className="w-6 h-6" style={{ color: getStatusColor(drive.status) }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-slate-900">{drive.label}</h3>
                <Badge variant="custom" color={getStatusColor(drive.status)} size="sm">
                  {getStatusLabel(drive.status)}
                </Badge>
              </div>
              <p className="text-sm text-slate-600">
                {brandName}
                {capacityName && ` - ${capacityName}`}
              </p>
            </div>
          </div>

          <button
            onClick={onEdit}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit Drive"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Serial Number</p>
                <p className="text-sm text-slate-900 truncate font-mono">
                  {drive.serial_number || 'Not recorded'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Interface</p>
                <p className="text-sm text-slate-900">
                  {interfaceName ?? 'N/A'}
                </p>
              </div>
            </div>

            {drive.location && (
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Location</p>
                  <p className="text-sm text-slate-900">{drive.location}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Activity className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Condition</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="custom" color={getConditionColor(drive.condition)} size="sm">
                    {getConditionLabel(drive.condition)}
                  </Badge>
                </div>
              </div>
            </div>

            {drive.capacity_ref?.gb_value != null && drive.capacity_ref.gb_value > 0 && (
              <div className="flex items-start gap-2">
                <Copy className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Capacity</p>
                  <p className="text-sm text-slate-900">
                    {drive.capacity_ref.gb_value.toFixed(0)} GB
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {drive.notes && (
          <div className="pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-slate-600">{drive.notes}</p>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-slate-200">
          {onViewHistory && (
            <button
              onClick={onViewHistory}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              View History
            </button>
          )}
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-2 text-sm font-medium text-primary bg-info-muted hover:bg-info-muted/70 rounded-lg transition-colors"
          >
            Edit Details
          </button>
        </div>
      </div>
    </Card>
  );
};
