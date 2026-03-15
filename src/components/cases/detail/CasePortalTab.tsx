import React, { useState, useEffect } from 'react';
import { Eye, Save, Bell, Globe, Shield } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/useToast';

interface PortalSettings {
  id?: string;
  case_id: string;
  show_device_details: boolean;
  show_technical_details: boolean;
  show_device_password: boolean;
  show_important_data: boolean;
  show_accessories: boolean;
  show_status_updates: boolean;
  show_quotes: boolean;
  show_invoices: boolean;
  show_reports: boolean;
  show_attachments: boolean;
  auto_notify_status_change: boolean;
  auto_notify_quote_ready: boolean;
  auto_notify_device_ready: boolean;
  custom_message: string;
}

interface CasePortalTabProps {
  caseId: string;
  portalSettings: Partial<PortalSettings> | null;
}

const defaultSettings = (caseId: string): PortalSettings => ({
  case_id: caseId,
  show_device_details: false,
  show_technical_details: false,
  show_device_password: false,
  show_important_data: true,
  show_accessories: false,
  show_status_updates: true,
  show_quotes: false,
  show_invoices: false,
  show_reports: false,
  show_attachments: false,
  auto_notify_status_change: false,
  auto_notify_quote_ready: false,
  auto_notify_device_ready: false,
  custom_message: '',
});

export const CasePortalTab: React.FC<CasePortalTabProps> = ({ caseId, portalSettings }) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<PortalSettings>(() =>
    portalSettings ? { ...defaultSettings(caseId), ...portalSettings, custom_message: portalSettings.custom_message || '' } : defaultSettings(caseId)
  );

  useEffect(() => {
    if (portalSettings) {
      setSettings({ ...defaultSettings(caseId), ...portalSettings, custom_message: portalSettings.custom_message || '' });
    }
  }, [portalSettings, caseId]);

  const saveMutation = useMutation({
    mutationFn: async (data: PortalSettings) => {
      const { id, ...upsertData } = data;
      const { error } = await supabase
        .from('case_portal_visibility')
        .upsert({ ...upsertData, case_id: caseId }, { onConflict: 'case_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Portal settings saved');
      queryClient.invalidateQueries({ queryKey: ['case_portal_visibility', caseId] });
    },
    onError: (err: unknown) => {
      toast.error(`Failed to save portal settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    },
  });

  const toggle = (field: keyof PortalSettings) => {
    setSettings(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const visibilitySettings: { key: keyof PortalSettings; label: string; description: string }[] = [
    { key: 'show_device_details', label: 'Device Details', description: 'Allow customer to see device specifications' },
    { key: 'show_technical_details', label: 'Technical Details', description: 'Show technical information and findings' },
    { key: 'show_device_password', label: 'Device Password', description: 'Show device password in the portal' },
    { key: 'show_important_data', label: 'Important Data', description: 'Display important data description' },
    { key: 'show_accessories', label: 'Accessories', description: 'Show device accessories list' },
    { key: 'show_status_updates', label: 'Status Updates', description: 'Display case status in the portal' },
    { key: 'show_quotes', label: 'Quotes', description: 'Display quotes and pricing information' },
    { key: 'show_invoices', label: 'Invoices', description: 'Show invoices and payment details' },
    { key: 'show_reports', label: 'Reports', description: 'Display case reports marked as visible' },
    { key: 'show_attachments', label: 'Attachments', description: 'Allow customer to view shared files' },
  ];

  const notificationSettings: { key: keyof PortalSettings; label: string; description: string }[] = [
    { key: 'auto_notify_status_change', label: 'Status Change Notifications', description: 'Send automatic emails on status updates' },
    { key: 'auto_notify_quote_ready', label: 'Quote Ready Notifications', description: 'Notify customer when a quote is ready' },
    { key: 'auto_notify_device_ready', label: 'Device Ready Notifications', description: 'Notify customer when device is ready for pickup' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                Client Portal Visibility
              </h2>
              <p className="text-sm text-slate-500 mt-1">Control what the customer can see in their portal</p>
            </div>
            <Button
              onClick={() => saveMutation.mutate(settings)}
              style={{ backgroundColor: '#10b981' }}
              disabled={saveMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3 uppercase tracking-wide">
              <Eye className="w-4 h-4 text-blue-500" />
              Visibility Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibilitySettings.map(({ key, label, description }) => (
                <label
                  key={key}
                  className="flex items-start justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                >
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-slate-900 text-sm">{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                  </div>
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={!!settings[key]}
                      onChange={() => toggle(key)}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-6 rounded-full transition-colors ${settings[key] ? 'bg-blue-600' : 'bg-slate-300'}`}
                      onClick={() => toggle(key)}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow mt-1 transition-transform ${settings[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3 uppercase tracking-wide">
              <Bell className="w-4 h-4 text-amber-500" />
              Notification Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {notificationSettings.map(({ key, label, description }) => (
                <label
                  key={key}
                  className="flex items-start justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-200"
                >
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-slate-900 text-sm">{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                  </div>
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={!!settings[key]}
                      onChange={() => toggle(key)}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-6 rounded-full transition-colors ${settings[key] ? 'bg-amber-500' : 'bg-slate-300'}`}
                      onClick={() => toggle(key)}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow mt-1 transition-transform ${settings[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3 uppercase tracking-wide">
              <Shield className="w-4 h-4 text-slate-500" />
              Custom Message to Customer
            </h3>
            <textarea
              value={settings.custom_message}
              onChange={(e) => setSettings(prev => ({ ...prev, custom_message: e.target.value }))}
              placeholder="Optional message displayed to the customer in the portal (e.g., special instructions, updates)..."
              rows={4}
              className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
            <Button
              onClick={() => saveMutation.mutate(settings)}
              style={{ backgroundColor: '#10b981' }}
              disabled={saveMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
