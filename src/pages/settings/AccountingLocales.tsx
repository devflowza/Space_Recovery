import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LocaleFormModal } from './LocaleFormModal';
import { AccountingLocale, AccountingLocaleFormData } from '../../types/accountingLocale';
import { Edit2, Trash2, Star, ArrowLeft } from 'lucide-react';

export const AccountingLocales: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocale, setEditingLocale] = useState<AccountingLocale | null>(null);
  const queryClient = useQueryClient();

  const { data: locales = [], isLoading } = useQuery({
    queryKey: ['accounting_locales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_locales')
        .select('*')
        .order('is_default', { ascending: false })
        .order('country_name', { ascending: true });

      if (error) throw error;
      return data as AccountingLocale[];
    },
  });

  const defaultLocale = locales.find(locale => locale.is_default);

  const createMutation = useMutation({
    mutationFn: async (formData: AccountingLocaleFormData) => {
      const { error } = await supabase.from('accounting_locales').insert({
        country_name: formData.country_name,
        country_code: formData.country_code,
        currency_code: formData.currency_code,
        currency_symbol: formData.currency_symbol,
        currency_name: formData.currency_name,
        currency_position: formData.currency_position,
        decimal_places: formData.decimal_places,
        tax_name: formData.tax_name,
        tax_rate: formData.tax_rate,
        tax_number_label: formData.tax_number_label || null,
        exchange_rate_to_usd: formData.exchange_rate_to_usd,
        date_format: formData.date_format,
        is_active: formData.is_active,
        is_default: formData.is_default,
        notes: formData.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_locales'] });
      setIsModalOpen(false);
      setEditingLocale(null);
    },
    onError: (error: Error) => {
      alert(`Error creating locale: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: AccountingLocaleFormData }) => {
      const { error } = await supabase
        .from('accounting_locales')
        .update({
          country_name: formData.country_name,
          currency_code: formData.currency_code,
          currency_symbol: formData.currency_symbol,
          currency_name: formData.currency_name,
          currency_position: formData.currency_position,
          decimal_places: formData.decimal_places,
          tax_name: formData.tax_name,
          tax_rate: formData.tax_rate,
          tax_number_label: formData.tax_number_label || null,
          exchange_rate_to_usd: formData.exchange_rate_to_usd,
          date_format: formData.date_format,
          is_active: formData.is_active,
          is_default: formData.is_default,
          notes: formData.notes || null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_locales'] });
      setIsModalOpen(false);
      setEditingLocale(null);
    },
    onError: (error: Error) => {
      alert(`Error updating locale: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounting_locales').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_locales'] });
    },
    onError: (error: Error) => {
      alert(`Error deleting locale: ${error.message}`);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounting_locales')
        .update({ is_default: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_locales'] });
    },
    onError: (error: Error) => {
      alert(`Error setting default locale: ${error.message}`);
    },
  });

  const handleSubmit = (formData: AccountingLocaleFormData) => {
    if (editingLocale) {
      updateMutation.mutate({ id: editingLocale.id, formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (locale: AccountingLocale) => {
    setEditingLocale(locale);
    setIsModalOpen(true);
  };

  const handleDelete = (locale: AccountingLocale) => {
    if (locale.is_default) {
      alert('Cannot delete the default locale. Please set another locale as default first.');
      return;
    }

    if (confirm(`Are you sure you want to delete the ${locale.country_name} locale?`)) {
      deleteMutation.mutate(locale.id);
    }
  };

  const handleSetDefault = (locale: AccountingLocale) => {
    if (locale.is_default) return;
    if (confirm(`Set ${locale.country_name} as the default locale?`)) {
      setDefaultMutation.mutate(locale.id);
    }
  };

  const handleAddNew = () => {
    setEditingLocale(null);
    setIsModalOpen(true);
  };

  const formatCurrency = (locale: AccountingLocale) => {
    const amount = locale.decimal_places === 3 ? '100.000' : '100.00';
    return locale.currency_position === 'before'
      ? `${locale.currency_symbol} ${amount}`
      : `${amount} ${locale.currency_symbol}`;
  };

  const formatTaxRate = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Accounting Locales</h1>
          {defaultLocale && (
            <div className="mt-2">
              <Badge variant="success" className="text-sm">
                Default: {defaultLocale.country_name} ({defaultLocale.currency_code})
              </Badge>
            </div>
          )}
        </div>
        <Button onClick={handleAddNew}>
          Add New Locale
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4">Loading locales...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tax
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Format
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {locales.map((locale) => (
                  <tr key={locale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">
                            {locale.country_name}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              {locale.country_code}
                            </Badge>
                            {locale.is_default && (
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">
                          {locale.currency_code}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatCurrency(locale)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-900">{locale.tax_name}</span>
                        <span className="text-xs text-slate-500">
                          {formatTaxRate(locale.tax_rate)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-900">
                          {locale.decimal_places} decimals
                        </span>
                        <span className="text-xs text-slate-500">{locale.date_format}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={locale.is_active ? 'success' : 'secondary'}>
                        {locale.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSetDefault(locale)}
                          className={`p-2 rounded-lg transition-colors ${
                            locale.is_default
                              ? 'text-yellow-500 bg-yellow-50 cursor-default'
                              : 'text-slate-400 hover:text-yellow-500 hover:bg-yellow-50'
                          }`}
                          title={locale.is_default ? 'Default locale' : 'Set as default'}
                          disabled={locale.is_default}
                        >
                          <Star
                            className={`w-4 h-4 ${locale.is_default ? 'fill-yellow-500' : ''}`}
                          />
                        </button>
                        <button
                          onClick={() => handleEdit(locale)}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit locale"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(locale)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete locale"
                          disabled={locale.is_default}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {locales.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No accounting locales configured.</p>
              <Button onClick={handleAddNew} className="mt-4">
                Add Your First Locale
              </Button>
            </div>
          )}
        </div>
      )}

      <LocaleFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLocale(null);
        }}
        onSubmit={handleSubmit}
        editingLocale={editingLocale}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
};
