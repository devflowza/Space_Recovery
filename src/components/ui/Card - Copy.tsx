import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  borderColor?: string;
  onClick?: () => void;
  hoverable?: boolean;
  variant?: 'default' | 'bordered' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  borderColor = 'transparent',
  onClick,
  hoverable = false,
  variant = 'default',
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
