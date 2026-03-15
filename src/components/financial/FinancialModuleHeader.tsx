import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface Statistic {
  label: string;
  value: string | number;
  color: string;
}

interface FinancialModuleHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  statistics: Statistic[];
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  onRefresh?: () => void;
  isRefreshing?: boolean;
  iconBgColor?: string;
}

export const FinancialModuleHeader: React.FC<FinancialModuleHeaderProps> = ({
  icon,
  title,
  description,
  statistics,
  primaryAction,
  onRefresh,
  isRefreshing = false,
  iconBgColor = '#3b82f6',
}) => {
  return (
    <div className="mb-8 flex items-start justify-between">
      <div className="flex items-start gap-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
          style={{
            backgroundColor: iconBgColor,
            boxShadow: `0 10px 40px -10px ${iconBgColor}80`,
          }}
        >
          {icon}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
          <p className="text-slate-600 text-base">{description}</p>
          <div className="flex gap-4 mt-3">
            {statistics.map((stat, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stat.color }}
                ></div>
                <span className="text-slate-600">
                  {stat.value} {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {onRefresh && (
          <Button
            onClick={onRefresh}
            variant="secondary"
            disabled={isRefreshing}
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        )}
        {primaryAction && (
          <Button onClick={primaryAction.onClick} style={{ backgroundColor: '#3b82f6' }}>
            {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
};
