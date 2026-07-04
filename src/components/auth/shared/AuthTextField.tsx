import type { LucideIcon } from 'lucide-react';
import type { ReactNode, InputHTMLAttributes } from 'react';

interface AuthTextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  icon: LucideIcon;
  error?: string;
  rightElement?: ReactNode;
}

/**
 * Dark-glass floating-label input for the auth canvas. RTL-safe: all offsets
 * use logical properties (ps/pe/start/end) so the field mirrors correctly.
 */
export const AuthTextField = ({
  label,
  icon: Icon,
  error,
  rightElement,
  id,
  ...inputProps
}: AuthTextFieldProps) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <div className="relative">
        <input
          id={inputId}
          placeholder=" "
          className={`peer w-full ps-11 ${rightElement ? 'pe-12' : 'pe-4'} pt-5 pb-2 text-sm text-white bg-white/[0.06] border ${
            error
              ? 'border-red-400/50 focus:border-red-400 focus:ring-red-400/15'
              : 'border-white/10 focus:border-sky-400/60 focus:ring-sky-400/15'
          } rounded-xl outline-none focus:ring-4 transition-all duration-200 autofill:shadow-[inset_0_0_0_1000px_rgb(15,23,42)]`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...inputProps}
        />
        <Icon
          aria-hidden="true"
          className={`absolute start-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors duration-200 pointer-events-none ${
            error ? 'text-red-300' : 'text-slate-500 peer-focus:text-sky-300'
          }`}
        />
        <label
          htmlFor={inputId}
          className={`absolute start-11 transition-all duration-200 pointer-events-none
            peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm
            peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-xs
            top-2.5 translate-y-0 text-xs
            ${error ? 'text-red-300' : 'text-slate-400 peer-focus:text-sky-300'}`}
        >
          {label}
        </label>
        {rightElement && (
          <div className="absolute end-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
