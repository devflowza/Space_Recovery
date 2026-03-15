import React from 'react';
import { HardDrive, Database, Wrench, Copy } from 'lucide-react';

interface DeviceRoleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  roles: Array<{ id: number; name: string }>;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const roleIcons: Record<string, React.ElementType> = {
  patient: HardDrive,
  backup: Database,
  donor: Wrench,
  clone: Copy,
};

const roleColors: Record<string, string> = {
  patient: 'text-blue-600',
  backup: 'text-green-600',
  donor: 'text-amber-600',
  clone: 'text-purple-600',
};

export const DeviceRoleSelector: React.FC<DeviceRoleSelectorProps> = ({
  value,
  onChange,
  roles,
  disabled = false,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-sm py-1.5 px-2',
    md: 'text-base py-2 px-3',
    lg: 'text-lg py-2.5 px-4',
  };

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full border border-slate-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500
          appearance-none pr-10
          ${sizeClasses[size]}
        `}
      >
        <option value="">Select Role</option>
        {roles.map((role) => {
          const Icon = roleIcons[role.name.toLowerCase()] || HardDrive;
          return (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          );
        })}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {value && (() => {
          const selectedRole = roles.find((r) => r.id.toString() === value.toString());
          if (selectedRole) {
            const Icon = roleIcons[selectedRole.name.toLowerCase()] || HardDrive;
            const colorClass = roleColors[selectedRole.name.toLowerCase()] || 'text-slate-600';
            return <Icon className={`w-4 h-4 ${colorClass}`} />;
          }
          return null;
        })()}
      </div>
    </div>
  );
};
