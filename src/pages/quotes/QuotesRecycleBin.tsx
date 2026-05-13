import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  fetchDeletedQuotes,
  restoreQuote,
  permanentDeleteQuote,
} from '../../lib/quotesService';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../lib/format';
import {
  ArrowLeft,
  RotateCcw,
  Trash2,
  FileText,
  AlertTriangle,
  Calendar,
  User,
} from 'lucide-react';

export const QuotesRecycleBin: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: deletedQuotes = [], isLoading } = useQuery({
    queryKey: ['deletedQuotes'],
    queryFn: fetchDeletedQuotes,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletedQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote restored successfully');
      setShowRestoreModal(false);
      setSelectedQuote(null);
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to restore quote');
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => permanentDeleteQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletedQuotes'] });
      toast.success('Quote permanently deleted');
      setShowDeleteModal(false);
      setSelectedQuote(null);
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to permanently delete quote');
    },
  });

  const handleRestore = (quote: { id: string }) => {
    setSelectedQuote(quote);
    setShowRestoreModal(true);
  };

  const handlePermanentDelete = (quote: { id: string }) => {
    setSelectedQuote(quote);
    setShowDeleteModal(true);
  };

  const getDaysUntilPurge = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const purgeDate = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysLeft = Math.ceil((purgeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  };

  const columns = [
    {
      header: 'Quote Number',
      accessor: 'quote_number' as const,
      cell: (quote: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-900">{quote.quote_number || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessor: 'customer_name' as const,
      cell: (quote: Record<string, unknown>) => (
        <span className="text-slate-700">
          {quote.customers?.customer_name || quote.companies?.company_name || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Case',
      accessor: 'case_no' as const,
      cell: (quote: Record<string, unknown>) => (
        <span className="text-slate-700">{quote.cases?.case_no || 'N/A'}</span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'total_amount' as const,
      cell: (quote: Record<string, unknown>) => (
        <span className="font-medium text-slate-900">
          {quote.total_amount?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      header: 'Deleted',
      accessor: 'deleted_at' as const,
      cell: (quote: Record<string, unknown>) => {
        const daysLeft = getDaysUntilPurge(quote.deleted_at);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-3 h-3" />
              {formatDate(quote.deleted_at)}
            </div>
            <div className="flex items-center gap-2 text-xs text-warning">
              <AlertTriangle className="w-3 h-3" />
              {daysLeft} days until permanent deletion
            </div>
          </div>
        );
      },
    },
    {
      header: 'Deleted By',
      accessor: 'deleted_by_profile' as const,
      cell: (quote: Record<string, unknown>) => (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <User className="w-3 h-3" />
          {quote.deleted_by_profile?.full_name || 'Unknown'}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id' as const,
      cell: (quote: Record<string, unknown>) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleRestore(quote)}
            className="text-xs bg-success text-success-foreground hover:bg-success/90"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Restore
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handlePermanentDelete(quote)}
            className="text-xs text-danger hover:bg-danger-muted"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="p-8">
        <PageHeader
          title="Quotes Recycle Bin"
          description="Restore or permanently delete quotes. Quotes are auto-purged after 30 days."
          action={
            <Button variant="secondary" onClick={() => navigate('/quotes')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quotes
            </Button>
          }
        />

        <Card className="mt-6">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
              <p className="text-slate-600 mt-4">Loading deleted quotes...</p>
            </div>
          ) : deletedQuotes.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Deleted Quotes
              </h3>
              <p className="text-slate-600">
                The recycle bin is empty. Deleted quotes will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-info-muted border-b border-info/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-info mb-1">
                      About the Recycle Bin
                    </h4>
                    <p className="text-sm text-info">
                      Deleted quotes are kept for 30 days before being permanently removed. You can
                      restore them at any time before auto-purge. Permanently deleting a quote
                      cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table data={deletedQuotes} columns={columns} />
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        title="Restore Quote"
      >
        <div className="space-y-4">
          <div className="bg-success-muted border border-success/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-success mb-1">Restoring Quote</h4>
                <div className="text-sm text-success space-y-1">
                  <p>
                    <strong>Quote Number:</strong> {selectedQuote?.quote_number || 'N/A'}
                  </p>
                  <p>
                    <strong>Customer:</strong>{' '}
                    {selectedQuote?.customers?.customer_name ||
                      selectedQuote?.companies?.company_name ||
                      'N/A'}
                  </p>
                  <p>
                    <strong>Amount:</strong> {selectedQuote?.total_amount?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-slate-600">
            This quote will be restored and will appear in your active quotes list.
          </p>

          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowRestoreModal(false)}
              disabled={restoreMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => restoreMutation.mutate(selectedQuote?.id)}
              className="bg-success text-success-foreground hover:bg-success/90"
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore Quote
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Permanent Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Permanently Delete Quote"
      >
        <div className="space-y-4">
          <div className="bg-danger-muted border border-danger/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-danger mb-1">Warning: Permanent Deletion</h4>
                <div className="text-sm text-danger space-y-1">
                  <p>
                    <strong>Quote Number:</strong> {selectedQuote?.quote_number || 'N/A'}
                  </p>
                  <p>
                    <strong>Customer:</strong>{' '}
                    {selectedQuote?.customers?.customer_name ||
                      selectedQuote?.companies?.company_name ||
                      'N/A'}
                  </p>
                  <p>
                    <strong>Amount:</strong> {selectedQuote?.total_amount?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-slate-600 font-medium">
            This action cannot be undone. The quote and all associated data will be permanently
            deleted from the system.
          </p>

          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={permanentDeleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => permanentDeleteMutation.mutate(selectedQuote?.id)}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
              disabled={permanentDeleteMutation.isPending}
            >
              {permanentDeleteMutation.isPending ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Permanently Delete
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default QuotesRecycleBin;
