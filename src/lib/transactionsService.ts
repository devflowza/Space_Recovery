import { supabase } from './supabaseClient';

export interface Transaction {
  id?: string;
  transaction_date: string;
  amount: number;
  type: 'income' | 'expense' | 'asset' | 'equity';
  description: string;
  reference_number?: string;
  category_id?: string | null;
  bank_account_id?: string | null;
  related_invoice_id?: string | null;
  related_payment_id?: string | null;
  related_expense_id?: string | null;
  status: 'pending' | 'completed' | 'reconciled' | 'void';
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionWithDetails extends Transaction {
  category?: {
    id: string;
    name: string;
  };
  bank_account?: {
    id: string;
    account_name: string;
    bank_name: string;
  };
  related_invoice?: {
    id: string;
    invoice_number: string;
  };
  related_payment?: {
    id: string;
    payment_number: string;
  };
  related_expense?: {
    id: string;
    expense_number: string;
  };
  created_by_profile?: {
    id: string;
    full_name: string;
  };
}

const DEFAULT_PAGE_SIZE = 100;

export const fetchTransactions = async (filters?: {
  type?: string;
  status?: string;
  categoryId?: string;
  bankAccountId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) => {
  let query = supabase
    .from('financial_transactions')
    .select(`
      *,
      category:transaction_categories(id, name),
      bank_account:bank_accounts(id, account_name, bank_name),
      related_invoice:invoices(id, invoice_number),
      related_payment:payments(id, payment_number),
      related_expense:expenses(id, expense_number)
    `)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters?.bankAccountId) {
    query = query.eq('bank_account_id', filters.bankAccountId);
  }

  if (filters?.dateFrom) {
    query = query.gte('transaction_date', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('transaction_date', filters.dateTo);
  }

  if (filters?.search) {
    query = query.or(`description.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%`);
  }

  const pageSize = filters?.pageSize || DEFAULT_PAGE_SIZE;
  const page = filters?.page || 0;
  query = query.range(page * pageSize, (page + 1) * pageSize - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data as TransactionWithDetails[];
};

export const fetchTransactionById = async (id: string) => {
  const { data, error } = await supabase
    .from('financial_transactions')
    .select(`
      *,
      category:transaction_categories(id, name),
      bank_account:bank_accounts(id, account_name, bank_name, account_number),
      related_invoice:invoices(id, invoice_number, total_amount, case_id),
      related_payment:payments(id, payment_number, amount),
      related_expense:expenses(id, expense_number, amount)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as TransactionWithDetails;
};

export const createTransaction = async (
  transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
) => {
  if (transaction.bank_account_id && transaction.type === 'expense' && transaction.status === 'completed') {
    const { data: account } = await supabase
      .from('bank_accounts')
      .select('current_balance')
      .eq('id', transaction.bank_account_id)
      .maybeSingle();

    if (account && (account.current_balance || 0) < transaction.amount) {
      throw new Error(`Insufficient balance. Available: ${account.current_balance}, Required: ${transaction.amount}`);
    }
  }

  const { data, error } = await supabase
    .from('financial_transactions')
    .insert([transaction])
    .select()
    .maybeSingle();

  if (error) throw error;

  if (transaction.bank_account_id && transaction.status === 'completed') {
    await updateBankAccountBalance(
      transaction.bank_account_id,
      transaction.amount,
      transaction.type === 'income' ? 'credit' : 'debit'
    );
  }

  return data;
};

export const updateTransaction = async (
  id: string,
  transaction: Partial<Transaction>
) => {
  const { data, error } = await supabase
    .from('financial_transactions')
    .update(transaction)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const deleteTransaction = async (id: string) => {
  const { error } = await supabase
    .from('financial_transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

export const reconcileTransaction = async (id: string) => {
  const { data, error } = await supabase
    .from('financial_transactions')
    .update({ status: 'reconciled' })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const bulkReconcileTransactions = async (ids: string[]) => {
  const { data, error } = await supabase
    .from('financial_transactions')
    .update({ status: 'reconciled' })
    .in('id', ids)
    .select();

  if (error) throw error;
  return data;
};

export const voidTransaction = async (id: string) => {
  const { data: transaction, error: fetchError } = await supabase
    .from('financial_transactions')
    .select('bank_account_id, amount, type, status')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (transaction.bank_account_id && transaction.status === 'completed') {
    await updateBankAccountBalance(
      transaction.bank_account_id,
      transaction.amount,
      transaction.type === 'income' ? 'debit' : 'credit'
    );
  }

  const { data, error } = await supabase
    .from('financial_transactions')
    .update({ status: 'void' })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const createTransactionFromPayment = async (
  paymentId: string,
  paymentData: {
    amount: number;
    payment_date: string;
    payment_number: string;
    bank_account_id?: string;
    customer_name?: string;
  }
) => {
  return createTransaction({
    transaction_date: paymentData.payment_date,
    amount: paymentData.amount,
    type: 'income',
    description: `Payment received: ${paymentData.payment_number}${paymentData.customer_name ? ` from ${paymentData.customer_name}` : ''}`,
    related_payment_id: paymentId,
    bank_account_id: paymentData.bank_account_id || null,
    status: 'completed',
  });
};

export const createTransactionFromExpense = async (
  expenseId: string,
  expenseData: {
    amount: number;
    expense_date: string;
    expense_number: string;
    description: string;
    bank_account_id?: string;
    category_id?: string;
  }
) => {
  return createTransaction({
    transaction_date: expenseData.expense_date,
    amount: expenseData.amount,
    type: 'expense',
    description: `Expense: ${expenseData.description}`,
    related_expense_id: expenseId,
    bank_account_id: expenseData.bank_account_id || null,
    category_id: expenseData.category_id || null,
    status: 'completed',
  });
};

export const createTransactionFromInvoice = async (
  invoiceId: string,
  invoiceData: {
    total_amount: number;
    invoice_date: string;
    invoice_number: string;
    customer_name?: string;
  }
) => {
  return createTransaction({
    transaction_date: invoiceData.invoice_date,
    amount: invoiceData.total_amount,
    type: 'income',
    description: `Invoice: ${invoiceData.invoice_number}${invoiceData.customer_name ? ` to ${invoiceData.customer_name}` : ''}`,
    related_invoice_id: invoiceId,
    status: 'pending',
  });
};

export const getTransactionCategories = async () => {
  const { data, error } = await supabase
    .from('master_transaction_categories')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
};

export const getTransactionStats = async (filters?: {
  dateFrom?: string;
  dateTo?: string;
}) => {
  let query = supabase
    .from('financial_transactions')
    .select('amount, type, status, transaction_date');

  if (filters?.dateFrom) {
    query = query.gte('transaction_date', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('transaction_date', filters.dateTo);
  }

  const { data: transactions, error } = await query;
  if (error) throw error;

  const completedTransactions = transactions?.filter(t => t.status === 'completed' || t.status === 'reconciled') || [];

  const income = completedTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const expenses = completedTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return {
    total: transactions?.length || 0,
    income: transactions?.filter(t => t.type === 'income').length || 0,
    expense: transactions?.filter(t => t.type === 'expense').length || 0,
    pending: transactions?.filter(t => t.status === 'pending').length || 0,
    reconciled: transactions?.filter(t => t.status === 'reconciled').length || 0,
    totalIncome: income,
    totalExpenses: expenses,
    netCashFlow: income - expenses,
  };
};

export const getTransactionsByDateRange = async (
  dateFrom: string,
  dateTo: string,
  type?: string
) => {
  let query = supabase
    .from('financial_transactions')
    .select(`
      *,
      category:transaction_categories(id, name),
      bank_account:bank_accounts(id, account_name)
    `)
    .gte('transaction_date', dateFrom)
    .lte('transaction_date', dateTo)
    .order('transaction_date', { ascending: true });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const getCashFlowSummary = async (filters?: {
  dateFrom?: string;
  dateTo?: string;
}) => {
  const transactions = await fetchTransactions(filters);

  const grouped: Record<string, { income: number; expense: number }> = {};

  transactions.forEach(t => {
    if (t.status === 'void') return;

    const month = t.transaction_date.substring(0, 7);
    if (!grouped[month]) {
      grouped[month] = { income: 0, expense: 0 };
    }

    if (t.type === 'income') {
      grouped[month].income += t.amount;
    } else if (t.type === 'expense') {
      grouped[month].expense += t.amount;
    }
  });

  return Object.entries(grouped)
    .map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      netFlow: data.income - data.expense,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

const updateBankAccountBalance = async (
  accountId: string,
  amount: number,
  direction: 'credit' | 'debit'
) => {
  const { data: account, error: fetchError } = await supabase
    .from('bank_accounts')
    .select('current_balance')
    .eq('id', accountId)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching bank account:', fetchError);
    return;
  }

  const currentBalance = account.current_balance || 0;
  const newBalance = direction === 'credit'
    ? currentBalance + amount
    : currentBalance - amount;

  const { error } = await supabase
    .from('bank_accounts')
    .update({ current_balance: newBalance })
    .eq('id', accountId);

  if (error) {
    console.error('Error updating bank account balance:', error);
  }
};

export const transactionsService = {
  fetchTransactions,
  fetchTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  reconcileTransaction,
  bulkReconcileTransactions,
  voidTransaction,
  createTransactionFromPayment,
  createTransactionFromExpense,
  createTransactionFromInvoice,
  getTransactionCategories,
  getTransactionStats,
  getTransactionsByDateRange,
  getCashFlowSummary,
};
