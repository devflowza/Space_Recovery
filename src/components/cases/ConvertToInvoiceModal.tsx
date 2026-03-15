import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Receipt, Calendar, FileText, DollarSign } from 'lucide-react';

interface ConvertToInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConvert: (data: {
    invoiceType: 'proforma' | 'tax_invoice';
    dueDate: string;
    notes?: string;
  }) => Promise<void>;
  quote: any;
  isConverting?: boolean;
}

export const ConvertToInvoiceModal: React.FC<ConvertToInvoiceModalProps> = ({
  isOpen,
  onClose,
  onConvert,
  quote,
  isConverting = false,
}) => {
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  const [invoiceType, setInvoiceType] = useState<'proforma' | 'tax_invoice'>('proforma');
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConvert({
      invoiceType,
      dueDate,
      notes: notes.trim() || undefined,
    });
  };

  const getTotalAmount = () => {
    if (!quote) return '0.00';
    return quote.total_amount?.toFixed(2) || '0.00';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Convert Quote to Invoice"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Quote Details</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>Quote Number:</span>
                  <span className="font-medium">{quote?.quote_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-medium">
                    {quote?.customers?.customer_name || quote?.companies?.company_name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-bold text-green-700">{getTotalAmount()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Invoice Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setInvoiceType('proforma')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  invoiceType === 'proforma'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-slate-900">Proforma Invoice</span>
                </div>
                <p className="text-xs text-slate-600">
                  Preliminary invoice for quotation purposes. Cannot record payments.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setInvoiceType('tax_invoice')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  invoiceType === 'tax_invoice'
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-slate-900">Tax Invoice</span>
                </div>
                <p className="text-xs text-slate-600">
                  Official invoice for payment. Can record payments and is VAT compliant.
                </p>
              </button>
            </div>
          </div>

          <div>
            <Input
              label="Due Date *"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              icon={<Calendar className="w-4 h-4" />}
            />
            <p className="text-xs text-slate-500 mt-1">
              Payment due date for this invoice
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any additional notes or special instructions for this invoice..."
            />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Converting this quote will:
          </p>
          <ul className="text-xs text-amber-700 mt-2 ml-4 space-y-1 list-disc">
            <li>Create a new {invoiceType === 'proforma' ? 'Proforma' : 'Tax'} Invoice with all quote details</li>
            <li>Update the quote status to "Converted"</li>
            <li>Link the invoice back to this quote for reference</li>
          </ul>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isConverting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            style={{ backgroundColor: invoiceType === 'proforma' ? '#3b82f6' : '#10b981' }}
            disabled={isConverting}
            className="shadow-md hover:shadow-lg transition-shadow"
          >
            {isConverting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4 mr-2" />
                Convert to {invoiceType === 'proforma' ? 'Proforma' : 'Tax'} Invoice
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
