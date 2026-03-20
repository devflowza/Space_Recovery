import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { calculateVATForPeriod, VATSummary } from '../../lib/vatService';
import { useCurrency } from '../../hooks/useCurrency';
import {
  Calendar,
  Calculator,
  TrendingUp,
  TrendingDown,
  FileCheck,
  Save,
  Send,
} from 'lucide-react';
import { logger } from '../../lib/logger';

interface VATReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: {
      period_start: string;
      period_end: string;
      total_sales: number;
      total_vat_on_sales: number;
      total_purchases: number;
      total_vat_on_purchases: number;
      net_vat_due: number;
      status: 'draft' | 'review';
      notes?: string;
    }
  ) => Promise<void>;
}

export const VATReturnModal: React.FC<VATReturnModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const { formatCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState<VATSummary | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const now = new Date();
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    const quarterStart = new Date(now.getFullYear(), quarterMonth, 1);
    const quarterEnd = new Date(now.getFullYear(), quarterMonth + 3, 0);

    setPeriodStart(quarterStart.toISOString().split('T')[0]);
    setPeriodEnd(quarterEnd.toISOString().split('T')[0]);
  }, [isOpen]);

  const handleCalculate = async () => {
    if (!periodStart || !periodEnd) return;

    setIsCalculating(true);
    try {
      const result = await calculateVATForPeriod(periodStart, periodEnd);
      setSummary(result);
    } catch (error) {
      logger.error('Error calculating VAT:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (periodStart && periodEnd && isOpen) {
      handleCalculate();
    }
  }, [periodStart, periodEnd, isOpen]);

  const handleSubmit = async (submitForReview: boolean = false) => {
    if (!summary) return;

    setIsSubmitting(true);
    try {
      await onSave({
        period_start: periodStart,
        period_end: periodEnd,
        total_sales: summary.totalSales,
        total_vat_on_sales: summary.totalVATOnSales,
        total_purchases: summary.totalPurchases,
        total_vat_on_purchases: summary.totalVATOnPurchases,
        net_vat_due: summary.netVATDue,
        status: submitForReview ? 'review' : 'draft',
        notes: notes.trim() || undefined,
      });
      handleClose();
    } catch (error) {
      logger.error('Error saving VAT return:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSummary(null);
    setNotes('');
    onClose();
  };

  const setQuarterPeriod = (quarter: number, year: number) => {
    const quarterMonth = (quarter - 1) * 3;
    const start = new Date(year, quarterMonth, 1);
    const end = new Date(year, quarterMonth + 3, 0);
    setPeriodStart(start.toISOString().split('T')[0]);
    setPeriodEnd(end.toISOString().split('T')[0]);
  };

  const currentYear = new Date().getFullYear();
  const quarters = [
    { label: 'Q1', quarter: 1 },
    { label: 'Q2', quarter: 2 },
    { label: 'Q3', quarter: 3 },
    { label: 'Q4', quarter: 4 },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create VAT Return" size="lg">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Quick Select Period
          </label>
          <div className="flex flex-wrap gap-2">
            {quarters.map(({ label, quarter }) => (
              <button
                key={label}
                type="button"
                onClick={() => setQuarterPeriod(quarter, currentYear)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {label} {currentYear}
              </button>
            ))}
            {quarters.map(({ label, quarter }) => (
              <button
                key={`prev-${label}`}
                type="button"
                onClick={() => setQuarterPeriod(quarter, currentYear - 1)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-500"
              >
                {label} {currentYear - 1}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Period Start
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Period End
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
        </div>

        {isCalculating ? (
          <div className="p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 mt-3">Calculating VAT...</p>
          </div>
        ) : summary ? (
          <div className="bg-slate-50 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">VAT Summary</h3>
              <span className="text-sm text-slate-500 ml-auto">
                {summary.recordCount} records found
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Sales (Output VAT)</span>
                </div>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(summary.totalSales)}
                </p>
                <p className="text-sm text-green-600 font-semibold mt-1">
                  VAT: {formatCurrency(summary.totalVATOnSales)}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Purchases (Input VAT)</span>
                </div>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(summary.totalPurchases)}
                </p>
                <p className="text-sm text-red-600 font-semibold mt-1">
                  VAT: {formatCurrency(summary.totalVATOnPurchases)}
                </p>
              </div>
            </div>

            <div className={`rounded-lg p-4 border ${
              summary.netVATDue >= 0
                ? 'bg-blue-50 border-blue-200'
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className={`w-5 h-5 ${
                    summary.netVATDue >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`} />
                  <span className="font-medium text-slate-900">
                    Net VAT {summary.netVATDue >= 0 ? 'Payable' : 'Reclaimable'}
                  </span>
                </div>
                <p className={`text-2xl font-bold ${
                  summary.netVATDue >= 0 ? 'text-blue-700' : 'text-orange-700'
                }`}>
                  {formatCurrency(Math.abs(summary.netVATDue))}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl">
            <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Select a period to calculate VAT</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Additional notes about this VAT return..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || !summary}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save as Draft
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || !summary}
            className="flex items-center gap-2"
            style={{ backgroundColor: '#3b82f6' }}
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Submit for Review'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
