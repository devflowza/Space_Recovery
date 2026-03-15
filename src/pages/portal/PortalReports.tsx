import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { usePortalAuth } from '../../contexts/PortalAuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { getReportTypeConfig, getReportStatusConfig, type ReportType } from '../../lib/reportTypes';
import { reportPDFService } from '../../lib/reportPDFService';
import { format } from 'date-fns';

interface PortalReport {
  id: string;
  report_number: string;
  report_type: ReportType;
  title: string;
  status: string;
  version_number: number;
  created_at: string;
  sent_to_customer_at: string;
  customer_viewed_at: string | null;
  customer_downloaded_at: string | null;
  download_count: number;
  case_id: string;
  case: {
    case_number: string;
    service_type: string;
  };
}

export default function PortalReports() {
  const { customer } = usePortalAuth();
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: ['portal_reports', customer?.id],
    queryFn: async () => {
      if (!customer) return [];

      const { data, error } = await supabase
        .from('case_reports')
        .select(`
          id,
          report_number,
          report_type,
          title,
          status,
          version_number,
          created_at,
          sent_to_customer_at,
          customer_viewed_at,
          customer_downloaded_at,
          download_count,
          case_id,
          cases!inner(
            case_number,
            service_type,
            customer_id
          )
        `)
        .eq('visible_to_customer', true)
        .eq('cases.customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as unknown as PortalReport[];
    },
    enabled: !!customer
  });

  const handleView = async (reportId: string) => {
    setViewingReportId(reportId);

    await supabase
      .from('case_reports')
      .update({ customer_viewed_at: new Date().toISOString() })
      .eq('id', reportId)
      .is('customer_viewed_at', null);

    await refetch();
  };

  const handleDownload = async (report: PortalReport) => {
    try {
      setDownloadingReportId(report.id);
      await reportPDFService.downloadReportPDF(report.id, `${report.report_number}.pdf`);
      await refetch();
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setDownloadingReportId(null);
    }
  };

  const groupedReports = reports.reduce((acc, report) => {
    const caseNumber = report.case.case_number;
    if (!acc[caseNumber]) {
      acc[caseNumber] = [];
    }
    acc[caseNumber].push(report);
    return acc;
  }, {} as Record<string, PortalReport[]>);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        </div>
        <div className="text-center py-12 text-gray-500">Loading reports...</div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        </div>
        <Card>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No reports available</p>
            <p className="text-sm text-gray-400">Reports will appear here when they are ready</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-600 mt-1">
            View and download reports for your cases
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {reports.length} {reports.length === 1 ? 'report' : 'reports'}
        </div>
      </div>

      {Object.entries(groupedReports).map(([caseNumber, caseReports]) => (
        <Card key={caseNumber}>
          <div className="mb-4 pb-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Case {caseNumber}</h2>
            <p className="text-sm text-gray-600">{caseReports[0].case.service_type}</p>
          </div>

          <div className="space-y-3">
            {caseReports.map((report) => {
              const typeConfig = getReportTypeConfig(report.report_type);
              const statusConfig = getReportStatusConfig(report.status);
              const TypeIcon = typeConfig.icon;

              return (
                <div
                  key={report.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${typeConfig.color}20` }}
                      >
                        <TypeIcon className="w-5 h-5" style={{ color: typeConfig.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">{report.title}</h3>
                          {report.version_number > 1 && (
                            <Badge variant="secondary">v{report.version_number}</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                          <span className="font-mono">{report.report_number}</span>
                          <Badge style={{ backgroundColor: statusConfig.color, color: 'white' }}>
                            {statusConfig.label}
                          </Badge>
                          <Badge variant="secondary">{typeConfig.name}</Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            Sent: {format(new Date(report.sent_to_customer_at), 'MMM dd, yyyy')}
                          </span>
                          {report.customer_viewed_at && (
                            <span>
                              Viewed: {format(new Date(report.customer_viewed_at), 'MMM dd, yyyy')}
                            </span>
                          )}
                          {report.download_count > 0 && (
                            <span>Downloaded {report.download_count}x</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(report.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(report)}
                        disabled={downloadingReportId === report.id}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        {downloadingReportId === report.id ? 'Downloading...' : 'PDF'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {viewingReportId && (
        <PortalReportViewModal
          reportId={viewingReportId}
          onClose={() => setViewingReportId(null)}
        />
      )}
    </div>
  );
}

interface PortalReportViewModalProps {
  reportId: string;
  onClose: () => void;
}

function PortalReportViewModal({ reportId, onClose }: PortalReportViewModalProps) {
  const [report, setReport] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    try {
      setLoading(true);

      const [reportRes, sectionsRes] = await Promise.all([
        supabase.from('case_reports').select('*').eq('id', reportId).single(),
        supabase.from('case_report_sections').select('*').eq('report_id', reportId).order('section_order')
      ]);

      if (reportRes.data) setReport(reportRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !report) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8">Loading report...</div>
        </div>
      </div>
    );
  }

  const typeConfig = getReportTypeConfig(report.report_type);
  const TypeIcon = typeConfig.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <TypeIcon className="w-6 h-6" style={{ color: typeConfig.color }} />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{report.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{report.report_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.id} className="border-l-4 border-blue-500 pl-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">{section.section_title}</h3>
              <div
                className="prose max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: section.section_content || 'No content' }}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
