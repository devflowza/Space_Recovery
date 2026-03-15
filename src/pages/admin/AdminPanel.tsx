import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { StatsCard } from '../../components/ui/StatsCard';
import {
  Users,
  Activity,
  Database,
  FileText,
  Shield,
  AlertTriangle,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalLogs: number;
  recentErrors: number;
}

export const AdminPanel: React.FC = () => {
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalLogs: 0,
    recentErrors: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  const fetchStats = async () => {
    try {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: totalLogs } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { count: recentErrors } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'error')
        .gte('created_at', yesterday.toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalLogs: totalLogs || 0,
        recentErrors: recentErrors || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data: auditData, error: auditError } = await supabase
        .from('audit_trails')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (auditError) throw auditError;

      if (auditData && auditData.length > 0) {
        const userIds = [...new Set(auditData.map(a => a.user_id))];

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const profilesMap = new Map(
          (profilesData || []).map(p => [p.id, p])
        );

        const enrichedData = auditData.map(audit => ({
          ...audit,
          profiles: profilesMap.get(audit.user_id) || { full_name: 'Unknown' }
        }));

        setRecentActivity(enrichedData);
      } else {
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const quickActions = [
    {
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: Users,
      link: '/users',
      color: 'blue',
    },
    {
      title: 'Role Permissions',
      description: 'Configure module access for roles',
      icon: Shield,
      link: '/admin/role-permissions',
      color: 'blue',
    },
    {
      title: 'System Logs',
      description: 'View application logs and errors',
      icon: FileText,
      link: '/admin/logs',
      color: 'green',
    },
    {
      title: 'Audit Trails',
      description: 'Track user actions and changes',
      icon: Shield,
      link: '/admin/audit',
      color: 'orange',
    },
    {
      title: 'Database Management',
      description: 'Backup and restore database',
      icon: Database,
      link: '/admin/database',
      color: 'purple',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-600 mt-4">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
        <p className="text-slate-600 mt-1">System administration and monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          trend={`${stats.activeUsers} active`}
          trendDirection="up"
        />
        <StatsCard
          title="Active Sessions"
          value={stats.activeUsers}
          icon={Activity}
          trend="Currently online"
          trendDirection="neutral"
        />
        <StatsCard
          title="System Logs"
          value={stats.totalLogs}
          icon={FileText}
          trend="All time"
          trendDirection="neutral"
        />
        <StatsCard
          title="Recent Errors"
          value={stats.recentErrors}
          icon={AlertTriangle}
          trend="Last 24 hours"
          trendDirection={stats.recentErrors > 0 ? 'down' : 'up'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.link}
                    to={action.link}
                    className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-${action.color}-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-5 h-5 text-${action.color}-600`} />
                    </div>
                    <h3 className="font-medium text-slate-900 mb-1">{action.title}</h3>
                    <p className="text-xs text-slate-500">{action.description}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
              <Link
                to="/admin/audit"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">
                      <span className="font-medium">{activity.profiles?.full_name || 'Unknown'}</span>
                      {' '}
                      {activity.action_type}d {activity.table_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <p className="text-xs text-slate-500">
                        {format(new Date(activity.created_at), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
