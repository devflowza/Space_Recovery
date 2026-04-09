import React from 'react';
import { X, FileText, Wrench, Server, Shield, Scale, Trash2, AlertTriangle } from 'lucide-react';
import { REPORT_TYPES, type ReportType } from '../../lib/reportTypes';

interface ReportTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: ReportType) => void;
  caseNumber: string;
  serviceType?: string;
}

export function ReportTypeSelectionModal({
  isOpen,
  onClose,
  onSelectType,
  caseNumber,
  serviceType = 'Data Recovery',
}: ReportTypeSelectionModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Create New Report</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Case Info */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="text-sm text-blue-600 font-medium mb-0.5">Service: {serviceType}</div>
          <div className="text-sm text-slate-600">Case: #{caseNumber}</div>
        </div>

        {/* Report Types List */}
        <div className="px-5 py-4">
          <div className="text-sm font-medium text-slate-700 mb-3">Select Report Type</div>
          <div className="space-y-1">
            {Object.values(REPORT_TYPES).map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.key}
                  onClick={() => onSelectType(type.key)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left border border-transparent hover:border-slate-200"
                >
                  <Icon className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-900">{type.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
