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
    color: 'bg-info-muted text-info border-info/30',
    icon: HardDrive,
  },
  backup: {
    label: 'Backup',
    color: 'bg-success-muted text-success border-success/30',
    icon: Database,
  },
  donor: {
    label: 'Donor',
    color: 'bg-warning-muted text-warning border-warning/30',
    icon: Wrench,
  },
  clone: {
    label: 'Clone',
    color: 'bg-accent text-accent-foreground border-accent-foreground/20',
    icon: Copy,
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
        ${config.color} ${sizeClasses[size]} ${className}
      `}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </span>
  );
};
