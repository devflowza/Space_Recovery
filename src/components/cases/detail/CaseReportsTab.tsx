import React from 'react';
import { FileText, Plus, User, Calendar, CheckCircle2, Send, Eye } from 'lucide-react';
import { CreditCard as Edit } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { REPORT_TYPES, getReportTypeConfig, getReportStatusConfig, type ReportType, type ReportStatus } from '../../../lib/reportTypes';
import { formatDate } from '../../../lib/format';

interface CaseReportsTabProps {
  reports: any[];
  reportTypeFilter: ReportType | 'all';
  reportStatusFilter: ReportStatus | 'all';
  showLatestOnly: boolean;
  onSetShowReportTypeSelector: (v: boolean) => void;
  onSetReportTypeFilter: (v: ReportType | 'all') => void;
  onSetReportStatusFilter: (v: ReportStatus | 'all') => void;
  onSetShowLatestOnly: (v: boolean) => void;
  onSetViewReportId: (id: string | null) => void;
  onSetEditingReport: (report: any) => void;
}

export const CaseReportsTab: React.FC<CaseReportsTabProps> = ({
  reports,
  reportTypeFilter,
  reportStatusFilter,
  showLatestOnly,
  onSetShowReportTypeSelector,
  onSetReportTypeFilter,
  onSetReportStatusFilter,
  onSetShowLatestOnly,
  onSetViewReportId,
  onSetEditingReport,
}) => {
  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Case Reports</h2>
          <Button
            style={{ backgroundColor: '#3b82f6' }}
            size="sm"
            onClick={() => onSetShowReportTypeSelector(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Report
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-50 rounded-lg">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-700 mb-1">Report Type</label>
            <select
              value={reportTypeFilter}
              onChange={(e) => onSetReportTypeFilter(e.target.value as ReportType | 'all')}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {Object.values(REPORT_TYPES).map((type) => (
                <option key={type.key} value={type.key}>{type.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
            <select
              value={reportStatusFilter}
              onChange={(e) => onSetReportStatusFilter(e.target.value as ReportStatus | 'all')}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="review">In Review</option>
              <option value="approved">Approved</option>
              <option value="sent">Sent</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLatestOnly}
                onChange={(e) => onSetShowLatestOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Latest versions only</span>
            </label>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-16 h-16 mx-auto mb-3 text-slate-300" />
            <p className="text-lg font-medium mb-1">No reports found</p>
            <p className="text-sm">Create your first report to get started</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {reports.map((report: any) => {
              const typeConfig = getReportTypeConfig(report.report_type);
              const statusConfig = getReportStatusConfig(report.status);
              const TypeIcon = typeConfig.icon;

              return (
                <div
                  key={report.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <TypeIcon className="w-8 h-8" style={{ color: typeConfig.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 text-lg mb-1">{report.title}</h3>
                          <p className="text-sm text-slate-600">
                            {report.report_number}
                            {report.version_number > 1 && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                                v{report.version_number}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-end gap-2 mr-2">
                            <Badge style={{ backgroundColor: statusConfig.color, color: 'white' }}>
                              {statusConfig.label}
                            </Badge>
                            {report.visible_to_customer && (
                              <Badge variant="success" size="sm">
                                <Eye className="w-3 h-3 mr-1" />
                                Visible to Customer
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => onSetViewReportId(report.id)}
                              title="View Report"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {report.status === 'draft' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => onSetEditingReport(report)}
                                title="Edit Report"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {report.created_by_profile?.full_name || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(report.created_at)}
                        </span>
                        {report.approved_at && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            Approved
                          </span>
                        )}
                        {report.sent_to_customer_at && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Send className="w-4 h-4" />
                            Sent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
