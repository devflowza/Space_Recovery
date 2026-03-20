import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useTenantConfig } from '../../contexts/TenantConfigContext';
import type { AccountingLocale } from '../../types/accountingLocale';
import { Trash2, Star, ArrowLeft } from 'lucide-react';

export const AccountingLocales: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { config } = useTenantConfig();

  const { data: locales = [], isLoading } = useQuery({
    queryKey: ['accounting_locales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_locales')
        .select('*')
        .is('deleted_at', null)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as AccountingLocale[];
    },
  });

  const defaultLocale = locales.find(locale => locale.is_default);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounting_locales')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_locales'] });
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
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Accounting Locales</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tenant country: {config.countryName} ({config.currency.code}, {config.tax.label})
          </p>
          {defaultLocale && (
            <div className="mt-2">
              <Badge variant="success" className="text-sm">
                Default: {defaultLocale.name} ({defaultLocale.currency_code})
              </Badge>
            </div>
          )}
        </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Locale Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Currency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date Format</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {locales.map((locale) => (
                  <tr key={locale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{locale.name}</span>
                        {locale.is_default && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{locale.locale_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{locale.currency_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{locale.date_format || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={locale.is_default ? 'success' : 'secondary'}>
                        {locale.is_default ? 'Default' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => !locale.is_default && setDefaultMutation.mutate(locale.id)}
                          className={`p-2 rounded-lg transition-colors ${locale.is_default ? 'text-yellow-500 bg-yellow-50 cursor-default' : 'text-slate-400 hover:text-yellow-500 hover:bg-yellow-50'}`}
                          disabled={locale.is_default ?? false}
                        >
                          <Star className={`w-4 h-4 ${locale.is_default ? 'fill-yellow-500' : ''}`} />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(locale.id)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={locale.is_default ?? false}
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
              <p className="text-slate-500">No accounting locales configured. Currency and tax settings come from your tenant country.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
