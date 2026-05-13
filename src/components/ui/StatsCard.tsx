import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from './Card';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  color?: string;
}

const colorClasses = {
  blue: 'bg-info-muted text-info',
  green: 'bg-success-muted text-success',
  orange: 'bg-warning-muted text-warning',
  red: 'bg-danger-muted text-danger',
  purple: 'bg-accent text-accent-foreground',
  yellow: 'bg-warning-muted text-warning',
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
}) => {
  const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${colorClass}`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-sm font-medium ${trend.isPositive ? 'text-success' : 'text-danger'}`}>
              {trend.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {trend.value}%
            </div>
          )}
        </div>
        <h3 className="text-sm font-medium text-slate-600 mb-1">{title}</h3>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </div>
    </Card>
  );
};
