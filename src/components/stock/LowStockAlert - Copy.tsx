import { AlertTriangle, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LowStockAlertProps {
  count: number;
  onDismiss?: () => void;
}

export function LowStockAlert({ count, onDismiss }: LowStockAlertProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
      <p className="flex-1 text-sm text-amber-800">
        <span className="font-semibold">{count} item{count !== 1 ? 's' : ''}</span> are running low on stock.
      </p>
      <Link
        to="/resources/stock?filter=low-stock"
        className="text-sm font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 whitespace-nowrap"
      >
        View Low Stock
      </Link>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-amber-100 transition-colors text-amber-600 hover:text-amber-800"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
