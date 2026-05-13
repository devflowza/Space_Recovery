import React from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  hint,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm0 9a.75.75 0 110-1.5A.75.75 0 016 9zm.75-3.75a.75.75 0 11-1.5 0V3.75a.75.75 0 111.5 0v1.5z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};
