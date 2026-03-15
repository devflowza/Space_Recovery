import React from 'react';
import { HardDrive, Database, Wrench, Copy } from 'lucide-react';

interface DeviceRoleBadgeProps {
  role: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const roleConfig = {
  patient: {
    label: 'Patient',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: HardDrive,
    darkColor: 'dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  },
  backup: {
    label: 'Backup',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: Database,
    darkColor: 'dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  },
  donor: {
    label: 'Donor',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Wrench,
    darkColor: 'dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  },
  clone: {
    label: 'Clone',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: Copy,
    darkColor: 'dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  },
};

export const DeviceRoleBadge: React.FC<DeviceRoleBadgeProps> = ({
  role,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const normalizedRole = role?.toLowerCase() || 'patient';
  const config = roleConfig[normalizedRole as keyof typeof roleConfig] || roleConfig.patient;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-md border
        ${config.color} ${config.darkColor} ${sizeClasses[size]} ${className}
      `}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </span>
  );
};
