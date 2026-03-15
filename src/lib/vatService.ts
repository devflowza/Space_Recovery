import { supabase } from './supabaseClient';

export interface VATRecord {
  id?: string;
  record_date: string;
  record_type: 'sale' | 'purchase';
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  vat_rate: number;
  description: string;
  invoice_id?: string | null;
  expense_id?: string | null;
  created_at?: string;
}

export interface VATReturn {
  id?: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  total_vat_on_sales: number;
  total_purchases: number;
  total_vat_on_purchases: number;
  net_vat_due: number;
  status: 'draft' | 'review' | 'submitted' | 'paid';
  submitted_at?: string | null;
  submitted_by?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VATSummary {
  totalSales: number;
  totalVATOnSales: number;
  totalPurchases: number;
  totalVATOnPurchases: number;
  netVATDue: number;
  recordCount: number;
}

export const fetchVATRecords = async (filters?: {
  recordType?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  let query = supabase
    .from('vat_records')
    .select(`
      *,
      invoice:invoices(id, invoice_number),
      expense:expenses(id, expense_number)
    `)
    .order('record_date', { ascending: false });

  if (filters?.recordType && filters.recordType !== 'all') {
    query = query.eq('record_type', filters.recordType);
  }

  if (filters?.dateFrom) {
    query = query.gte('record_date', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('record_date', filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchVATReturns = async (filters?: {
  status?: string;
  year?: number;
}) => {
  let query = supabase
    .from('vat_returns')
    .select(`
      *,
      submitted_by_profile:profiles!vat_returns_submitted_by_fkey(id, full_name)
    `)
    .order('period_end', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.year) {
    const startDate = `${filters.year}-01-01`;
    const endDate = `${filters.year}-12-31`;
    query = query.gte('period_start', startDate).lte('period_end', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchVATReturnById = async (id: string) => {
  const { data, error } = await supabase
    .from('vat_returns')
    .select(`
      *,
      submitted_by_profile:profiles!vat_returns_submitted_by_fkey(id, full_name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const calculateVATForPeriod = async (
  periodStart: string,
  periodEnd: string
): Promise<VATSummary> => {
  const { data: records, error } = await supabase
    .from('vat_records')
    .select('record_type, net_amount, vat_amount, gross_amount')
    .gte('record_date', periodStart)
    .lte('record_date', periodEnd);

  if (error) throw error;

  const sales = records?.filter(r => r.record_type === 'sale') || [];
  const purchases = records?.filter(r => r.record_type === 'purchase') || [];

  const totalSales = sales.reduce((sum, r) => sum + (r.net_amount || 0), 0);
  const totalVATOnSales = sales.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
  const totalPurchases = purchases.reduce((sum, r) => sum + (r.net_amount || 0), 0);
  const totalVATOnPurchases = purchases.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
  const netVATDue = totalVATOnSales - totalVATOnPurchases;

  return {
    totalSales,
    totalVATOnSales,
    totalPurchases,
    totalVATOnPurchases,
    netVATDue,
    recordCount: records?.length || 0,
  };
};

export const createVATReturn = async (
  vatReturn: Omit<VATReturn, 'id' | 'created_at' | 'updated_at'>
) => {
  const { data, error } = await supabase
    .from('vat_returns')
    .insert([vatReturn])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const createVATReturnFromPeriod = async (
  periodStart: string,
  periodEnd: string,
  notes?: string
) => {
  const summary = await calculateVATForPeriod(periodStart, periodEnd);

  return createVATReturn({
    period_start: periodStart,
    period_end: periodEnd,
    total_sales: summary.totalSales,
    total_vat_on_sales: summary.totalVATOnSales,
    total_purchases: summary.totalPurchases,
    total_vat_on_purchases: summary.totalVATOnPurchases,
    net_vat_due: summary.netVATDue,
    status: 'draft',
    notes,
  });
};

export const updateVATReturn = async (
  id: string,
  vatReturn: Partial<VATReturn>
) => {
  const { data, error } = await supabase
    .from('vat_returns')
    .update(vatReturn)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const updateVATReturnStatus = async (
  id: string,
  status: VATReturn['status'],
  submittedBy?: string
) => {
  const updateData: Partial<VATReturn> = { status };

  if (status === 'submitted' && submittedBy) {
    updateData.submitted_at = new Date().toISOString();
    updateData.submitted_by = submittedBy;
  }

  return updateVATReturn(id, updateData);
};

export const deleteVATReturn = async (id: string) => {
  const { error } = await supabase
    .from('vat_returns')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

export const createVATRecord = async (
  record: Omit<VATRecord, 'id' | 'created_at'>
) => {
  const { data, error } = await supabase
    .from('vat_records')
    .insert([record])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const createVATRecordFromInvoice = async (
  invoiceId: string,
  invoiceData: {
    invoice_date: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    tax_rate: number;
    invoice_number: string;
  }
) => {
  return createVATRecord({
    record_date: invoiceData.invoice_date,
    record_type: 'sale',
    net_amount: invoiceData.subtotal,
    vat_amount: invoiceData.tax_amount,
    gross_amount: invoiceData.total_amount,
    vat_rate: invoiceData.tax_rate,
    description: `Invoice: ${invoiceData.invoice_number}`,
    invoice_id: invoiceId,
  });
};

export const getVATStats = async (filters?: {
  dateFrom?: string;
  dateTo?: string;
}) => {
  const dateFrom = filters?.dateFrom || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const dateTo = filters?.dateTo || new Date().toISOString().split('T')[0];

  const summary = await calculateVATForPeriod(dateFrom, dateTo);

  const { data: returns } = await supabase
    .from('vat_returns')
    .select('status')
    .gte('period_start', dateFrom)
    .lte('period_end', dateTo);

  return {
    ...summary,
    draftReturns: returns?.filter(r => r.status === 'draft').length || 0,
    submittedReturns: returns?.filter(r => r.status === 'submitted').length || 0,
    paidReturns: returns?.filter(r => r.status === 'paid').length || 0,
  };
};

export const getVATRecordsByReturn = async (
  periodStart: string,
  periodEnd: string
) => {
  const { data, error } = await supabase
    .from('vat_records')
    .select(`
      *,
      invoice:invoices(id, invoice_number, customer:customers_enhanced(customer_name)),
      expense:expenses(id, expense_number, vendor_name)
    `)
    .gte('record_date', periodStart)
    .lte('record_date', periodEnd)
    .order('record_date', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getQuarterlyVATSummary = async (year: number) => {
  const quarters = [
    { q: 1, start: `${year}-01-01`, end: `${year}-03-31` },
    { q: 2, start: `${year}-04-01`, end: `${year}-06-30` },
    { q: 3, start: `${year}-07-01`, end: `${year}-09-30` },
    { q: 4, start: `${year}-10-01`, end: `${year}-12-31` },
  ];

  const summaries = await Promise.all(
    quarters.map(async ({ q, start, end }) => {
      const summary = await calculateVATForPeriod(start, end);
      return { quarter: q, ...summary };
    })
  );

  return summaries;
};

export const vatService = {
  fetchVATRecords,
  fetchVATReturns,
  fetchVATReturnById,
  calculateVATForPeriod,
  createVATReturn,
  createVATReturnFromPeriod,
  updateVATReturn,
  updateVATReturnStatus,
  deleteVATReturn,
  createVATRecord,
  createVATRecordFromInvoice,
  getVATStats,
  getVATRecordsByReturn,
  getQuarterlyVATSummary,
};
