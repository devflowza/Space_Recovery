import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AccountingLocale, AccountingLocaleFormData } from '../../types/accountingLocale';

interface LocaleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccountingLocaleFormData) => void;
  editingLocale: AccountingLocale | null;
  isSubmitting: boolean;
}

export const LocaleFormModal: React.FC<LocaleFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingLocale,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState<AccountingLocaleFormData>({
    country_name: '',
    country_code: '',
    currency_code: '',
    currency_symbol: '',
    currency_name: '',
    currency_position: 'after',
    decimal_places: 2,
    tax_name: 'VAT',
    tax_rate: 0.05,
    tax_number_label: '',
    exchange_rate_to_usd: 1.0,
    date_format: 'dd/MM/yyyy',
    is_active: true,
    is_default: false,
    notes: '',
  });

  useEffect(() => {
    if (editingLocale) {
      setFormData({
        country_name: editingLocale.country_name,
        country_code: editingLocale.country_code,
        currency_code: editingLocale.currency_code,
        currency_symbol: editingLocale.currency_symbol,
        currency_name: editingLocale.currency_name,
        currency_position: editingLocale.currency_position,
        decimal_places: editingLocale.decimal_places,
        tax_name: editingLocale.tax_name,
        tax_rate: editingLocale.tax_rate,
        tax_number_label: editingLocale.tax_number_label || '',
        exchange_rate_to_usd: editingLocale.exchange_rate_to_usd,
        date_format: editingLocale.date_format,
        is_active: editingLocale.is_active,
        is_default: editingLocale.is_default,
        notes: editingLocale.notes || '',
      });
    } else {
      setFormData({
        country_name: '',
        country_code: '',
        currency_code: '',
        currency_symbol: '',
        currency_name: '',
        currency_position: 'after',
        decimal_places: 2,
        tax_name: 'VAT',
        tax_rate: 0.05,
        tax_number_label: '',
        exchange_rate_to_usd: 1.0,
        date_format: 'dd/MM/yyyy',
        is_active: true,
        is_default: false,
        notes: '',
      });
    }
  }, [editingLocale, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof AccountingLocaleFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatExample = () => {
    const amount = formData.decimal_places === 3 ? '100.000' : '100.00';
    if (formData.currency_position === 'before') {
      return `${formData.currency_symbol} ${amount}`;
    }
    return `${amount} ${formData.currency_symbol}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLocale ? 'Edit Accounting Locale' : 'Add New Accounting Locale'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Country Name"
            value={formData.country_name}
            onChange={(e) => handleInputChange('country_name', e.target.value)}
            placeholder="Oman"
            required
          />
          <Input
            label="Country Code"
            value={formData.country_code}
            onChange={(e) => handleInputChange('country_code', e.target.value.toUpperCase())}
            placeholder="OM"
            maxLength={2}
            required
            disabled={!!editingLocale}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Currency Code"
            value={formData.currency_code}
            onChange={(e) => handleInputChange('currency_code', e.target.value.toUpperCase())}
            placeholder="OMR"
            maxLength={3}
            required
          />
          <Input
            label="Currency Symbol"
            value={formData.currency_symbol}
            onChange={(e) => handleInputChange('currency_symbol', e.target.value)}
            placeholder="OMR"
            required
          />
        </div>

        <Input
          label="Currency Name"
          value={formData.currency_name}
          onChange={(e) => handleInputChange('currency_name', e.target.value)}
          placeholder="Omani Rial"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tax Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.tax_name}
              onChange={(e) => handleInputChange('tax_name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="VAT"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tax Rate <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={formData.tax_rate}
              onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.05"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Enter as decimal (e.g., 0.05 for 5%)
            </p>
          </div>
        </div>

        <Input
          label="Tax Number Label"
          value={formData.tax_number_label}
          onChange={(e) => handleInputChange('tax_number_label', e.target.value)}
          placeholder="OM1100376252"
        />

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Decimal Places <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.decimal_places}
              onChange={(e) => handleInputChange('decimal_places', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Currency Position <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.currency_position}
              onChange={(e) => handleInputChange('currency_position', e.target.value as 'before' | 'after')}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="after">After (100.00...)</option>
              <option value="before">Before ($ 100.00)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Example
            </label>
            <div className="w-full px-3 py-2 border border-slate-200 rounded-md bg-slate-50 text-slate-700">
              {formatExample()}
            </div>
          </div>
        </div>

        <Input
          label="Exchange Rate to USD"
          type="number"
          step="0.000001"
          min="0.000001"
          value={formData.exchange_rate_to_usd}
          onChange={(e) => handleInputChange('exchange_rate_to_usd', parseFloat(e.target.value))}
          placeholder="2.6"
          required
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Active
          </label>
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-12 h-6 rounded-full shadow-inner transition-colors ${
                formData.is_active ? 'bg-blue-600' : 'bg-slate-300'
              }`}></div>
              <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                formData.is_active ? 'transform translate-x-6' : ''
              }`}></div>
            </div>
            <span className="ml-3 text-sm text-slate-700">
              {formData.is_active ? 'Active' : 'Inactive'}
            </span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Set as Default
          </label>
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => handleInputChange('is_default', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-12 h-6 rounded-full shadow-inner transition-colors ${
                formData.is_default ? 'bg-blue-600' : 'bg-slate-300'
              }`}></div>
              <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                formData.is_default ? 'transform translate-x-6' : ''
              }`}></div>
            </div>
            <span className="ml-3 text-sm text-slate-700">
              {formData.is_default ? 'Default locale' : 'Not default'}
            </span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Default Oman locale with 5% VAT and 3 decimal places for OMR"
          />
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : editingLocale ? 'Update Locale' : 'Create Locale'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
