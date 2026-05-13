import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  HardDrive,
  MapPin,
  Activity,
  Calendar,
  DollarSign,
  Copy,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { formatDate } from '../../lib/format';

interface ResourceCloneDriveCardProps {
  drive: Record<string, unknown>;
  onEdit: () => void;
  onViewHistory?: () => void;
}

export const ResourceCloneDriveCard: React.FC<ResourceCloneDriveCardProps> = ({
  drive,
  onEdit,
  onViewHistory,
}) => {
  const getStatusColor = (status: string) => {
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

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getConditionColor = (rating: number) => {
    if (rating >= 5) return '#10b981';
    if (rating >= 4) return '#3b82f6';
    if (rating >= 3) return '#f59e0b';
    return '#ef4444';
  };

  const getConditionLabel = (rating: number) => {
    if (rating >= 5) return 'Excellent';
    if (rating >= 4) return 'Good';
    if (rating >= 3) return 'Fair';
    if (rating >= 2) return 'Poor';
    return 'Critical';
  };

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
                <h3 className="text-lg font-bold text-slate-900">{drive.clone_id}</h3>
                <Badge variant="custom" color={getStatusColor(drive.status)} size="sm">
                  {getStatusLabel(drive.status)}
                </Badge>
              </div>
              <p className="text-sm text-slate-600">
                {drive.brand_name || drive.brand || 'Unknown Brand'} {drive.model || ''}
                {(drive.capacity_name || drive.capacity) && ` - ${drive.capacity_name || drive.capacity}`}
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
                <p className="text-xs text-slate-500 uppercase tracking-wide">Type & Interface</p>
                <p className="text-sm text-slate-900">
                  {drive.device_type_name || drive.drive_type?.toUpperCase() || 'N/A'} / {drive.interface_name || drive.interface_type?.toUpperCase() || 'N/A'}
                </p>
              </div>
            </div>

            {drive.location_name && (
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Location</p>
                  <p className="text-sm text-slate-900">{drive.location_name}</p>
                  {drive.physical_location_notes && (
                    <p className="text-xs text-slate-500 mt-0.5">{drive.physical_location_notes}</p>
                  )}
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
                  {drive.condition_name ? (
                    <Badge variant="custom" color={getConditionColor(drive.condition_rating || 5)} size="sm">
                      {drive.condition_name}
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="custom" color={getConditionColor(drive.condition_rating)} size="sm">
                        {getConditionLabel(drive.condition_rating)}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        ({drive.condition_rating}/5)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Copy className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Usage Statistics</p>
                <p className="text-sm text-slate-900">
                  {drive.total_assignments || 0} total assignments
                </p>
                {drive.capacity_gb > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Used:</span>
                      <span className="font-medium text-primary">
                        {drive.current_used_gb > 0 ? `${drive.current_used_gb.toFixed(0)} GB` : '0 GB'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Available:</span>
                      <span className="font-medium text-success">
                        {drive.available_space_gb > 0 ? `${drive.available_space_gb.toFixed(0)} GB` : `${drive.capacity_gb.toFixed(0)} GB`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min((drive.current_used_gb / drive.capacity_gb) * 100, 100)}%`,
                          backgroundColor: (drive.current_used_gb / drive.capacity_gb) > 0.9 ? '#ef4444' : (drive.current_used_gb / drive.capacity_gb) > 0.7 ? '#f59e0b' : '#3b82f6'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {drive.last_used_date && (
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Last Used</p>
                  <p className="text-sm text-slate-900">{formatDate(drive.last_used_date)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {drive.health_percentage !== null && drive.health_percentage < 80 && (
          <div className="flex items-center gap-2 p-3 bg-warning-muted border border-warning/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
            <p className="text-sm text-warning">
              Health: {drive.health_percentage}% - Consider maintenance or replacement
            </p>
          </div>
        )}

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
