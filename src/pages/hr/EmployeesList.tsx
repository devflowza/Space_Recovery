import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Users, RefreshCw } from 'lucide-react';
import { EmptyState } from '../../components/shared/EmptyState';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Database } from '../../types/database.types';

type Employee = Database['public']['Tables']['employees']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  departments: Database['public']['Tables']['departments']['Row'] | null;
  positions: Database['public']['Tables']['positions']['Row'] | null;
};

export const EmployeesList: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          profiles (*),
          departments (*),
          positions (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'on_leave':
        return 'orange';
      case 'suspended':
        return 'red';
      case 'terminated':
        return 'gray';
      default:
        return 'blue';
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.departments?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeEmployees = employees.filter(emp => emp.employment_status === 'active');
  const onLeaveEmployees = employees.filter(emp => emp.employment_status === 'on_leave');

  return (
    <div className="p-8 max-w-[1800px] mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-start gap-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: '#3b82f6',
              boxShadow: '0 10px 40px -10px #3b82f680',
            }}
          >
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Employees</h1>
            <p className="text-slate-600 text-base">
              Manage your organization's workforce
            </p>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-slate-600">{employees.length} Total Employees</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-slate-600">{activeEmployees.length} Active</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-slate-600">{onLeaveEmployees.length} On Leave</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadEmployees}
            variant="secondary"
            disabled={loading}
            title="Refresh employees list"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button style={{ backgroundColor: '#3b82f6' }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 mb-6">
        <div className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button variant="secondary">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4">Loading employees...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
          <EmptyState
            icon={Users}
            title="No employees found"
            description={
              searchTerm
                ? 'No employees found matching your search.'
                : 'No employees found. Add your first employee to get started.'
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
              onClick={() => navigate(`/hr/employees/${employee.id}`)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                      {employee.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{employee.profiles?.full_name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-slate-600">{employee.employee_number}</span>
                        {employee.positions && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-sm text-slate-600">{employee.positions.title}</span>
                          </>
                        )}
                        {employee.departments && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-sm text-slate-600">{employee.departments.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color={getStatusColor(employee.employment_status)}>
                      {employee.employment_status.replace('_', ' ')}
                    </Badge>
                    <Badge color="blue">
                      {employee.employment_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
