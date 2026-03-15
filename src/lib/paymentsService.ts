import { supabase } from './supabaseClient';

const logAuditTrail = async (actionType: string, tableName: string, recordId: string, oldValues: object, newValues: object) => {
  try {
    await supabase.rpc('log_audit_trail', {
      p_action_type: actionType,
      p_table_name: tableName,
      p_record_id: recordId,
      p_old_values: oldValues,
      p_new_values: newValues,
    });
  } catch (e) {
    console.error('Audit trail logging failed:', e);
  }
};

export interface Payment {
  id?: string;
  payment_number?: string;
  payment_date: string;
  amount: number;
  case_id?: string | null;
  customer_id?: string | null;
  payment_method_id?: string | null;
  bank_account_id?: string | null;
  reference_number?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentAllocation {
  id?: string;
  payment_id: string;
  invoice_id: string;
  amount: number;
  created_at?: string;
}

export interface PaymentWithDetails extends Payment {
  case?: {
    id: string;
    case_no: string;
    title: string;
  };
  customer?: {
    id: string;
    customer_name: string;
    email: string;
  };
  payment_method?: {
    id: string;
    name: string;
  };
  bank_account?: {
    id: string;
    account_name: string;
    bank_name: string;
  };
  allocations?: Array<{
    id: string;
    amount: number;
    invoice: {
      id: string;
      invoice_number: string;
      total_amount: number;
      case?: {
        id: string;
        case_no: string;
        title: string;
      };
    };
  }>;
  created_by_profile?: {
    id: string;
    full_name: string;
  };
}

export const getNextPaymentNumber = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('get_next_number', {
    sequence_scope: 'payment'
  });

  if (error) {
    console.error('Error getting next payment number:', error);
    return `PAY-${Date.now()}`;
  }

  return data || `PAY-${Date.now()}`;
};

const DEFAULT_PAGE_SIZE = 100;

