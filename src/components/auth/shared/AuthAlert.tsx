import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface AuthAlertProps {
  tone?: 'danger' | 'success';
  children: ReactNode;
}

/**
 * Dark-canvas alert banner for the auth surface. The app's semantic status
 * tokens are tuned for light surfaces; on slate-950 they fall below contrast,
 * so this (lint-exempt) component owns the dark-legible variants.
 */
export const AuthAlert = ({ tone = 'danger', children }: AuthAlertProps) => {
  const isDanger = tone === 'danger';
  return (
    <div
      role={isDanger ? 'alert' : 'status'}
      className={`p-3 rounded-xl text-sm flex items-start gap-2 border ${
        isDanger
          ? 'bg-red-500/10 border-red-400/30 text-red-200'
          : 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
      }`}
    >
      {isDanger
        ? <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
        : <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />}
      <span className="min-w-0">{children}</span>
    </div>
  );
};
