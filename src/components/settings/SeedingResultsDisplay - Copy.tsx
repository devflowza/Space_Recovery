import React from 'react';
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface TableSeedResult {
  tableName: string;
  tableLabel: string;
  status: 'seeded' | 'skipped' | 'error';
  beforeCount: number;
  afterCount: number;
  itemsInserted: number;
}

interface SeedingResultsDisplayProps {
  details?: TableSeedResult[];
  message: string;
  onClose?: () => void;
}

export const SeedingResultsDisplay: React.FC<SeedingResultsDisplayProps> = ({ details, message, onClose }) => {
  const seededTables = details?.filter(d => d.status === 'seeded') || [];
  const skippedTables = details?.filter(d => d.status === 'skipped') || [];
  const errorTables = details?.filter(d => d.status === 'error') || [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative">
      <div className="bg-green-50 border-b border-green-100 p-4 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-green-900">Seeding Completed Successfully!</p>
          <p className="text-sm text-green-700 mt-1">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-green-700 hover:text-green-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {seededTables.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Seeded Tables ({seededTables.length})
            </h4>
            <div className="space-y-2">
              {seededTables.map((table) => (
                <div
                  key={table.tableName}
                  className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-green-900">{table.tableLabel}</p>
                    <p className="text-sm text-green-700 mt-0.5">
                      {table.itemsInserted} items added
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-green-700">
                      {table.beforeCount} → {table.afterCount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {skippedTables.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Skipped Tables ({skippedTables.length})
            </h4>
            <div className="space-y-2">
              {skippedTables.map((table) => (
                <div
                  key={table.tableName}
                  className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-blue-900">{table.tableLabel}</p>
                    <p className="text-sm text-blue-700 mt-0.5">
                      Already has {table.beforeCount} items
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                      SKIPPED
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {errorTables.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              Errors ({errorTables.length})
            </h4>
            <div className="space-y-2">
              {errorTables.map((table) => (
                <div
                  key={table.tableName}
                  className="bg-red-50 border border-red-200 rounded-lg p-3"
                >
                  <p className="font-medium text-red-900">{table.tableLabel}</p>
                  <p className="text-sm text-red-700 mt-0.5">
                    Failed to seed
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
