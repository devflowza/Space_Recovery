import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { User } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Table } from '../../ui/Table';
import { getTenantUsers } from '../../../lib/platformAdminService';
import { platformAdminKeys } from '../../../lib/queryKeys';
import { formatDistanceToNow } from 'date-fns';

interface TenantUsersTabProps {
  tenantId: string;
}

export const TenantUsersTab: React.FC<TenantUsersTabProps> = ({ tenantId }) => {
  const { data: users = [], isLoading } = useQuery({
    queryKey: platformAdminKeys.tenantUsers(tenantId),
    queryFn: () => getTenantUsers(tenantId),
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'engineer': return 'info';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <Card className="p-12 text-center">
        <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No users found</p>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Last Login</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="font-medium">{user.full_name || 'N/A'}</td>
              <td className="text-slate-600">{user.email}</td>
              <td>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {user.role?.toUpperCase()}
                </Badge>
              </td>
              <td className="text-slate-600">
                {user.last_sign_in_at
                  ? formatDistanceToNow(new Date(user.last_sign_in_at)) + ' ago'
                  : 'Never'}
              </td>
              <td>
                <Badge variant={user.last_sign_in_at ? 'success' : 'default'}>
                  {user.last_sign_in_at ? 'Active' : 'Inactive'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
};
