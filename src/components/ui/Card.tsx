import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  borderColor?: string;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  hoverable?: boolean;
  variant?: 'default' | 'bordered' | 'outlined';
  role?: string;
  tabIndex?: number;
  'aria-label'?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  borderColor = 'transparent',
  onClick,
  onKeyDown,
  hoverable = false,
  variant = 'default',
  role,
  tabIndex,
  'aria-label': ariaLabel,
}) => {
  const baseClasses = 'bg-white rounded-lg transition-all duration-200';

  const variantClasses = {
    default: 'shadow-sm border-t-4',
    bordered: 'border border-slate-200',
    outlined: 'border-2',
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={role}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${hoverable ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer' : ''}
        ${className}
      `}
      style={variant === 'default' ? { borderTopColor: borderColor } : {}}
    >
      {children}
    </div>
  );
};
