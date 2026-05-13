import React from 'react';
import { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  backgroundColor?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  backgroundColor = 'rgb(var(--color-primary))',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-xl flex items-center justify-center ${className}`}
      style={{ backgroundColor }}
    >
      <Icon className={`${iconSizes[size]} text-white`} />
    </div>
  );
};
