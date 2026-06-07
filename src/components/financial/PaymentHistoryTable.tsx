import React from 'react';
import { Receipt } from 'lucide-react';
import type { PaymentHistoryEntry } from '../../lib/invoiceService';

interface PaymentHistoryTableProps {
  entries: PaymentHistoryEntry[];
  formatMoney: (amount: number) => string;
  formatDate: (date: string | null) => string;
}

const STATUS_CLASS: Record<string, string> = {
  completed: 'bg-success-muted text-success',
  pending: 'bg-warning-muted text-warning',
  failed: 'bg-danger-muted text-danger',
  refunded: 'bg-danger-muted text-danger',
};

const StatusChip: React.FC<{ status: string | null }> = ({ status }) => {
  if (!status) return <span className="text-slate-400">—</span>;
  const cls = STATUS_CLASS[status] ?? 'bg-slate-100 text-slate-600';
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium capitalize ${cls}`}>{status}</span>;
};

/**
 * The full payment trail for a financial document: date, amount, method,
 * reference, transaction id, recorded-by, status, notes. Supports multiple and
 * partial payments; renders a helpful empty state.
 */
export const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({ entries, formatMoney, formatDate }) => {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center">
        <Receipt className="mx-auto mb-2 h-6 w-6 text-slate-300" />
        <p className="text-sm text-slate-500">No payments recorded yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
            <th scope="col" className="px-3 py-2 font-medium">Date</th>
            <th scope="col" className="px-3 py-2 font-medium">Method</th>
            <th scope="col" className="px-3 py-2 font-medium">Reference</th>
            <th scope="col" className="px-3 py-2 font-medium">Transaction ID</th>
            <th scope="col" className="px-3 py-2 font-medium">Recorded by</th>
            <th scope="col" className="px-3 py-2 font-medium">Status</th>
            <th scope="col" className="px-3 py-2 font-medium">Notes</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-slate-100 last:border-0 align-top">
              <td className="px-3 py-2 whitespace-nowrap text-slate-700 tabular-nums">{formatDate(e.payment_date)}</td>
              <td className="px-3 py-2 text-slate-700">{e.method ?? '—'}</td>
              <td className="px-3 py-2 text-slate-700">{e.reference ?? '—'}</td>
              <td className="px-3 py-2 font-mono text-xs text-slate-500">{e.transaction_id ?? '—'}</td>
              <td className="px-3 py-2 text-slate-700">{e.recorded_by ?? '—'}</td>
              <td className="px-3 py-2"><StatusChip status={e.status} /></td>
              <td className="px-3 py-2 max-w-[16rem] truncate text-slate-500" title={e.notes ?? undefined}>{e.notes ?? '—'}</td>
              <td className="px-3 py-2 text-right font-medium text-slate-900 tabular-nums whitespace-nowrap">{formatMoney(e.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
