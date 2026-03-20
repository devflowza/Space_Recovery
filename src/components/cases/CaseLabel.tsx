import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatDate } from '../../lib/format';
import { logger } from '../../lib/logger';

interface CaseLabelProps {
  caseId: string;
  caseNumber: string;
}

interface CaseData {
  id: string;
  case_no: string;
  priority: string;
  created_at: string;
  customer_id: string;
  customer?: {
    customer_name: string;
    mobile_number: string | null;
    customer_number: string;
  };
  devices?: Array<{
    device_type: { name: string } | null;
    serial_no: string | null;
  }>;
}

interface CompanySettings {
  basic_info?: {
    company_name?: string;
  };
  branding?: {
    qr_code_label_url?: string;
    qr_code_label_caption?: string;
  };
}

export const CaseLabel: React.FC<CaseLabelProps> = ({ caseId, caseNumber }) => {
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [casePriorities, setCasePriorities] = useState<Array<{ name: string; color: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [caseResult, settingsResult, prioritiesResult] = await Promise.all([
          supabase.from('cases').select('*').eq('id', caseId).single(),
          supabase.from('company_settings').select('*').eq('id', 1).single(),
          supabase.from('master_case_priorities').select('name, color').eq('is_active', true).order('sort_order'),
        ]);

        if (caseResult.error) throw caseResult.error;
        if (settingsResult.error) throw settingsResult.error;
        if (prioritiesResult.error) throw prioritiesResult.error;

        const caseInfo = caseResult.data;
        setCompanySettings(settingsResult.data);
        setCasePriorities(prioritiesResult.data || []);

        const [customerResult, devicesResult] = await Promise.all([
          caseInfo.customer_id
            ? supabase
                .from('customers_enhanced')
                .select('customer_name, mobile_number, customer_number')
                .eq('id', caseInfo.customer_id)
                .single()
            : Promise.resolve({ data: null }),
          supabase
            .from('case_devices')
            .select('device_type_id, serial_no')
            .eq('case_id', caseId),
        ]);

        const devicesWithTypes = await Promise.all(
          (devicesResult.data || []).map(async (device) => {
            if (!device.device_type_id) return { ...device, device_type: null };

            const deviceTypeResult = await supabase
              .from('catalog_device_types')
              .select('name')
              .eq('id', device.device_type_id)
              .single();

            return {
              ...device,
              device_type: deviceTypeResult.data,
            };
          })
        );

        setCaseData({
          ...caseInfo,
          customer: customerResult.data,
          devices: devicesWithTypes,
        });
      } catch (error) {
        logger.error('Error fetching label data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-2 text-sm">Loading label...</p>
        </div>
      </div>
    );
  }

  if (!caseData || !companySettings) {
    return (
      <div className="p-4 text-center text-red-600 text-sm">
        Error loading label data. Please try again.
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    const priorityItem = casePriorities.find(
      p => p.name.toLowerCase() === priority.toLowerCase()
    );
    return priorityItem?.color || '#6b7280';
  };

  return (
    <div className="case-label bg-white p-6 max-w-[100mm] mx-auto border-4 border-slate-900">
      <div className="label-header text-center mb-4 pb-4 border-b-2 border-slate-900">
        <div className="text-xs font-semibold text-slate-600 mb-1">
          {companySettings.basic_info?.company_name || 'Data Recovery Center'}
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-2">{caseData.case_no}</div>
        <div
          className="inline-block px-3 py-1 rounded text-xs font-bold text-white uppercase"
          style={{ backgroundColor: getPriorityColor(caseData.priority) }}
        >
          {caseData.priority} Priority
        </div>
      </div>

      <div className="label-body space-y-3">
        <div>
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
            Customer
          </div>
          <div className="text-base font-bold text-slate-900">
            {caseData.customer?.customer_name || 'N/A'}
          </div>
          <div className="text-xs text-slate-600">
            {caseData.customer?.customer_number || ''}
          </div>
          {caseData.customer?.mobile_number && (
            <div className="text-xs text-slate-600 mt-0.5">
              📞 {caseData.customer.mobile_number}
            </div>
          )}
        </div>

        {caseData.devices && caseData.devices.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
              Device{caseData.devices.length > 1 ? 's' : ''}
            </div>
            {caseData.devices.map((device, index) => (
              <div key={index} className="text-sm text-slate-900 mb-1">
                <div className="font-semibold">
                  {device.device_type?.name || 'Unknown Device'} {index === 0 && '(Patient)'}
                </div>
                {device.serial_no && (
                  <div className="text-xs font-mono text-slate-700">S/N: {device.serial_no}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
            Check-In Date
          </div>
          <div className="text-sm text-slate-900">{formatDate(caseData.created_at)}</div>
        </div>
      </div>

      {companySettings.branding?.qr_code_label_url && (
        <div className="label-footer mt-4 pt-4 border-t-2 border-slate-900 text-center">
          <img
            src={companySettings.branding.qr_code_label_url}
            alt="QR Code"
            className="w-20 h-20 mx-auto"
          />
          {(companySettings.branding.qr_code_label_caption || 'Scan to track your case') && (
            <p className="text-xs text-slate-600 text-center mt-2 max-w-[100px] mx-auto">
              {companySettings.branding.qr_code_label_caption || 'Scan to track your case'}
            </p>
          )}
        </div>
      )}

      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .case-label {
            max-width: 100mm;
            margin: 0;
            page-break-after: avoid;
          }
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};
