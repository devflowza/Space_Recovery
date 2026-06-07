import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { PaymentSummary } from '../../lib/invoicePermissions';

interface PaymentSummaryBarProps {
  summary: PaymentSummary;
  formatMoney: (amount: number) => string;
  className?: string;
}

/**
 * Total / Amount Paid / Outstanding + a payment-progress bar. Shared across the
 * invoice View and (via the same shape) other financial documents.
 */
export const PaymentSummaryBar: React.FC<PaymentSummaryBarProps> = ({ summary, formatMoney, className = '' }) => {
  const pct = Math.round(summary.progress * 100);
  const barColor = summary.settlement === 'paid' ? 'bg-success' : summary.isOverdue ? 'bg-danger' : 'bg-primary';

  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xs text-slate-500">Invoice Total</div>
          <div className="text-sm font-semibold text-slate-900 tabular-nums">{formatMoney(summary.total)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Amount Paid</div>
          <div className="text-sm font-semibold text-success tabular-nums">{formatMoney(summary.paid)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Outstanding</div>
          <div className="text-sm font-semibold text-warning tabular-nums">{formatMoney(summary.balance)}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-600">Payment Progress</span>
          <span className="font-medium text-slate-700 tabular-nums">{pct}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Payment progress"
        >
          <div className={`h-full rounded-full transition-[width] ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {summary.isOverdue && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-danger">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Overdue</span>
        </div>
      )}
    </div>
  );
};
