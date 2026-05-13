import React, { useEffect, useState } from 'react';
import { Calendar, Users, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';
import { logger } from '../../lib/logger';

export const AttendanceDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('attendance_date', today);

      if (error) throw error;

      const present = data?.filter(a => a.status === 'present').length || 0;
      const absent = data?.filter(a => a.status === 'absent').length || 0;
      const late = data?.filter(a => a.status === 'late').length || 0;
      const onLeave = data?.filter(a => a.status === 'on_leave').length || 0;

      setStats({ present, absent, late, onLeave });
    } catch (error) {
      logger.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-[1800px] mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-start gap-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-primary shadow-primary/40">
            <Calendar className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Attendance Management</h1>
            <p className="text-slate-600 text-base">
              Track and manage employee attendance for {format(new Date(), 'MMMM d, yyyy')}
            </p>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                <span className="text-slate-600">{stats.present} Present</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-danger"></div>
                <span className="text-slate-600">{stats.absent} Absent</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-warning"></div>
                <span className="text-slate-600">{stats.late} Late</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadStats}
            variant="secondary"
            disabled={loading}
            title="Refresh attendance"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-success-muted rounded-xl p-4 border border-success/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-success uppercase tracking-wide">Present</p>
              <p className="text-2xl font-bold text-success mt-1">{loading ? '...' : stats.present}</p>
            </div>
            <div className="w-10 h-10 bg-success rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-success-foreground" />
            </div>
          </div>
        </div>

        <div className="bg-danger-muted rounded-xl p-4 border border-danger/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-danger uppercase tracking-wide">Absent</p>
              <p className="text-2xl font-bold text-danger mt-1">{loading ? '...' : stats.absent}</p>
            </div>
            <div className="w-10 h-10 bg-danger rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-danger-foreground" />
            </div>
          </div>
        </div>

        <div className="bg-warning-muted rounded-xl p-4 border border-warning/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-warning uppercase tracking-wide">Late</p>
              <p className="text-2xl font-bold text-warning mt-1">{loading ? '...' : stats.late}</p>
            </div>
            <div className="w-10 h-10 bg-warning rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning-foreground" />
            </div>
          </div>
        </div>

        <div className="bg-info-muted rounded-xl p-4 border border-info/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-info uppercase tracking-wide">On Leave</p>
              <p className="text-2xl font-bold text-info mt-1">{loading ? '...' : stats.onLeave}</p>
            </div>
            <div className="w-10 h-10 bg-info rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-info-foreground" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Today's Attendance</h2>
              <Badge color="blue">{format(new Date(), 'EEEE')}</Badge>
            </div>
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>No attendance records for today</p>
              <p className="text-sm mt-2">Mark attendance to see employee check-in/check-out times</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
