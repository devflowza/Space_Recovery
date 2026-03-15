import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Ticket, Search, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatsCard } from '../../components/ui/StatsCard';
import { Table } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { TicketStatusBadge } from '../../components/platform-admin/tickets/TicketStatusBadge';
import { TicketPriorityBadge } from '../../components/platform-admin/tickets/TicketPriorityBadge';
import { getSupportTickets, getTicketStats } from '../../lib/platformAdminService';
import { platformAdminKeys } from '../../lib/queryKeys';
import { formatDistanceToNow } from 'date-fns';

export const SupportTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: platformAdminKeys.ticketStats(),
    queryFn: getTicketStats,
    refetchInterval: 30000,
  });

  const filters = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    assignedTo: assignedToFilter !== 'all' ? assignedToFilter : undefined,
    search: searchQuery || undefined,
  };

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: platformAdminKeys.ticketsList(filters),
    queryFn: () => getSupportTickets(filters),
  });

  const handleResetFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setAssignedToFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Support Tickets</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Open"
          value={stats?.open || 0}
          icon={Ticket}
          trend="neutral"
          loading={statsLoading}
        />
        <StatsCard
          title="In Progress"
          value={stats?.inProgress || 0}
          icon={Ticket}
          trend="neutral"
          loading={statsLoading}
        />
        <StatsCard
          title="Waiting on Customer"
          value={stats?.waitingCustomer || 0}
          icon={Ticket}
          trend="neutral"
          loading={statsLoading}
        />
        <StatsCard
          title="Resolved Today"
          value={stats?.resolvedToday || 0}
          icon={Ticket}
          trend="up"
          loading={statsLoading}
        />
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Filters</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_customer">Waiting Customer</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="general">General</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="feature_request">Feature Request</option>
                <option value="bug_report">Bug Report</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
              <select
                value={assignedToFilter}
                onChange={(e) => setAssignedToFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="unassigned">Unassigned</option>
                <option value="me">Assigned to Me</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ticket # or subject..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {(statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || assignedToFilter !== 'all' || searchQuery) && (
            <button
              onClick={handleResetFilters}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No tickets found</p>
            {(statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="text-sm text-blue-600 hover:text-blue-700 mt-2"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Subject</th>
                <th>Tenant</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Category</th>
                <th>Assigned To</th>
                <th>Created</th>
                <th>Last Update</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket: Record<string, unknown> & { id: string; ticket_number: string; subject: string }) => (
                <tr
                  key={ticket.id}
                  onClick={() => navigate(`/platform-admin/tickets/${ticket.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="font-medium">{ticket.ticket_number}</td>
                  <td className="text-slate-900">{ticket.subject}</td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/platform-admin/tenants/${ticket.tenant_id}`);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      {ticket.tenant?.company_name || 'Unknown'}
                    </button>
                  </td>
                  <td>
                    <TicketPriorityBadge priority={ticket.priority} />
                  </td>
                  <td>
                    <TicketStatusBadge status={ticket.status} />
                  </td>
                  <td className="text-slate-600 capitalize">{ticket.category?.replace('_', ' ')}</td>
                  <td className="text-slate-600">
                    {ticket.assigned_admin?.full_name || 'Unassigned'}
                  </td>
                  <td className="text-slate-600">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                  <td className="text-slate-600">
                    {formatDistanceToNow(new Date(ticket.updated_at))} ago
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
};
