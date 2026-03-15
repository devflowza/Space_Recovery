import React from 'react';
import { User, Building2, FileText, HardDrive, Cpu, CheckCircle2, XCircle, AlertTriangle, Wrench, HelpCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../lib/format';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import { getReportTypeConfig, getReportStatusConfig } from '../../lib/reportTypes';

interface CompanySettings {
  basic_info?: {
    company_name?: string;
    legal_name?: string;
    registration_number?: string;
    vat_number?: string;
  };
  location?: {
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    building_name?: string;
    unit_number?: string;
  };
  contact_info?: {
    phone_primary?: string;
    email_general?: string;
  };
  branding?: {
    logo_url?: string;
    brand_tagline?: string;
    qr_code_report_url?: string;
    qr_code_report_caption?: string;
    qr_code_general_url?: string;
    qr_code_general_caption?: string;
  };
  online_presence?: {
    website?: string;
  };
}

interface ReportSection {
  id: string;
  section_key: string;
  section_title: string;
  section_content: string;
  section_order: number;
}

interface ReportDocumentProps {
  report: Record<string, unknown>;
  sections: ReportSection[];
  caseData?: Record<string, unknown>;
  customerData?: Record<string, unknown>;
  companySettings: CompanySettings | null;
  deviceData?: Record<string, unknown>;
  diagnosticsData?: Record<string, unknown>;
  chainOfCustodyEvents?: Record<string, unknown>[];
  elementId?: string;
  t: (key: string, fallback: string) => string;
}

export const ReportDocument: React.FC<ReportDocumentProps> = ({
  report,
  sections,
  caseData,
  customerData,
  companySettings,
  deviceData,
  diagnosticsData,
  chainOfCustodyEvents,
  elementId = 'print-frame',
  t,
}) => {
  if (!report) return null;

  const typeConfig = getReportTypeConfig(report.report_type);
  const statusConfig = getReportStatusConfig(report.status);
  const TypeIcon = typeConfig.icon;

  const getReportTypeTranslation = (reportType: string): string => {
    const translationMap: Record<string, { key: string; fallback: string }> = {
      evaluation: { key: 'evaluationReport', fallback: 'EVALUATION REPORT' },
      service: { key: 'serviceReport', fallback: 'SERVICE REPORT' },
      server: { key: 'serverReport', fallback: 'SERVER RECOVERY REPORT' },
      malware: { key: 'malwareReport', fallback: 'MALWARE ANALYSIS REPORT' },
      forensic: { key: 'forensicReport', fallback: 'FORENSIC ANALYSIS REPORT' },
      data_destruction: { key: 'dataDestructionReport', fallback: 'DATA DESTRUCTION CERTIFICATE' },
      prevention: { key: 'preventionReport', fallback: 'PREVENTION & STRATEGY REPORT' },
    };

    const mapping = translationMap[reportType];
    return mapping ? t(mapping.key, mapping.fallback) : typeConfig.name.toUpperCase();
  };

  const customerName = customerData?.customer_name || caseData?.customer_name || 'N/A';

  const companyName = customerData?.company_name || caseData?.companies?.company_name || null;
  const customerEmail = customerData?.email || caseData?.customers_enhanced?.email || 'N/A';
  const customerPhone = customerData?.mobile_number || caseData?.customers_enhanced?.mobile_number || 'N/A';
  const clientReference = caseData?.client_reference || null;
  const preparedByName = caseData?.assigned_engineer?.full_name || caseData?.created_by_profile?.full_name || 'N/A';

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = sanitizeHtml(html);
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <div id={elementId}>
      <div className="report-printable-content space-y-2">
        {/* Professional Header with Company Logo and Details */}
        <div className="border-b border-red-600 pb-2.5 print-border">
          <div className="flex items-start justify-between">
            {/* Company Logo */}
            <div className="flex-shrink-0">
              {companySettings?.branding?.logo_url ? (
                <img
                  src={companySettings.branding.logo_url}
                  alt="Company Logo"
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-8 h-8 text-blue-600" />
                  <span className="text-base font-bold text-slate-900">
                    {companySettings?.basic_info?.company_name || 'Company Name'}
                  </span>
                </div>
              )}
            </div>

            {/* Company Contact Information */}
            <div className="text-right text-xs leading-tight">
              <h3 className="font-bold text-slate-900 text-sm mb-0.5">
                {companySettings?.basic_info?.company_name || 'Company Name'}
              </h3>
              {(companySettings?.basic_info?.registration_number || companySettings?.basic_info?.vat_number) && (
                <p className="text-slate-600 leading-tight">
                  {companySettings?.basic_info?.registration_number && `Reg No: ${companySettings.basic_info.registration_number}`}
                  {companySettings?.basic_info?.registration_number && companySettings?.basic_info?.vat_number && ' | '}
                  {companySettings?.basic_info?.vat_number && `VAT No: ${companySettings.basic_info.vat_number}`}
                </p>
              )}
              <div className="space-y-0.5">
                {companySettings?.location?.building_name && (
                  <p className="text-slate-700 leading-tight">{companySettings.location.building_name}</p>
                )}
                {companySettings?.location?.address_line1 && (
                  <p className="text-slate-700 leading-tight">{companySettings.location.address_line1}</p>
                )}
                {(companySettings?.location?.city || companySettings?.location?.country) && (
                  <p className="text-slate-700 leading-tight">
                    {companySettings?.location?.city}
                    {companySettings?.location?.city && companySettings?.location?.country && ', '}
                    {companySettings?.location?.country}
                  </p>
                )}
              </div>
              <div className="space-y-0.5">
                {companySettings?.contact_info?.email_general && (
                  <p className="text-blue-600 leading-tight">
                    {companySettings.contact_info.email_general}
                  </p>
                )}
                {companySettings?.contact_info?.phone_primary && (
                  <p className="text-slate-700 leading-tight">
                    {companySettings.contact_info.phone_primary}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Document Title */}
        <div className="text-center" style={{ marginBottom: '12px' }}>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {getReportTypeTranslation(report.report_type)}
          </h2>
          <div className="flex justify-center mt-1 hide-in-pdf">
            <div className="flex gap-2">
              <Badge variant="custom" color={typeConfig.color}>
                {typeConfig.name}
              </Badge>
              <Badge variant="custom" color={statusConfig.color}>
                {statusConfig.label}
              </Badge>
              {report.version_number > 1 && (
                <Badge variant="secondary">v{report.version_number}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Customer and Report Details Side by Side */}
        <div className="grid grid-cols-2 gap-3 items-stretch mt-2" style={{ marginBottom: '12px' }}>
          {/* Customer Information */}
          <div className="border border-blue-200 rounded bg-blue-50 p-2 flex flex-col">
            <div className="section-title">
              <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">{t('customerInformation', 'Customer Information')}</h3>
            </div>
            <div className="space-y-1 text-xs">
              {companyName && (
                <div className="flex">
                  <span className="font-semibold text-slate-700 w-24 flex-shrink-0">Company:</span>
                  <span className="text-slate-900 flex-1">{companyName}</span>
                </div>
              )}
              <div className="flex">
                <span className="font-semibold text-slate-700 w-24 flex-shrink-0">Name:</span>
                <span className="text-slate-900 flex-1">{customerName}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-slate-700 w-24 flex-shrink-0">Phone:</span>
                <span className="text-slate-900 flex-1">{customerPhone}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-slate-700 w-24 flex-shrink-0">Email:</span>
                <span className="text-blue-600 flex-1 break-words">{customerEmail}</span>
              </div>
              {clientReference && (
                <div className="flex">
                  <span className="font-semibold text-slate-700 w-24 flex-shrink-0">Client Ref:</span>
                  <span className="text-slate-900 flex-1">{clientReference}</span>
                </div>
              )}
            </div>
          </div>

          {/* Report Details */}
          <div className="border border-blue-200 rounded bg-blue-50 p-2 flex flex-col">
            <div className="section-title">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">{t('reportDetails', 'Report Details')}</h3>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex">
                <span className="font-semibold text-slate-700 w-28 flex-shrink-0">Report No:</span>
                <span className="text-slate-900 font-mono flex-1">{report.report_number || 'Draft'}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-slate-700 w-28 flex-shrink-0">Prepared By:</span>
                <span className="text-slate-900 flex-1">{preparedByName}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-slate-700 w-28 flex-shrink-0">Created Date:</span>
                <span className="text-slate-900 flex-1">{formatDate(report.created_at)}</span>
              </div>
              {caseData?.case_no && (
                <div className="flex">
                  <span className="font-semibold text-slate-700 w-28 flex-shrink-0">Job ID:</span>
                  <span className="text-slate-900 flex-1">{caseData.case_no}</span>
                </div>
              )}
              <div className="flex">
                <span className="font-semibold text-slate-700 w-28 flex-shrink-0">Status:</span>
                <span className="text-slate-900 flex-1">{statusConfig.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Media Details Section (if available) */}
        {deviceData && (
          <div className="border border-slate-200 rounded bg-slate-50 p-2 mb-2">
            <div className="section-title mb-1.5">
              <HardDrive className="w-4 h-4 text-slate-600 flex-shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">{t('mediaDetails', 'Media Details')}</h3>
            </div>

            {/* Basic Device Information - Single Row with Pipe Separators */}
            <div className="bg-white rounded p-2 mb-2">
              <div className="flex items-center text-xs leading-tight">
                {deviceData.device_type && (
                  <>
                    <span className="font-semibold text-slate-700">Type:</span>
                    <span className="text-slate-900 ml-1">{deviceData.device_type}</span>
                  </>
                )}
                {deviceData.model && (
                  <>
                    <span className="mx-2 text-slate-400">|</span>
                    <span className="font-semibold text-slate-700">Model:</span>
                    <span className="text-slate-900 ml-1">{deviceData.model}</span>
                  </>
                )}
                {deviceData.capacity && (
                  <>
                    <span className="mx-2 text-slate-400">|</span>
                    <span className="font-semibold text-slate-700">Capacity:</span>
                    <span className="text-slate-900 ml-1">{deviceData.capacity}</span>
                  </>
                )}
                {deviceData.serial_number && (
                  <>
                    <span className="mx-2 text-slate-400">|</span>
                    <span className="font-semibold text-slate-700">Serial No:</span>
                    <span className="text-slate-900 font-mono ml-1">{deviceData.serial_number}</span>
                  </>
                )}
              </div>
            </div>

            {/* Component Diagnostics (if available) */}
            {diagnosticsData && (
              <div className="bg-white rounded p-2">
                <h4 className="font-semibold text-xs text-slate-700 mb-2 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" />
                  {t('componentDiagnostics', 'Component Diagnostics')}
                </h4>

                {/* HDD Components - Single Row with Pipe Separators */}
                {diagnosticsData.device_type_category === 'hdd' && (
                  <div className="flex items-center text-xs leading-tight">
                    {diagnosticsData.heads_status && (
                      <>
                        <span className="font-semibold text-slate-700">Heads:</span>
                        <span className="inline-flex items-center gap-0.5 ml-1">
                          {diagnosticsData.heads_status === 'good' && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                          {diagnosticsData.heads_status === 'bad' && <XCircle className="w-3 h-3 text-red-600" />}
                          {diagnosticsData.heads_status === 'partial' && <AlertTriangle className="w-3 h-3 text-yellow-600" />}
                          {diagnosticsData.heads_status === 'replacement' && <Wrench className="w-3 h-3 text-orange-600" />}
                          {diagnosticsData.heads_status === 'not_tested' && <HelpCircle className="w-3 h-3 text-gray-600" />}
                          <span className="text-slate-900">{diagnosticsData.heads_status}</span>
                        </span>
                      </>
                    )}
                    {diagnosticsData.pcb_status && (
                      <>
                        <span className="mx-2 text-slate-400">|</span>
                        <span className="font-semibold text-slate-700">PCB:</span>
                        <span className="inline-flex items-center gap-0.5 ml-1">
                          {diagnosticsData.pcb_status === 'good' && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                          {diagnosticsData.pcb_status === 'bad' && <XCircle className="w-3 h-3 text-red-600" />}
                          {diagnosticsData.pcb_status === 'partial' && <AlertTriangle className="w-3 h-3 text-yellow-600" />}
                          {diagnosticsData.pcb_status === 'replacement' && <Wrench className="w-3 h-3 text-orange-600" />}
                          {diagnosticsData.pcb_status === 'not_tested' && <HelpCircle className="w-3 h-3 text-gray-600" />}
                          <span className="text-slate-900">{diagnosticsData.pcb_status}</span>
                        </span>
                      </>
                    )}
                    {diagnosticsData.motor_status && (
                      <>
                        <span className="mx-2 text-slate-400">|</span>
                        <span className="font-semibold text-slate-700">Motor:</span>
                        <span className="inline-flex items-center gap-0.5 ml-1">
                          {diagnosticsData.motor_status === 'good' && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                          {diagnosticsData.motor_status === 'bad' && <XCircle className="w-3 h-3 text-red-600" />}
                          {diagnosticsData.motor_status === 'partial' && <AlertTriangle className="w-3 h-3 text-yellow-600" />}
                          {diagnosticsData.motor_status === 'replacement' && <Wrench className="w-3 h-3 text-orange-600" />}
                          {diagnosticsData.motor_status === 'not_tested' && <HelpCircle className="w-3 h-3 text-gray-600" />}
                          <span className="text-slate-900">{diagnosticsData.motor_status}</span>
                        </span>
                      </>
                    )}
                    {diagnosticsData.surface_status && (
                      <>
                        <span className="mx-2 text-slate-400">|</span>
                        <span className="font-semibold text-slate-700">Surface:</span>
                        <span className="inline-flex items-center gap-0.5 ml-1">
                          {diagnosticsData.surface_status === 'good' && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                          {diagnosticsData.surface_status === 'bad' && <XCircle className="w-3 h-3 text-red-600" />}
                          {diagnosticsData.surface_status === 'partial' && <AlertTriangle className="w-3 h-3 text-yellow-600" />}
                          {diagnosticsData.surface_status === 'replacement' && <Wrench className="w-3 h-3 text-orange-600" />}
                          {diagnosticsData.surface_status === 'not_tested' && <HelpCircle className="w-3 h-3 text-gray-600" />}
                          <span className="text-slate-900">{diagnosticsData.surface_status}</span>
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* SSD Components */}
                {diagnosticsData.device_type_category === 'ssd' && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {diagnosticsData.controller_status && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-700 w-20 flex-shrink-0">{t('controllerStatus', 'Controller')}:</span>
                        <span className="flex items-center gap-1">
                          {diagnosticsData.controller_status === 'good' && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                          {diagnosticsData.controller_status === 'bad' && <XCircle className="w-3 h-3 text-red-600" />}
                          {diagnosticsData.controller_status === 'partial' && <AlertTriangle className="w-3 h-3 text-yellow-600" />}
                          {diagnosticsData.controller_status === 'replacement' && <Wrench className="w-3 h-3 text-orange-600" />}
                          {diagnosticsData.controller_status === 'not_tested' && <HelpCircle className="w-3 h-3 text-gray-600" />}
                          <span className="text-slate-900">{diagnosticsData.controller_status}</span>
                        </span>
                      </div>
                    )}
                    {diagnosticsData.memory_chips_status && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-700 w-20 flex-shrink-0">{t('memoryChipsStatus', 'Memory Chips')}:</span>
                        <span className="flex items-center gap-1">
                          {diagnosticsData.memory_chips_status === 'good' && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                          {diagnosticsData.memory_chips_status === 'bad' && <XCircle className="w-3 h-3 text-red-600" />}
                          {diagnosticsData.memory_chips_status === 'partial' && <AlertTriangle className="w-3 h-3 text-yellow-600" />}
                          {diagnosticsData.memory_chips_status === 'replacement' && <Wrench className="w-3 h-3 text-orange-600" />}
                          {diagnosticsData.memory_chips_status === 'not_tested' && <HelpCircle className="w-3 h-3 text-gray-600" />}
                          <span className="text-slate-900">{diagnosticsData.memory_chips_status}</span>
                        </span>
                      </div>
                    )}
                    {diagnosticsData.controller_model && (
                      <div className="flex">
                        <span className="font-semibold text-slate-700 w-24 flex-shrink-0">{t('controllerModel', 'Controller Model')}:</span>
                        <span className="text-slate-900 flex-1">{diagnosticsData.controller_model}</span>
                      </div>
                    )}
                    {diagnosticsData.nand_type && (
                      <div className="flex">
                        <span className="font-semibold text-slate-700 w-24 flex-shrink-0">{t('nandType', 'NAND Type')}:</span>
                        <span className="text-slate-900 flex-1">{diagnosticsData.nand_type}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Physical Damage Notes */}
                {diagnosticsData.physical_damage_notes && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200">
                    <div className="flex items-center text-xs">
                      <span className="font-semibold text-slate-700">Physical Damage Notes:</span>
                      <span className="text-slate-900 ml-1">{diagnosticsData.physical_damage_notes}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Diagnostics Not Available Message */}
            {!diagnosticsData && (
              <div className="bg-yellow-50 rounded p-2 text-xs text-yellow-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{t('diagnosticNotAvailable', 'Detailed component diagnostics not available for this device')}</span>
              </div>
            )}
          </div>
        )}

        {/* Report Sections */}
        <div style={{ marginTop: '16px', marginBottom: '20px' }}>
          {(() => {
            const translationKeyMap: Record<string, string> = {
              'diagnostic_findings': 'diagnosticFindings',
              'proposed_solutions': 'proposedSolutions',
              'proposed_solution': 'proposedSolutions',
              'recovery_time': 'estimatedRecoveryTime',
              'estimated_recovery_time': 'estimatedRecoveryTime',
              'failure_cause_analysis': 'failureCauseAnalysis',
              'non_recovery_reasons': 'nonRecoveryReasons',
              'actions_taken': 'actionsTaken',
              'service_important_notes': 'serviceImportantNotes',
              'service_recommendations': 'serviceRecommendations',
              'important_notes': 'importantNotes',
              'recommendations': 'recommendations',
            };

            // Helper function to check if section has content
            const hasContent = (section: ReportSection) => {
              if (section.section_key === 'chain_of_custody') {
                return chainOfCustodyEvents && chainOfCustodyEvents.length > 0;
              }
              const content = section.section_content?.trim();
              return content && content.length > 0;
            };

            // Filter out empty sections
            const visibleSections = sections.filter(hasContent);

            // Separate important_notes and recommendations for side-by-side layout
            const importantNotesSection = visibleSections.find(s => s.section_key === 'important_notes');
            const recommendationsSection = visibleSections.find(s => s.section_key === 'recommendations');
            const otherSections = visibleSections.filter(
              s => s.section_key !== 'important_notes' && s.section_key !== 'recommendations'
            );

            const renderSection = (section: ReportSection, className: string = 'mb-3') => {
              const translationKey = translationKeyMap[section.section_key];
              const sectionTitle = translationKey
                ? t(translationKey, section.section_title)
                : section.section_title;

              return (
                <div key={section.id} className={className}>
                  <div className="bg-slate-100 border-b border-slate-300 px-2.5 py-1.5 rounded-t">
                    <h4 className="text-sm font-bold text-slate-900">{sectionTitle}</h4>
                  </div>
                  <div className="bg-white border border-slate-200 border-t-0 rounded-b p-2.5">
                    {section.section_key === 'chain_of_custody' && chainOfCustodyEvents && chainOfCustodyEvents.length > 0 ? (
                      <div className="space-y-2">
                        {chainOfCustodyEvents.map((event, idx) => (
                          <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-200">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-xs">{event.event_type}</span>
                              <span className="text-xs text-slate-500">
                                {formatDate(event.event_timestamp || event.event_date)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-700">{event.event_description}</div>
                            {event.actor && (
                              <div className="text-xs text-slate-600 mt-1">
                                By: {event.actor.full_name || 'Unknown'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="prose max-w-none text-xs text-slate-700 terms-content">
                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.section_content || '') }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <>
                {/* Render other sections (full width) */}
                {otherSections.map(section => renderSection(section))}

                {/* Render Important Notes and Recommendations side-by-side if both exist */}
                {(importantNotesSection || recommendationsSection) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    {importantNotesSection && (
                      <div>
                        {renderSection(importantNotesSection, '')}
                      </div>
                    )}
                    {recommendationsSection && (
                      <div>
                        {renderSection(recommendationsSection, '')}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Version Notes */}
        {report.version_notes && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3" style={{ marginTop: '16px' }}>
            <h4 className="text-xs font-bold text-blue-900 mb-1">Version Notes</h4>
            <div className="text-xs text-blue-800 terms-content">{report.version_notes}</div>
          </div>
        )}

        {/* Approval Section */}
        {report.approved_by && report.approved_at && (
          <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
            <h4 className="text-xs font-bold text-green-900 mb-1">Approval Information</h4>
            <div className="text-xs text-green-800">
              <p>Approved by: {report.approved_by_profile?.full_name || 'Unknown'}</p>
              <p>Date: {formatDate(report.approved_at)}</p>
            </div>
          </div>
        )}

        {/* Footer Section - Fixed at Bottom */}
        {(companySettings?.branding?.qr_code_general_url || companySettings?.branding?.brand_tagline || companySettings?.online_presence?.website) && (
          <>
            <hr className="qr-divider" />
            <div className="footer-qr">
              {companySettings?.branding?.qr_code_general_url && (
                <>
                  <img
                    src={companySettings.branding.qr_code_general_url}
                    alt="QR Code"
                    className="w-16 h-16 object-contain"
                    crossOrigin="anonymous"
                  />
                  {companySettings.branding.qr_code_general_caption && (
                    <p className="text-xs text-slate-600 max-w-[180px]">
                      {companySettings.branding.qr_code_general_caption}
                    </p>
                  )}
                </>
              )}
            </div>
            {(companySettings?.branding?.brand_tagline || companySettings?.online_presence?.website) && (
              <div className="footer-right">
                {companySettings?.branding?.brand_tagline && (
                  <p className="text-sm font-semibold text-blue-600 mb-0.5">
                    {companySettings.branding.brand_tagline}
                  </p>
                )}
                {companySettings?.online_presence?.website && (
                  <p className="text-xs text-slate-600">
                    {companySettings.online_presence.website}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