export const fetchPayments = async (filters?: {
  status?: string;
  customerId?: string;
  caseId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) => {
  let query = supabase
    .from('payments')
    .select(`
      *,
      case:cases(id, case_no, title),
      customer:customers_enhanced(id, customer_name, email),
      payment_method:payment_methods(id, name),
      bank_account:bank_accounts(id, account_name, bank_name),
      allocations:payment_allocations(
        id,
        amount,
        invoice:invoices(id, invoice_number, total_amount, case_id)
      ),
      created_by_profile:profiles!payments_created_by_fkey(id, full_name)
    `)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }

  if (filters?.caseId) {
    query = query.eq('case_id', filters.caseId);
  }

  if (filters?.dateFrom) {
    query = query.gte('payment_date', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('payment_date', filters.dateTo);
  }

  if (filters?.search) {
    query = query.or(`payment_number.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%`);
  }

  const pageSize = filters?.pageSize || DEFAULT_PAGE_SIZE;
  const page = filters?.page || 0;
  query = query.range(page * pageSize, (page + 1) * pageSize - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data as PaymentWithDetails[];
};

export const fetchPaymentById = async (id: string) => {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      case:cases(id, case_no, title),
      customer:customers_enhanced(id, customer_name, email, mobile_number, address_line1, city),
      payment_method:payment_methods(id, name),
      bank_account:bank_accounts(id, account_name, bank_name, account_number),
      allocations:payment_allocations(
        id,
        amount,
        invoice:invoices(
          id,
          invoice_number,
          total_amount,
          amount_due,
          case:cases(id, case_no, title)
        )
      ),
      created_by_profile:profiles!payments_created_by_fkey(id, full_name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as PaymentWithDetails;
};

export const createPayment = async (
  payment: Omit<Payment, 'id' | 'payment_number' | 'created_at' | 'updated_at'>,
  allocations?: Array<{ invoice_id: string; amount: number }>
) => {
  const paymentNumber = await getNextPaymentNumber();

  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .insert([{
      ...payment,
      payment_number: paymentNumber,
    }])
    .select()
    .maybeSingle();

  if (paymentError) throw paymentError;

  if (allocations && allocations.length > 0) {
    await allocatePaymentToInvoices(paymentData.id, allocations);
  }

  await logAuditTrail('create', 'payments', paymentData.id, {}, { payment_number: paymentNumber, amount: payment.amount });

  return paymentData;
};

export const allocatePaymentToInvoices = async (
  paymentId: string,
  allocations: Array<{ invoice_id: string; amount: number }>
) => {
  const allocationRecords = allocations.map(alloc => ({
    payment_id: paymentId,
    invoice_id: alloc.invoice_id,
    amount: alloc.amount,
  }));

  const { error: allocError } = await supabase
    .from('payment_allocations')
    .insert(allocationRecords);

  if (allocError) throw allocError;

  for (const alloc of allocations) {
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid, amount_due')
      .eq('id', alloc.invoice_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const newAmountPaid = Math.round(((invoice.amount_paid || 0) + alloc.amount) * 100) / 100;
    const newAmountDue = Math.round(((invoice.total_amount || 0) - newAmountPaid) * 100) / 100;

    let newStatus = 'sent';
    if (newAmountDue <= 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        amount_due: Math.max(0, newAmountDue),
        status: newStatus,
      })
      .eq('id', alloc.invoice_id);

    if (updateError) throw updateError;
  }

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  await createFinancialTransaction({
    transaction_date: new Date().toISOString().split('T')[0],
    amount: totalAllocated,
    type: 'income',
    description: `Payment received`,
    related_payment_id: paymentId,
    status: 'completed',
  });
};

export const updatePaymentStatus = async (
  id: string,
  status: Payment['status'],
  notes?: string
) => {
  const { data, error } = await supabase
    .from('payments')
    .update({ status, notes: notes || undefined })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const voidPayment = async (paymentId: string) => {
  const { data: allocations, error: allocError } = await supabase
    .from('payment_allocations')
    .select('invoice_id, amount')
    .eq('payment_id', paymentId);

  if (allocError) throw allocError;

  for (const alloc of allocations || []) {
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid')
      .eq('id', alloc.invoice_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const newAmountPaid = Math.max(0, (invoice.amount_paid || 0) - alloc.amount);
    const newAmountDue = (invoice.total_amount || 0) - newAmountPaid;

    let newStatus = 'sent';
    if (newAmountDue <= 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    await supabase
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        amount_due: newAmountDue,
        status: newStatus,
      })
      .eq('id', alloc.invoice_id);
  }

  const { error: deleteAllocError } = await supabase
    .from('payment_allocations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('payment_id', paymentId);

  if (deleteAllocError) throw deleteAllocError;

  const { data, error } = await supabase
    .from('payments')
    .update({ status: 'refunded' })
    .eq('id', paymentId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getPaymentsByCase = async (caseId: string) => {
  const { data: invoices, error: invError } = await supabase
    .from('invoices')
    .select('id')
    .eq('case_id', caseId);

  if (invError) throw invError;
  if (!invoices || invoices.length === 0) return [];

  const invoiceIds = invoices.map(i => i.id);

  const { data: allocations, error: allocError } = await supabase
    .from('payment_allocations')
    .select(`
      amount,
      payment:payments(
        *,
        customer:customers_enhanced(id, customer_name),
        payment_method:payment_methods(name)
      ),
      invoice:invoices(id, invoice_number)
    `)
    .in('invoice_id', invoiceIds);

  if (allocError) throw allocError;
  return allocations || [];
};

export const getPaymentMethods = async () => {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
};

export const getUnpaidInvoices = async (customerId?: string) => {
  let query = supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      invoice_date,
      total_amount,
      amount_paid,
      amount_due,
      status,
      case_id,
      cases!invoices_case_id_fkey(id, case_no, title),
      customer:customers_enhanced!invoices_customer_id_fkey(id, customer_name)
    `)
    .eq('invoice_type', 'tax_invoice')
    .in('status', ['draft', 'sent', 'partial', 'overdue'])
    .gt('amount_due', 0)
    .order('invoice_date', { ascending: false });

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const getPaymentStats = async (filters?: {
  dateFrom?: string;
  dateTo?: string;
}) => {
  let query = supabase
    .from('payments')
    .select('amount, status, payment_date');

  if (filters?.dateFrom) {
    query = query.gte('payment_date', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('payment_date', filters.dateTo);
  }

  const { data: payments, error } = await query;
  if (error) throw error;

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date();
  thisMonth.setDate(1);
  const thisMonthStart = thisMonth.toISOString().split('T')[0];

  return {
    total: payments?.length || 0,
    completed: payments?.filter(p => p.status === 'completed').length || 0,
    pending: payments?.filter(p => p.status === 'pending').length || 0,
    today: payments?.filter(p => p.payment_date === today).length || 0,
    totalAmount: payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    completedAmount: payments?.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    thisMonthAmount: payments?.filter(p => p.payment_date >= thisMonthStart).reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
  };
};

export const getCasesWithUnpaidInvoices = async () => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      case_id,
      cases!invoices_case_id_fkey!inner(
        id,
        case_no,
        title,
        customer:customers_enhanced!cases_customer_id_fkey(id, customer_name, email)
      )
    `)
    .eq('invoice_type', 'tax_invoice')
    .in('status', ['draft', 'sent', 'partial', 'overdue'])
    .gt('amount_due', 0);

  if (error) throw error;

  const uniqueCases = new Map();
  for (const invoice of data || []) {
    if (invoice.cases && !uniqueCases.has(invoice.cases.id)) {
      uniqueCases.set(invoice.cases.id, invoice.cases);
    }
  }

  return Array.from(uniqueCases.values());
};

export const getUnpaidInvoicesByCase = async (caseId: string) => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      invoice_date,
      total_amount,
      amount_paid,
      amount_due,
      status,
      case_id,
      cases!invoices_case_id_fkey(id, case_no, title),
      customer:customers_enhanced!invoices_customer_id_fkey(id, customer_name)
    `)
    .eq('case_id', caseId)
    .eq('invoice_type', 'tax_invoice')
    .in('status', ['draft', 'sent', 'partial', 'overdue'])
    .gt('amount_due', 0)
    .order('invoice_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

const createFinancialTransaction = async (transaction: {
  transaction_date: string;
  amount: number;
  type: string;
  description: string;
  related_payment_id?: string;
  status: string;
}) => {
  const { error } = await supabase
    .from('financial_transactions')
    .insert([transaction]);

  if (error) {
    console.error('Error creating financial transaction:', error);
    throw new Error(`Failed to create financial audit record: ${error.message}`);
  }
};

export const paymentsService = {
  getNextPaymentNumber,
  fetchPayments,
  fetchPaymentById,
  createPayment,
  allocatePaymentToInvoices,
  updatePaymentStatus,
  voidPayment,
  getPaymentsByCase,
  getPaymentMethods,
  getUnpaidInvoices,
  getUnpaidInvoicesByCase,
  getCasesWithUnpaidInvoices,
  getPaymentStats,
};
