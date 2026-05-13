import { CheckCircle, XCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  duration?: number;
  onClose?: () => void;
}

const toastConfig = {
  success: {
    bgColor: 'bg-success-muted',
    textColor: 'text-success',
    borderColor: 'border-success',
    progressColor: 'bg-success',
    Icon: CheckCircle,
    iconColor: 'text-success',
  },
  error: {
    bgColor: 'bg-danger-muted',
    textColor: 'text-danger',
    borderColor: 'border-danger',
    progressColor: 'bg-danger',
    Icon: XCircle,
    iconColor: 'text-danger',
  },
  warning: {
    bgColor: 'bg-warning-muted',
    textColor: 'text-warning',
    borderColor: 'border-warning',
    progressColor: 'bg-warning',
    Icon: AlertTriangle,
    iconColor: 'text-warning',
  },
  info: {
    bgColor: 'bg-info-muted',
    textColor: 'text-info',
    borderColor: 'border-info',
    progressColor: 'bg-info',
    Icon: Info,
    iconColor: 'text-info',
  },
  loading: {
    bgColor: 'bg-info-muted',
    textColor: 'text-info',
    borderColor: 'border-info',
    progressColor: 'bg-info',
    Icon: Loader2,
    iconColor: 'text-info',
  },
};

export const Toast = ({ message, type, duration, onClose }: ToastProps) => {
  const [progress, setProgress] = useState(100);
  const config = toastConfig[type];
  const { Icon, bgColor, textColor, borderColor, progressColor, iconColor } = config;
  const showProgress = type !== 'loading' && duration;

  useEffect(() => {
    if (!showProgress || !duration) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [duration, showProgress]);

  return (
    <div
      className={`
        ${bgColor} ${textColor}
        border-l-4 ${borderColor}
        rounded-lg shadow-lg
        max-w-md w-full
        overflow-hidden
        relative
      `}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={`${iconColor} flex-shrink-0 mt-0.5`}>
          <Icon
            className={`w-5 h-5 ${type === 'loading' ? 'animate-spin' : ''}`}
            strokeWidth={2}
          />
        </div>

        <div className="flex-1 text-sm leading-relaxed font-medium">
          {message}
        </div>

        {type !== 'loading' && onClose && (
          <button
            onClick={onClose}
            className={`${textColor} hover:opacity-70 transition-opacity flex-shrink-0 -mt-0.5 -mr-1`}
            aria-label="Close notification"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {showProgress && (
        <div className="h-0.5 w-full bg-black/5">
          <div
            className={`h-full ${progressColor} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
