import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Ticket, Plus } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Table } from '../../ui/Table';
import { Button } from '../../ui/Button';
import { getSupportTickets } from '@/lib/platformAdminService';
import { platformAdminKeys } from '@/lib/queryKeys';

interface TenantSupportTabProps {
  tenantId: string;
}

export const TenantSupportTab: React.FC<TenantSupportTabProps> = ({ tenantId }) => {
  const navigate = useNavigate();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: platformAdminKeys.ticketsList({ tenantId }),
    queryFn: () => getSupportTickets({ search: tenantId }),
  });

  const tenantTickets = tickets.filter(t => t.tenant_id === tenantId).slice(0, 10);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open': return 'info';
      case 'in_progress': return 'warning';
      case 'waiting_customer': return 'default';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'low': return 'default';
      case 'medium': return 'info';
      case 'high': return 'warning';
      case 'urgent': return 'error';
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Showing {tenantTickets.length} most recent tickets</p>
        <Button onClick={() => navigate('/platform-admin/tickets')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      <Card>
        {tenantTickets.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No support tickets found</p>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tenantTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => navigate(`/platform-admin/tickets/${ticket.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="font-medium">{ticket.ticket_number}</td>
                  <td className="text-slate-900">{ticket.subject}</td>
                  <td>
                    <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={getStatusBadgeVariant(ticket.status)}>
                      {ticket.status?.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="text-slate-600">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {tenantTickets.length === 10 && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => navigate(`/platform-admin/tickets?tenant=${tenantId}`)}
          >
            View All Tickets
          </Button>
        </div>
      )}
    </div>
  );
};
