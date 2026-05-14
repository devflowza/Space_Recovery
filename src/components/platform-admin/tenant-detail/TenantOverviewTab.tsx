import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, Building2, MapPin, CreditCard, Calendar, Activity, Users as UsersIcon, Briefcase, HardDrive } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { getHealthMetricsHistory } from '@/lib/platformAdminService';
import { platformAdminKeys } from '@/lib/queryKeys';
import { formatDistanceToNow } from 'date-fns';
import type { Database } from '@/types/database.types';

type Tenant = Database['public']['Tables']['tenants']['Row'];
type TenantSubscription = Database['public']['Tables']['tenant_subscriptions']['Row'];
type TenantHealthMetric = Database['public']['Tables']['tenant_health_metrics']['Row'];

interface TenantOverviewTabProps {
  tenant: Tenant;
  subscription?: TenantSubscription;
  health?: TenantHealthMetric;
  userCount?: number;
  caseCount?: number;
}

export const TenantOverviewTab: React.FC<TenantOverviewTabProps> = ({
  tenant,
  subscription,
  health,
  userCount = 0,
  caseCount = 0,
}) => {
  const { data: healthHistory = [] } = useQuery({
    queryKey: platformAdminKeys.tenantHealthHistory(tenant.id),
    queryFn: () => getHealthMetricsHistory(tenant.id, 30),
  });

  const getChurnRiskColor = (risk?: string) => {
    switch (risk) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getEngagementColor = (level?: string) => {
    switch (level) {
      case 'very_high':
      case 'high': return 'success';
      case 'moderate': return 'info';
      case 'low': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  const userLimit = subscription?.user_limit || 0;
  const caseLimit = subscription?.case_limit || 0;
  const storageLimit = subscription?.storage_limit_gb || 0;
  const storageUsed = tenant.storage_used_gb || 0;

  const userPercentage = userLimit > 0 ? (userCount / userLimit) * 100 : 0;
  const casePercentage = caseLimit > 0 ? (caseCount / caseLimit) * 100 : 0;
  const storagePercentage = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-danger';
    if (percentage >= 75) return 'bg-warning';
    return 'bg-primary';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="text-sm font-medium text-slate-900">{tenant.email}</p>
            </div>
          </div>
          {tenant.phone && (
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p className="text-sm font-medium text-slate-900">{tenant.phone}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className="text-sm text-slate-500">Company</p>
              <p className="text-sm font-medium text-slate-900">{tenant.company_name}</p>
            </div>
          </div>
          {tenant.address && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">Address</p>
                <p className="text-sm font-medium text-slate-900">{tenant.address}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Subscription</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Plan</span>
            <Badge variant="info">
              {subscription?.plan_code?.toUpperCase() || 'None'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Status</span>
            <Badge variant={subscription?.status === 'active' ? 'success' : 'warning'}>
              {subscription?.status || 'None'}
            </Badge>
          </div>
          {subscription && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Billing Cycle</span>
                <span className="text-sm font-medium text-slate-900 capitalize">
                  {subscription.billing_interval}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-slate-500">Next Renewal</p>
                  <p className="text-sm font-medium text-slate-900">
                    {subscription.next_billing_date
                      ? new Date(subscription.next_billing_date).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-slate-500">MRR</p>
                  <p className="text-sm font-medium text-slate-900">
                    ${subscription.amount || 0}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Usage Statistics</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Users</span>
              </div>
              <span className="text-sm font-medium text-slate-900">
                {userCount} / {userLimit}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(userPercentage)}`}
                style={{ width: `${Math.min(userPercentage, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Cases</span>
              </div>
              <span className="text-sm font-medium text-slate-900">
                {caseCount} / {caseLimit}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(casePercentage)}`}
                style={{ width: `${Math.min(casePercentage, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Storage</span>
              </div>
              <span className="text-sm font-medium text-slate-900">
                {storageUsed.toFixed(2)} GB / {storageLimit} GB
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(storagePercentage)}`}
                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Health Score</h3>
        {health ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-slate-400" />
                <span className="text-4xl font-bold text-slate-900">{health.health_score}</span>
                <span className="text-sm text-slate-500">/100</span>
              </div>
              <Badge variant={getChurnRiskColor(health.churn_risk)}>
                {health.churn_risk?.toUpperCase()} Risk
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Engagement Level</span>
              <Badge variant={getEngagementColor(health.engagement_level)}>
                {health.engagement_level?.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            {healthHistory.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2">30-Day Trend</p>
                <div className="flex items-end gap-1 h-16">
                  {healthHistory.map((metric, i) => {
                    const height = (metric.health_score / 100) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-primary rounded-t"
                        style={{ height: `${height}%` }}
                        title={`${metric.health_score} on ${new Date(metric.recorded_at).toLocaleDateString()}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="text-xs text-slate-500 mt-2">
              Last updated {formatDistanceToNow(new Date(health.recorded_at))} ago
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No health data available</p>
        )}
      </Card>
    </div>
  );
};
