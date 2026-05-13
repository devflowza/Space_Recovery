import React from 'react';
import { Copy, X, AlertTriangle, Info } from 'lucide-react';
import { Button } from '../ui/Button';

interface DuplicateCaseConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  originalCaseNumber: string;
  customerName: string;
  serviceName: string;
  isLoading?: boolean;
}

export const DuplicateCaseConfirmationModal: React.FC<DuplicateCaseConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  originalCaseNumber,
  customerName,
  serviceName,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Copy className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Confirm Case Duplication</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-4 p-3 bg-info-muted border-l-4 border-info rounded">
            <div className="flex gap-2">
              <Info className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
              <p className="text-sm text-info">
                This will create an exact copy of the case with a new job number. The original case will not be changed.
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-slate-600">Original Job:</span>
              <span className="text-sm font-semibold text-slate-900">#{originalCaseNumber}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-slate-600">Customer:</span>
              <span className="text-sm font-semibold text-slate-900">{customerName}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-slate-600">Service:</span>
              <span className="text-sm font-semibold text-slate-900">{serviceName}</span>
            </div>
          </div>

          <div className="mb-5 p-3 bg-warning-muted border border-warning/30 rounded-lg">
            <div className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warning">
                The new job will be set to 'Received' status and all devices will be marked as 'In Lab'.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              style={{ backgroundColor: 'rgb(var(--color-primary))' }}
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {isLoading ? 'Duplicating...' : 'Confirm Duplicate'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
