import type { LucideIcon } from 'lucide-react';
import type { ReactNode, InputHTMLAttributes } from 'react';

interface FloatingInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  icon: LucideIcon;
  error?: string;
  rightElement?: ReactNode;
}

export const FloatingInput = ({
  label,
  icon: Icon,
  error,
  rightElement,
  id,
  ...inputProps
}: FloatingInputProps) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <div className="relative">
        <Icon
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors duration-200 pointer-events-none ${
            error ? 'text-red-400' : 'text-slate-400 peer-focus:text-blue-500'
          }`}
        />
        <input
          id={inputId}
          placeholder=" "
          className={`peer w-full pl-11 ${rightElement ? 'pr-12' : 'pr-4'} pt-5 pb-2 text-sm text-slate-900 bg-slate-50 border ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
              : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'
          } rounded-xl outline-none focus:ring-4 transition-all duration-200`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...inputProps}
        />
        <label
          htmlFor={inputId}
          className={`absolute left-11 transition-all duration-200 pointer-events-none
            peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm
            peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[11px]
            top-2.5 translate-y-0 text-[11px]
            ${error ? 'text-red-400' : 'text-slate-500 peer-focus:text-blue-500'}`}
        >
          {label}
        </label>
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
