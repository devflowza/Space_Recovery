import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Tag, Database, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { platformAdminKeys } from '../../lib/queryKeys';

interface SettingsCard {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  countLabel?: string;
}

const settingsCards: SettingsCard[] = [
  {
    title: 'Subscription Plans',
    description: 'Create and manage pricing plans, features, and limits',
    icon: CreditCard,
    path: '/platform-admin/plans',
    countLabel: 'plans',
  },
  {
    title: 'Coupons',
    description: 'Manage discount codes and promotional offers',
    icon: Tag,
    path: '/platform-admin/coupons',
    countLabel: 'coupons',
  },
  {
    title: 'System Settings',
    description: 'Global platform configuration and defaults',
    icon: Database,
    path: '',
    countLabel: 'settings',
  },
  {
    title: 'Audit Logs',
    description: 'Platform-wide admin action audit trail',
    icon: Shield,
    path: '',
    countLabel: 'audit',
  },
];

export const PlatformSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: counts } = useQuery({
    queryKey: platformAdminKeys.settingsCounts(),
    queryFn: async () => {
      const [plansResult, couponsResult] = await Promise.all([
        supabase.from('subscription_plans').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('billing_coupons').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      ]);
      return {
        plans: plansResult.count || 0,
        coupons: couponsResult.count || 0,
        settings: 0,
        audit: 0,
      };
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
        <p className="text-slate-600 mt-1">Configure platform-wide settings and manage subscription plans</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCards.map((card) => {
          const Icon = card.icon;
          const count = counts?.[card.countLabel as keyof typeof counts] ?? null;
          const isDisabled = !card.path;

          return (
            <button
              key={card.title}
              onClick={() => card.path && navigate(card.path)}
              disabled={isDisabled}
              className={`text-left p-6 bg-white rounded-xl border transition-all ${
                isDisabled
                  ? 'border-slate-100 opacity-50 cursor-not-allowed'
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                {count !== null && count > 0 && (
                  <span className="text-sm font-medium text-slate-500">{count} items</span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">{card.title}</h3>
              <p className="text-sm text-slate-500">{card.description}</p>
              {isDisabled && (
                <span className="inline-block mt-3 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  Coming Soon
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
