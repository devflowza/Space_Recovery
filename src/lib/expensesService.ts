import { supabase } from './supabaseClient';
import { sanitizeFilterValue } from './postgrestSanitizer';
import { logger } from './logger';

export interface Expense {
  id?: string;
  expense_number?: string;
  expense_date: string;
  amount: number;
  description: string;
  vendor_name?: string;
  category_id?: string | null;
  case_id?: string | null;
  payment_method_id?: string | null;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paid';
  submitted_by?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseWithDetails extends Expense {
  category?: {
    id: string;
    name: string;
  };
  case?: {
    id: string;
    case_no: string;
    title: string;
  };
  payment_method?: {
    id: string;
    name: string;
  };
  submitter?: {
    id: string;
    full_name: string;
  };
  approver?: {
    id: string;
    full_name: string;
  };
  attachments?: ExpenseAttachment[];
}

export interface ExpenseAttachment {
  id: string;
  expense_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export const getNextExpenseNumber = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('get_next_number', {
    sequence_scope: 'expense'
  });

  if (error) {
    logger.error('Error getting next expense number:', error);
    return `EXP-${Date.now()}`;
  }

  return data || `EXP-${Date.now()}`;
};

export const fetchExpenses = async (filters?: {
  status?: string;
  categoryId?: string;
  caseId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  submittedBy?: string;
}) => {
  let query = supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(id, name),
      case:cases(id, case_no, title),
      payment_method:payment_methods(id, name),
      submitter:profiles!expenses_submitted_by_fkey(id, full_name),
      approver:profiles!expenses_approved_by_fkey(id, full_name)
    `)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters?.caseId) {
    query = query.eq('case_id', filters.caseId);
  }

  if (filters?.dateFrom) {
    query = query.gte('expense_date', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('expense_date', filters.dateTo);
  }

  if (filters?.search) {
    const s = sanitizeFilterValue(filters.search);
    query = query.or(`expense_number.ilike.%${s}%,description.ilike.%${s}%,vendor_name.ilike.%${s}%`);
  }

  if (filters?.submittedBy) {
    query = query.eq('submitted_by', filters.submittedBy);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as ExpenseWithDetails[];
};

export const fetchExpenseById = async (id: string) => {
  const { data: expense, error } = await supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(id, name),
      case:cases(id, case_no, title),
      payment_method:payment_methods(id, name),
      submitter:profiles!expenses_submitted_by_fkey(id, full_name),
      approver:profiles!expenses_approved_by_fkey(id, full_name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;

  const { data: attachments } = await supabase
    .from('expense_attachments')
    .select('*')
    .eq('expense_id', id)
    .order('uploaded_at', { ascending: false });

  return {
    ...expense,
    attachments: attachments || [],
  } as ExpenseWithDetails;
};

export const createExpense = async (
  expense: Omit<Expense, 'id' | 'expense_number' | 'created_at' | 'updated_at'>
) => {
  const expenseNumber = await getNextExpenseNumber();

  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      ...expense,
      expense_number: expenseNumber,
    }])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const updateExpense = async (
  id: string,
  expense: Partial<Expense>
) => {
  const { data, error } = await supabase
    .from('expenses')
    .update(expense)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const deleteExpense = async (id: string) => {
  await supabase
    .from('expense_attachments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('expense_id', id);

  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

export const submitExpense = async (id: string, submittedBy: string) => {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      status: 'pending',
      submitted_by: submittedBy,
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const approveExpense = async (id: string, approvedBy: string) => {
  const { data: expense, error: fetchError } = await supabase
    .from('expenses')
    .select('amount, description, case_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from('expenses')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;

  await createFinancialTransaction({
    transaction_date: new Date().toISOString().split('T')[0],
    amount: expense.amount,
    type: 'expense',
    description: `Expense approved: ${expense.description}`,
    related_expense_id: id,
    status: 'completed',
  });

  if (expense.case_id) {
    await createVATRecord({
      record_date: new Date().toISOString().split('T')[0],
      record_type: 'purchase',
      net_amount: expense.amount,
      vat_amount: 0,
      gross_amount: expense.amount,
      vat_rate: 0,
      description: expense.description,
      expense_id: id,
    });
  }

  return data;
};

export const rejectExpense = async (
  id: string,
  rejectedBy: string,
  reason: string
) => {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      status: 'rejected',
      approved_by: rejectedBy,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const markExpenseAsPaid = async (id: string) => {
  const { data, error } = await supabase
    .from('expenses')
    .update({ status: 'paid' })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const uploadExpenseAttachment = async (
  expenseId: string,
  file: File
): Promise<ExpenseAttachment> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${expenseId}/${Date.now()}.${fileExt}`;
  const filePath = `expense-receipts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('expense-receipts')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('expense_attachments')
    .insert([{
      expense_id: expenseId,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
    }])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const deleteExpenseAttachment = async (attachmentId: string) => {
  const { data: attachment, error: fetchError } = await supabase
    .from('expense_attachments')
    .select('file_path')
    .eq('id', attachmentId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  await supabase.storage
    .from('expense-receipts')
    .remove([attachment.file_path]);

  const { error } = await supabase
    .from('expense_attachments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', attachmentId);

  if (error) throw error;
};

export const getExpenseCategories = async () => {
  const { data, error } = await supabase
    .from('master_expense_categories')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
};

export const getExpensesByCase = async (caseId: string) => {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(id, name),
      submitter:profiles!expenses_submitted_by_fkey(id, full_name)
    `)
    .eq('case_id', caseId)
    .order('expense_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getExpenseStats = async (filters?: {
  dateFrom?: string;
  dateTo?: string;
}) => {
  let query = supabase
    .from('expenses')
    .select('amount, status, expense_date, category_id');

  if (filters?.dateFrom) {
    query = query.gte('expense_date', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('expense_date', filters.dateTo);
  }

  const { data: expenses, error } = await query;
  if (error) throw error;

  const thisMonth = new Date();
  thisMonth.setDate(1);
  const thisMonthStart = thisMonth.toISOString().split('T')[0];

  const approvedExpenses = expenses?.filter(e => e.status === 'approved' || e.status === 'paid') || [];

  return {
    total: expenses?.length || 0,
    pending: expenses?.filter(e => e.status === 'pending').length || 0,
    approved: expenses?.filter(e => e.status === 'approved').length || 0,
    rejected: expenses?.filter(e => e.status === 'rejected').length || 0,
    paid: expenses?.filter(e => e.status === 'paid').length || 0,
    totalAmount: approvedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    pendingAmount: expenses?.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
    thisMonthAmount: approvedExpenses.filter(e => e.expense_date >= thisMonthStart).reduce((sum, e) => sum + (e.amount || 0), 0),
  };
};

export const getExpensesByCategory = async (filters?: {
  dateFrom?: string;
  dateTo?: string;
}) => {
  let query = supabase
    .from('expenses')
    .select(`
      amount,
      category:expense_categories(id, name)
    `)
    .in('status', ['approved', 'paid']);

  if (filters?.dateFrom) {
    query = query.gte('expense_date', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('expense_date', filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;

  const categoryTotals: Record<string, { name: string; amount: number }> = {};

  (data || []).forEach((expense: any) => {
    const categoryName = expense.category?.name || 'Uncategorized';
    const categoryId = expense.category?.id || 'uncategorized';

    if (!categoryTotals[categoryId]) {
      categoryTotals[categoryId] = { name: categoryName, amount: 0 };
    }
    categoryTotals[categoryId].amount += expense.amount || 0;
  });

  return Object.entries(categoryTotals)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.amount - a.amount);
};

const createFinancialTransaction = async (transaction: {
  transaction_date: string;
  amount: number;
  type: string;
  description: string;
  related_expense_id?: string;
  status: string;
}) => {
  const { error } = await supabase
    .from('financial_transactions')
    .insert([transaction]);

  if (error) {
    logger.error('Error creating financial transaction:', error);
  }
};

const createVATRecord = async (record: {
  record_date: string;
  record_type: string;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  vat_rate: number;
  description: string;
  expense_id?: string;
}) => {
  const { error } = await supabase
    .from('vat_records')
    .insert([record]);

  if (error) {
    logger.error('Error creating VAT record:', error);
  }
};

export const expensesService = {
  getNextExpenseNumber,
  fetchExpenses,
  fetchExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  markExpenseAsPaid,
  uploadExpenseAttachment,
  deleteExpenseAttachment,
  getExpenseCategories,
  getExpensesByCase,
  getExpenseStats,
  getExpensesByCategory,
};
