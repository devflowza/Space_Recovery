import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePortalAuth } from '../../contexts/PortalAuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ShoppingBag, Shield, Hash, Package, Calendar, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDate } from '../../lib/format';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getDaysRemaining(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getWarrantyStatus(daysRemaining: number | null): { label: string; color: 'success' | 'warning' | 'danger'; icon: React.ElementType } {
  if (daysRemaining === null) return { label: 'No Warranty', color: 'danger', icon: AlertTriangle };
  if (daysRemaining <= 0) return { label: 'Expired', color: 'danger', icon: AlertTriangle };
  if (daysRemaining <= 30) return { label: `${daysRemaining}d left`, color: 'danger', icon: AlertTriangle };
  if (daysRemaining <= 90) return { label: `${daysRemaining}d left`, color: 'warning', icon: AlertTriangle };
  return { label: `${daysRemaining}d left`, color: 'success', icon: CheckCircle };
}

export const PortalPurchasesPage: React.FC = () => {
  const { customer } = usePortalAuth();

  const { data: purchases, isLoading: loadingPurchases } = useQuery({
    queryKey: ['portal_purchases', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from('stock_sales')
        .select(`
          id, sale_number, created_at, total_amount, payment_method, payment_status,
          stock_sale_items (
            id, quantity, unit_price, total_price, warranty_end_date,
            stock_items ( id, name, brand, model, sku )
          )
        `)
        .eq('customer_id', customer.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!customer?.id,
  });

  const { data: serialNumbers, isLoading: loadingSerials } = useQuery({
    queryKey: ['portal_serials', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from('stock_serial_numbers')
        .select(`
          id, serial_number, status, warranty_end_date,
          stock_items ( id, name, brand, model )
        `)
        .eq('sold_to_customer_id', customer.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!customer?.id,
  });

  const activeWarranties = (purchases ?? []).flatMap((sale) =>
    (sale.stock_sale_items ?? []).filter((item) => {
      if (!item.warranty_end_date) return false;
      const days = getDaysRemaining(item.warranty_end_date);
      return days !== null && days > 0;
    }).map((item) => ({ ...item, sale_number: sale.sale_number, sale_id: sale.id }))
  );

  const totalSpent = (purchases ?? []).reduce((sum, s) => sum + (s.total_amount ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Purchases</h1>
        <p className="text-slate-500 mt-1">View your purchased devices, warranties, and serial numbers.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Orders</p>
              <p className="text-2xl font-bold text-slate-900">{purchases?.length ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Active Warranties</p>
              <p className="text-2xl font-bold text-slate-900">{activeWarranties.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Spent</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalSpent)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Purchase History</h2>
        </div>
        {loadingPurchases ? (
          <div className="p-8 text-center text-slate-500">Loading purchases...</div>
        ) : !purchases?.length ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No purchases yet</p>
            <p className="text-slate-400 text-sm mt-1">Your purchased devices will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {purchases.map((sale) => (
              <div key={sale.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-slate-900 text-sm">{sale.sale_number ?? `Sale #${sale.id.slice(0, 8)}`}</span>
                      <Badge color={sale.payment_status === 'paid' ? 'success' : sale.payment_status === 'partial' ? 'warning' : 'default'}>
                        {sale.payment_status ?? 'pending'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(sale.created_at)}
                      </span>
                      {sale.payment_method && (
                        <span className="capitalize">{sale.payment_method.replace('_', ' ')}</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {(sale.stock_sale_items ?? []).map((item) => {
                        const si = item.stock_items as { id: string; name: string; brand: string | null; model: string | null } | null;
                        const days = getDaysRemaining(item.warranty_end_date ?? null);
                        const ws = getWarrantyStatus(item.warranty_end_date ? days : null);
                        const WarrantyIcon = ws.icon;
                        return (
                          <div key={item.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-slate-800">
                                  {si?.brand ? `${si.brand} ` : ''}{si?.name ?? 'Device'}
                                </span>
                                {si?.model && <span className="text-xs text-slate-500 ml-1">({si.model})</span>}
                                <span className="text-xs text-slate-500 ml-2">× {item.quantity}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              {item.warranty_end_date && (
                                <span className={`flex items-center gap-1 font-medium ${
                                  ws.color === 'success' ? 'text-emerald-600' :
                                  ws.color === 'warning' ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                  <WarrantyIcon className="w-3.5 h-3.5" />
                                  Warranty: {ws.label}
                                </span>
                              )}
                              <span className="font-semibold text-slate-900">{formatCurrency(item.total_price ?? 0)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(sale.total_amount ?? 0)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {activeWarranties.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Active Warranties</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {activeWarranties.map((item) => {
              const si = item.stock_items as { id: string; name: string; brand: string | null; model: string | null } | null;
              const days = getDaysRemaining(item.warranty_end_date ?? null);
              const ws = getWarrantyStatus(days);
              const WarrantyIcon = ws.icon;
              return (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      ws.color === 'success' ? 'bg-emerald-100' :
                      ws.color === 'warning' ? 'bg-amber-100' : 'bg-red-100'
                    }`}>
                      <WarrantyIcon className={`w-4 h-4 ${
                        ws.color === 'success' ? 'text-emerald-600' :
                        ws.color === 'warning' ? 'text-amber-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">
                        {si?.brand ? `${si.brand} ` : ''}{si?.name ?? 'Device'}
                        {si?.model && <span className="text-slate-500 ml-1">({si.model})</span>}
                      </p>
                      <p className="text-xs text-slate-500">From order {item.sale_number}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-slate-500 text-xs">Expires</p>
                    <p className="font-medium text-slate-900">{formatDate(item.warranty_end_date!)}</p>
                    <Badge color={ws.color} className="mt-1">{ws.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {serialNumbers && serialNumbers.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Hash className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Serial Numbers</h2>
          </div>
          {loadingSerials ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {serialNumbers.map((sn) => {
                const si = sn.stock_items as { id: string; name: string; brand: string | null; model: string | null } | null;
                return (
                  <div key={sn.id} className="px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Hash className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{sn.serial_number}</p>
                        {si && (
                          <p className="text-xs text-slate-500">
                            {si.brand ? `${si.brand} ` : ''}{si.name}{si.model ? ` (${si.model})` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {sn.warranty_end_date && (() => {
                        const days = getDaysRemaining(sn.warranty_end_date);
                        const ws = getWarrantyStatus(days);
                        return <Badge color={ws.color}>Warranty: {ws.label}</Badge>;
                      })()}
                      <Badge color={sn.status === 'sold' ? 'success' : 'default'}>{sn.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default PortalPurchasesPage;
