import React, { useState, useRef, useEffect } from 'react';
import { FileStack, HardDrive, User, FileText, Settings, Activity, AlertCircle, Package, Users, Building2, Mail, Phone, MapPin, Key, Eye, EyeOff, Save, X } from 'lucide-react';
import { CreditCard as Edit } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { MultiSelectDropdown } from '../../ui/MultiSelectDropdown';
import { EngineerSelector } from '../EngineerSelector';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

interface CaseOverviewTabProps {
  caseData: Record<string, unknown>;
  devices: Record<string, unknown>[];
  isSavingCaseInfo: boolean;
  isSavingDeviceInfo: boolean;
  isSavingClientInfo: boolean;
  onSaveCaseInfo: (updates: Record<string, unknown>) => void;
  onSaveDeviceInfo: (deviceId: string, updates: Record<string, unknown>) => void;
  onSaveClientInfo: (customerUpdates: Record<string, unknown>, deviceUpdates: Record<string, unknown>) => void;
  onUpdateStatus: (newStatus: string) => void;
  onUpdatePriority: (newPriority: string) => void;
  onUpdateEngineer: (engineerId: string | null) => void;
  profile: Record<string, unknown>;
}

export const CaseOverviewTab: React.FC<CaseOverviewTabProps> = ({
  caseData,
  devices,
  isSavingCaseInfo,
  isSavingDeviceInfo,
  isSavingClientInfo,
  onSaveCaseInfo,
  onSaveDeviceInfo,
  onSaveClientInfo,
  onUpdateStatus,
  onUpdatePriority,
  onUpdateEngineer,
  profile,
}) => {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedCaseData, setEditedCaseData] = useState<Record<string, unknown>>({});
  const [editedDeviceData, setEditedDeviceData] = useState<Record<string, unknown>>({});
  const [editedClientData, setEditedClientData] = useState<Record<string, unknown>>({});
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);

  const { data: caseStatuses = [] } = useQuery({
    queryKey: ['case_statuses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('master_case_statuses').select('id, name, color, is_active').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: casePriorities = [] } = useQuery({
    queryKey: ['case_priorities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('master_case_priorities').select('id, name, color, is_active').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: deviceTypes = [] } = useQuery({
    queryKey: ['device_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('catalog_device_types').select('id, name').order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: capacities = [] } = useQuery({
    queryKey: ['capacities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('catalog_device_capacities').select('id, name').order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: serviceProblems = [] } = useQuery({
    queryKey: ['service_problems'],
    queryFn: async () => {
      const { data, error } = await supabase.from('catalog_service_problems').select('id, name').order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: accessories = [] } = useQuery({
    queryKey: ['accessories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('catalog_accessories').select('id, name').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ['service_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('catalog_service_types').select('id, name').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsEditingStatus(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(event.target as Node)) {
        setIsEditingPriority(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusColor = (statusName: string) => {
    const status = caseStatuses.find(s => s.name === statusName);
    return status?.color || '#6b7280';
  };

  const getStatusDisplayName = (statusName: string) => {
    const status = caseStatuses.find(s => s.name === statusName);
    return status?.name || statusName;
  };

  const getPriorityColor = (priorityName: string) => {
    const priority = casePriorities.find(p => p.name.toLowerCase() === priorityName?.toLowerCase());
    return priority?.color || '#6b7280';
  };

  const getAccessoryNames = (accessoryIds: string[] | null | undefined): string => {
    if (!accessoryIds || accessoryIds.length === 0) return '-';
    return accessoryIds
      .map(id => accessories.find(acc => acc.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const statusOptions = caseStatuses.map(status => ({ value: status.name, label: status.name }));
  const priorityOptions = casePriorities.map(priority => ({ value: priority.name.toLowerCase(), label: priority.name }));

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditedCaseData({});
    setEditedDeviceData({});
    setEditedClientData({});
  };

  const handleSaveCaseInfo = () => {
    if (Object.keys(editedCaseData).length > 0) {
      onSaveCaseInfo(editedCaseData);
      setEditedCaseData({});
      setEditingSection(null);
    } else {
      setEditingSection(null);
    }
  };

  const handleSaveDeviceInfo = () => {
    if (devices[0] && Object.keys(editedDeviceData).length > 0) {
      onSaveDeviceInfo(devices[0].id, editedDeviceData);
      setEditedDeviceData({});
      setEditingSection(null);
    } else {
      setEditingSection(null);
      setEditedDeviceData({});
    }
  };

  const handleSaveClientInfo = () => {
    onSaveClientInfo(editedClientData, editedDeviceData);
    setEditedClientData({});
    setEditedDeviceData({});
    setEditingSection(null);
  };

  const handleDeviceFieldChange = (field: string, value: unknown) => {
    setEditedDeviceData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Case Info Card */}
      <Card variant="bordered" className="overflow-visible">
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-blue-900 flex items-center gap-2">
              <FileStack className="w-4 h-4 text-blue-600" />
              Case Info
            </h2>
            <Button variant="secondary" size="sm" onClick={() => setEditingSection(editingSection === 'case' ? null : 'case')}>
              <Edit className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="bg-white p-4 overflow-visible">
          <div className="space-y-0">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <FileStack className="w-3.5 h-3.5 text-slate-400" />
                Job ID
              </label>
              <p className="text-sm font-semibold text-blue-600">{caseData.case_no}</p>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Client Reference
              </label>
              {editingSection === 'case' ? (
                <input
                  type="text"
                  value={editedCaseData.client_reference ?? caseData.client_reference ?? ''}
                  onChange={(e) => setEditedCaseData((prev) => ({ ...prev, client_reference: e.target.value }))}
                  placeholder="Enter client reference..."
                  className="text-sm px-2 py-1 border border-blue-300 rounded bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
                />
              ) : (
                <p className="text-sm font-mono text-slate-900">{caseData.client_reference || '-'}</p>
              )}
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                Service
              </label>
              {editingSection === 'case' ? (
                <div className="w-[60%]">
                  <SearchableSelect
                    label=""
                    value={editedCaseData.service_type_id ?? caseData.service_type_id ?? ''}
                    onChange={(value) => setEditedCaseData((prev) => ({ ...prev, service_type_id: value }))}
                    options={serviceTypes.map(st => ({ id: st.id, name: st.name }))}
                    placeholder="Select service..."
                    clearable={false}
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-900 font-medium text-right">{caseData.service_type?.name || '-'}</p>
              )}
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                Status
              </label>
              <div ref={statusRef} className="relative">
                {!isEditingStatus ? (
                  <div onClick={() => setIsEditingStatus(true)} className="cursor-pointer">
                    <Badge variant="custom" color={getStatusColor(caseData.status)} size="sm">
                      {getStatusDisplayName(caseData.status)}
                    </Badge>
                  </div>
                ) : (
                  <select
                    value={caseData.status}
                    onChange={(e) => { onUpdateStatus(e.target.value); setIsEditingStatus(false); }}
                    className="text-xs px-2 py-1 border border-blue-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                Priority
              </label>
              <div ref={priorityRef} className="relative">
                {!isEditingPriority ? (
                  <div onClick={() => setIsEditingPriority(true)} className="cursor-pointer">
                    <Badge variant="custom" color={getPriorityColor(caseData.priority)} size="sm">
                      {caseData.priority}
                    </Badge>
                  </div>
                ) : (
                  <select
                    value={caseData.priority}
                    onChange={(e) => { onUpdatePriority(e.target.value); setIsEditingPriority(false); }}
                    className="text-xs px-2 py-1 border border-orange-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    autoFocus
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Assigned Engineer
              </label>
              <div className="w-[60%]">
                <EngineerSelector
                  value={caseData.assigned_engineer_id}
                  onChange={(engineerId) => onUpdateEngineer(engineerId)}
                  disabled={profile?.role === 'technician' && profile?.case_access_level === 'restricted'}
                />
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Created By
              </label>
              <p className="text-sm text-slate-900 font-medium text-right">{caseData.created_by_profile?.full_name || '-'}</p>
            </div>
          </div>
        </div>
        {editingSection === 'case' && (
          <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-white">
            <div className="flex gap-2 pt-3">
              <Button size="sm" onClick={handleSaveCaseInfo} style={{ backgroundColor: '#10b981' }} disabled={isSavingCaseInfo}>
                <Save className="w-3 h-3 mr-1" />
                {isSavingCaseInfo ? 'Saving...' : 'Save'}
              </Button>
              <Button size="sm" variant="secondary" onClick={handleCancelEdit}>
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Device Info Card */}
      <Card variant="bordered" className="overflow-hidden">
        <div className="bg-green-50 border-b border-green-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-green-900 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-green-600" />
              Device Info
            </h2>
            <Button variant="secondary" size="sm" onClick={() => setEditingSection(editingSection === 'device' ? null : 'device')}>
              <Edit className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="bg-white p-4">
          <div className="space-y-0">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                Device Type
              </label>
              {editingSection === 'device' ? (
                <select
                  value={editedDeviceData.device_type_id ?? devices[0]?.device_type_id ?? ''}
                  onChange={(e) => handleDeviceFieldChange('device_type_id', e.target.value || null)}
                  className="text-sm px-2 py-1 border border-green-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-green-500 max-w-[200px]"
                >
                  <option value="">Select type...</option>
                  {deviceTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-slate-900 font-medium text-right">{devices[0]?.device_type?.name || '-'}</p>
              )}
            </div>
            {devices[0] && (
              <>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <label className="text-sm text-slate-600 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Device Model
                  </label>
                  {editingSection === 'device' ? (
                    <input
                      type="text"
                      value={editedDeviceData.model ?? devices[0]?.model ?? ''}
                      onChange={(e) => handleDeviceFieldChange('model', e.target.value)}
                      placeholder="Enter model..."
                      className="text-sm px-2 py-1 border border-green-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-green-500 max-w-[200px]"
                    />
                  ) : (
                    <p className="text-sm text-slate-900 font-medium text-right">{devices[0].model || '-'}</p>
                  )}
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <label className="text-sm text-slate-600 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Serial Number
                  </label>
                  {editingSection === 'device' ? (
                    <input
                      type="text"
                      value={editedDeviceData.serial_no ?? devices[0]?.serial_no ?? ''}
                      onChange={(e) => handleDeviceFieldChange('serial_no', e.target.value)}
                      placeholder="Enter serial number..."
                      className="text-sm px-2 py-1 border border-green-300 rounded bg-white font-mono focus:outline-none focus:ring-2 focus:ring-green-500 max-w-[200px]"
                    />
                  ) : (
                    <p className="text-sm font-mono text-slate-900 font-medium text-right">{devices[0].serial_no || '-'}</p>
                  )}
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <label className="text-sm text-slate-600 flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    Capacity
                  </label>
                  {editingSection === 'device' ? (
                    <select
                      value={editedDeviceData.capacity_id ?? devices[0]?.capacity_id ?? ''}
                      onChange={(e) => handleDeviceFieldChange('capacity_id', e.target.value || null)}
                      className="text-sm px-2 py-1 border border-green-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-green-500 max-w-[200px]"
                    >
                      <option value="">Select capacity...</option>
                      {capacities.map((cap) => (
                        <option key={cap.id} value={cap.id}>{cap.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-slate-900 font-medium text-right">{devices[0].capacity?.name || '-'}</p>
                  )}
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <label className="text-sm text-slate-600 flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    Accessories
                  </label>
                  {editingSection === 'device' ? (
                    <div className="max-w-[60%] w-full">
                      <MultiSelectDropdown
                        label=""
                        value={editedDeviceData.accessories ?? devices[0]?.accessories ?? []}
                        onChange={(value) => handleDeviceFieldChange('accessories', value)}
                        options={accessories.map(a => ({ id: a.id, name: a.name }))}
                        placeholder="Select accessories..."
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-900 font-medium text-right max-w-[60%]">
                      {getAccessoryNames(devices[0]?.accessories)}
                    </p>
                  )}
                </div>
              </>
            )}
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                Device Problem
              </label>
              {editingSection === 'device' ? (
                <select
                  value={editedDeviceData.device_problem ?? devices[0]?.device_problem ?? ''}
                  onChange={(e) => handleDeviceFieldChange('device_problem', e.target.value)}
                  className="text-sm px-2 py-1 border border-green-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-green-500 max-w-[200px]"
                >
                  <option value="">Select problem...</option>
                  {serviceProblems.map((problem) => (
                    <option key={problem.id} value={problem.name}>{problem.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-slate-900 font-medium text-right">{devices[0]?.device_problem || '-'}</p>
              )}
            </div>
            {caseData.important_data && (
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <label className="text-sm text-slate-600 flex items-center gap-2">
                  <FileStack className="w-3.5 h-3.5 text-slate-400" />
                  Important Data
                </label>
                <p className="text-sm text-slate-900 font-medium text-right">{caseData.important_data}</p>
              </div>
            )}
            {!caseData.accessories && !caseData.important_data && (
              <div className="py-3" />
            )}
          </div>
        </div>
        {editingSection === 'device' && (
          <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-white">
            <div className="flex gap-2 pt-3">
              <Button size="sm" onClick={handleSaveDeviceInfo} style={{ backgroundColor: '#10b981' }} disabled={isSavingDeviceInfo}>
                <Save className="w-3 h-3 mr-1" />
                {isSavingDeviceInfo ? 'Saving...' : 'Save'}
              </Button>
              <Button size="sm" variant="secondary" onClick={handleCancelEdit}>
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Client Info Card */}
      <Card variant="bordered" className="overflow-hidden">
        <div className="bg-pink-50 border-b border-pink-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-pink-900 flex items-center gap-2">
              <User className="w-4 h-4 text-pink-600" />
              Client Info
            </h2>
            <Button variant="secondary" size="sm" onClick={() => setEditingSection(editingSection === 'client' ? null : 'client')}>
              <Edit className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="bg-white p-4">
          <div className="space-y-0">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Customer Name
              </label>
              <p className="text-sm font-semibold text-slate-900 text-right">{caseData.customer?.customer_name || '-'}</p>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Company
              </label>
              <p className="text-sm text-slate-900 font-medium text-right">{caseData.company?.company_name || '-'}</p>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email
              </label>
              {caseData.customer?.email ? (
                <a href={`mailto:${caseData.customer.email}`} className="text-sm text-blue-600 hover:text-blue-700 break-all text-right">
                  {caseData.customer.email}
                </a>
              ) : (
                <p className="text-sm text-slate-900 font-medium text-right">-</p>
              )}
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Mobile Number
              </label>
              {(caseData.customer?.mobile_number || caseData.customer?.phone_number) ? (
                <a href={`tel:${caseData.customer.mobile_number || caseData.customer.phone_number}`} className="text-sm text-blue-600 hover:text-blue-700 text-right">
                  {caseData.customer.mobile_number || caseData.customer.phone_number}
                </a>
              ) : (
                <p className="text-sm text-slate-900 font-medium text-right">-</p>
              )}
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Location
              </label>
              <p className="text-sm text-slate-900 font-medium text-right">
                {caseData.customer?.city && caseData.customer?.country
                  ? `${caseData.customer.city}, ${caseData.customer.country}`
                  : caseData.customer?.city || caseData.customer?.country || '-'}
              </p>
            </div>
            <div className="flex items-center justify-between py-3">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                Device Password
              </label>
              {editingSection === 'client' ? (
                <div className="flex items-center gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={editedDeviceData.device_password ?? devices[0]?.device_password ?? ''}
                    onChange={(e) => setEditedDeviceData((prev) => ({ ...prev, device_password: e.target.value }))}
                    placeholder="Enter password..."
                    className="font-mono text-xs bg-white px-2 py-1 rounded border border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500 w-24"
                  />
                  <Button variant="secondary" size="sm" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={devices[0]?.device_password || ''}
                    readOnly
                    className="font-mono text-xs bg-white px-2 py-1 rounded border border-slate-300 w-24"
                  />
                  <Button variant="secondary" size="sm" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        {editingSection === 'client' && (
          <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-white">
            <div className="flex gap-2 pt-3">
              <Button size="sm" onClick={handleSaveClientInfo} style={{ backgroundColor: '#10b981' }} disabled={isSavingClientInfo}>
                <Save className="w-3 h-3 mr-1" />
                {isSavingClientInfo ? 'Saving...' : 'Save'}
              </Button>
              <Button size="sm" variant="secondary" onClick={handleCancelEdit}>
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
