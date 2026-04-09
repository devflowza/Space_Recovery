import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'large' | '2xl';
  maxWidth?: '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  icon?: React.ElementType;
  headerAction?: React.ReactNode;
  headerBadges?: React.ReactNode;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  maxWidth,
  icon: Icon,
  headerAction,
  headerBadges,
  showCloseButton = true,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    xs: 'max-w-sm',
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    large: 'max-w-4xl',
    '2xl': 'max-w-6xl',
  };

  const maxWidthClasses = {
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  };

  const widthClass = maxWidth ? maxWidthClasses[maxWidth] : sizeClasses[size];

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onMouseDown={handleBackdropClick}>
      <div className="no-print fixed inset-0 bg-black bg-opacity-50 pointer-events-none" />
      <div
        className={`relative bg-white rounded-lg shadow-xl ${widthClass} w-full mx-4 max-h-[90vh] flex flex-col pointer-events-auto`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="no-print flex items-center justify-between p-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              {Icon && <Icon className="w-5 h-5 text-blue-600" />}
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              {headerBadges && <div className="flex items-center gap-2 ml-2">{headerBadges}</div>}
            </div>
            <div className="flex items-center gap-2">
              {headerAction && <div>{headerAction}</div>}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}
        {!title && showCloseButton && (
          <button
            onClick={onClose}
            className="no-print absolute top-3 right-3 p-1.5 hover:bg-slate-100 rounded-lg transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
