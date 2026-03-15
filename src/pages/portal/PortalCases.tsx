import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePortalAuth } from '../../contexts/PortalAuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { FileText, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatDate } from '../../lib/format';

interface Case {
  id: string;
  case_no: string;
  title: string;
  summary: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

interface CaseDevice {
  id: string;
  media_type: string | null;
  brand: string | null;
  model: string | null;
  serial_no: string | null;
  capacity_gb: number;
  condition_text: string | null;
}

interface CaseHistory {
  id: string;
  action: string;
  details_json: any;
  created_at: string;
}

export const PortalCases: React.FC = () => {
  const { customer } = usePortalAuth();
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { data: casePriorities = [] } = useQuery({
    queryKey: ['case_priorities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_priorities')
        .select('name, color')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['portal_cases', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];

      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('portal_visible', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Case[];
    },
    enabled: !!customer?.id,
  });

  const { data: caseDevices = [] } = useQuery({
    queryKey: ['portal_case_devices', selectedCase?.id],
    queryFn: async () => {
      if (!selectedCase?.id) return [];

      const { data, error } = await supabase
        .from('case_devices')
        .select('*')
        .eq('case_id', selectedCase.id);

      if (error) throw error;
      return data as CaseDevice[];
    },
    enabled: !!selectedCase?.id,
  });

  const { data: caseHistory = [] } = useQuery({
    queryKey: ['portal_case_history', selectedCase?.id],
    queryFn: async () => {
      if (!selectedCase?.id) return [];

      const { data, error } = await supabase
        .from('case_job_history')
        .select('*')
        .eq('case_id', selectedCase.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CaseHistory[];
    },
    enabled: !!selectedCase?.id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
      case 'diagnosis':
        return '#3b82f6';
      case 'in-progress':
        return '#f59e0b';
      case 'waiting-approval':
        return '#8b5cf6';
      case 'ready':
        return '#06b6d4';
      case 'completed':
      case 'delivered':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getPriorityColor = (priority: string) => {
    const priorityItem = casePriorities.find(
      p => p.name.toLowerCase() === priority.toLowerCase()
    );
    return priorityItem?.color || '#64748b';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return <CheckCircle className="w-5 h-5" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const handleViewDetails = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setIsDetailModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-cyan-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4">Loading your cases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">My Cases</h1>
        <p className="text-slate-600">
          Track the status of your data recovery cases
        </p>
      </div>

      {cases.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-lg text-slate-600 mb-2">No cases found</p>
          <p className="text-sm text-slate-500">
            Your data recovery cases will appear here once created
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {cases.map((caseItem) => (
            <Card
              key={caseItem.id}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleViewDetails(caseItem)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-900">{caseItem.title}</h3>
                    <Badge variant="custom" color={getPriorityColor(caseItem.priority)} size="sm">
                      {caseItem.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{caseItem.case_no}</p>
                  {caseItem.summary && (
                    <p className="text-sm text-slate-700 mb-3">{caseItem.summary}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(caseItem.status)}
                  <Badge variant="custom" color={getStatusColor(caseItem.status)}>
                    {caseItem.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-500 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-4">
                  <span>Created: {formatDate(caseItem.created_at)}</span>
                  {caseItem.due_date && (
                    <span>Due: {formatDate(caseItem.due_date)}</span>
                  )}
                </div>
                <span className="text-cyan-600 font-medium">View Details →</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Case Details"
      >
        {selectedCase && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-bold text-slate-900">{selectedCase.title}</h2>
                <Badge variant="custom" color={getStatusColor(selectedCase.status)}>
                  {selectedCase.status}
                </Badge>
                <Badge variant="custom" color={getPriorityColor(selectedCase.priority)} size="sm">
                  {selectedCase.priority}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 mb-2">{selectedCase.case_no}</p>
              {selectedCase.summary && (
                <p className="text-slate-700">{selectedCase.summary}</p>
              )}
            </div>

            {caseDevices.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Devices
                </h3>
                <div className="space-y-3">
                  {caseDevices.map((device) => (
                    <div key={device.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {device.media_type && (
                          <div>
                            <span className="text-slate-500">Type:</span>
                            <span className="ml-2 font-medium text-slate-900">{device.media_type}</span>
                          </div>
                        )}
                        {device.brand && (
                          <div>
                            <span className="text-slate-500">Brand:</span>
                            <span className="ml-2 font-medium text-slate-900">{device.brand}</span>
                          </div>
                        )}
                        {device.model && (
                          <div>
                            <span className="text-slate-500">Model:</span>
                            <span className="ml-2 font-medium text-slate-900">{device.model}</span>
                          </div>
                        )}
                        {device.capacity_gb > 0 && (
                          <div>
                            <span className="text-slate-500">Capacity:</span>
                            <span className="ml-2 font-medium text-slate-900">{device.capacity_gb} GB</span>
                          </div>
                        )}
                      </div>
                      {device.condition_text && (
                        <p className="text-sm text-slate-600 mt-2">{device.condition_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {caseHistory.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                  Status History
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {caseHistory.map((history) => (
                    <div key={history.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{history.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-500">{formatDate(history.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-slate-200">
              <div>
                <p className="text-slate-500 mb-1">Created</p>
                <p className="font-medium text-slate-900">{formatDate(selectedCase.created_at)}</p>
              </div>
              {selectedCase.due_date && (
                <div>
                  <p className="text-slate-500 mb-1">Due Date</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedCase.due_date)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
