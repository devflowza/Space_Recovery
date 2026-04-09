import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'custom';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  color,
  className = '',
  style,
}) => {
  const variantClasses = {
    default: 'bg-slate-100 text-slate-800',
    secondary: 'bg-slate-200 text-slate-700 ring-1 ring-slate-300',
    success: 'bg-green-100 text-green-800 ring-1 ring-green-200',
    warning: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
    danger: 'bg-red-100 text-red-800 ring-1 ring-red-200',
    info: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
    custom: '',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const computedStyle = style || (color && variant === 'custom' ? { backgroundColor: color + '20', color: color, border: `1px solid ${color}40` } : {});

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md transition-all ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      style={computedStyle}
    >
      {children}
    </span>
  );
};
