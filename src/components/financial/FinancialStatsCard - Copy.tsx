import React from 'react';

interface FinancialStatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'amber' | 'red' | 'slate' | 'purple' | 'teal';
}

const colorClasses = {
  blue: {
    gradient: 'from-blue-50 to-blue-100',
    border: 'border-blue-200',
    text: 'text-blue-600',
    textValue: 'text-blue-900',
    iconBg: 'bg-blue-500',
  },
  green: {
    gradient: 'from-green-50 to-green-100',
    border: 'border-green-200',
    text: 'text-green-600',
    textValue: 'text-green-900',
    iconBg: 'bg-green-500',
  },
  orange: {
    gradient: 'from-orange-50 to-orange-100',
    border: 'border-orange-200',
    text: 'text-orange-600',
    textValue: 'text-orange-900',
    iconBg: 'bg-orange-500',
  },
  amber: {
    gradient: 'from-amber-50 to-amber-100',
    border: 'border-amber-200',
    text: 'text-amber-600',
    textValue: 'text-amber-900',
    iconBg: 'bg-amber-500',
  },
  red: {
    gradient: 'from-red-50 to-red-100',
    border: 'border-red-200',
    text: 'text-red-600',
    textValue: 'text-red-900',
    iconBg: 'bg-red-500',
  },
  slate: {
    gradient: 'from-slate-50 to-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-600',
    textValue: 'text-slate-900',
    iconBg: 'bg-slate-500',
  },
  purple: {
    gradient: 'from-purple-50 to-purple-100',
    border: 'border-purple-200',
    text: 'text-purple-600',
    textValue: 'text-purple-900',
    iconBg: 'bg-purple-500',
  },
  teal: {
    gradient: 'from-teal-50 to-teal-100',
    border: 'border-teal-200',
    text: 'text-teal-600',
    textValue: 'text-teal-900',
    iconBg: 'bg-teal-500',
  },
};

export const FinancialStatsCard: React.FC<FinancialStatsCardProps> = ({
  label,
  value,
  icon,
  color,
}) => {
  const colors = colorClasses[color];

  return (
    <div
      className={`bg-gradient-to-br ${colors.gradient} rounded-xl p-4 border ${colors.border}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-medium ${colors.text} uppercase tracking-wide`}>
            {label}
          </p>
          <p className={`text-2xl font-bold ${colors.textValue} mt-1`}>{value}</p>
        </div>
        <div className={`w-10 h-10 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
