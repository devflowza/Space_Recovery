import { supabase } from './supabaseClient';

export interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  account_type: 'bank' | 'cash' | 'mobile';
  branch_code?: string;
  swift_code?: string;
  iban?: string;
  currency_id?: string;
  current_balance: number;
  opening_balance: number;
  is_active: boolean;
  is_default: boolean;
  employee_id?: string;
  mobile_number?: string;
  mobile_provider?: string;
  location?: string;
  created_at: string;
  updated_at: string;
  currency?: {
    code: string;
    symbol: string;
    name: string;
  };
  employee?: {
    id: string;
    full_name: string;
  };
}

export interface PaymentReceipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  account_id: string;
  payment_method_id?: string;
  amount: number;
  source_type: 'customer' | 'company' | 'other';
  customer_id?: string;
  company_id?: string;
  case_id?: string;
  reference_number?: string;
  description?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  allocated_amount: number;
  unallocated_amount: number;
  is_reconciled: boolean;
  created_at: string;
}

export interface PaymentDisbursement {
  id: string;
  disbursement_number: string;
  disbursement_date: string;
  account_id: string;
  payment_method_id?: string;
  amount: number;
  payee_name: string;
  payee_type: 'vendor' | 'supplier' | 'employee' | 'utility' | 'other';
  expense_category_id?: string;
  reference_number?: string;
  description: string;
  notes?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  approval_required: boolean;
  created_at: string;
}

export interface AccountTransfer {
  id: string;
  transfer_number: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transfer_date: string;
  reference?: string;
  description?: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled';
  approval_required: boolean;
  created_at: string;
}

export interface ReconciliationSession {
  id: string;
  session_number: string;
  account_id: string;
  start_date: string;
  end_date: string;
  opening_balance: number;
  closing_balance: number;
  system_balance?: number;
  variance?: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  matched_count: number;
  unmatched_count: number;
  created_at: string;
}

export const bankingService = {
  async getAccounts(filters?: {
    account_type?: string;
    is_active?: boolean;
  }): Promise<BankAccount[]> {
    let query = supabase
      .from('bank_accounts')
      .select(`
        *,
        currency:currency_codes(code, symbol, name),
        employee:profiles!bank_accounts_employee_id_fkey(id, full_name)
      `)
      .is('deleted_at', null)
      .order('account_name');

    if (filters?.account_type) {
      query = query.eq('account_type', filters.account_type);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as BankAccount[];
  },

  async getAccountById(id: string): Promise<BankAccount | null> {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select(`
        *,
        currency:currency_codes(code, symbol, name),
        employee:profiles!bank_accounts_employee_id_fkey(id, full_name)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data as BankAccount | null;
  },

  async createAccount(accountData: Partial<BankAccount>): Promise<BankAccount> {
    const { data: { user } } = await supabase.auth.getUser();

    const dataToInsert: any = {
      ...accountData,
      created_by: user?.id,
    };

    if (accountData.account_type === 'cash') {
      dataToInsert.account_number = null;
    } else if (accountData.account_type === 'mobile') {
      if (!accountData.mobile_number?.trim()) {
        throw new Error('Mobile number is required for mobile money accounts');
      }
      dataToInsert.account_number = null;
    }

    const { data, error } = await supabase
      .from('bank_accounts')
      .insert(dataToInsert)
      .select(`
        *,
        currency:currency_codes(code, symbol, name),
        employee:profiles!bank_accounts_employee_id_fkey(id, full_name)
      `)
      .single();

    if (error) throw error;
    return data as BankAccount;
  },

  async updateAccount(id: string, updates: Partial<BankAccount>): Promise<BankAccount> {
    const { data: { user } } = await supabase.auth.getUser();

    const dataToUpdate: any = {
      ...updates,
      updated_by: user?.id,
    };

    if (updates.account_type === 'cash') {
      dataToUpdate.account_number = null;
    } else if (updates.account_type === 'mobile') {
      if (updates.mobile_number !== undefined && !updates.mobile_number?.trim()) {
        throw new Error('Mobile number is required for mobile money accounts');
      }
      dataToUpdate.account_number = null;
    }

    const { data, error } = await supabase
      .from('bank_accounts')
      .update(dataToUpdate)
      .eq('id', id)
      .select(`
        *,
        currency:currency_codes(code, symbol, name),
        employee:profiles!bank_accounts_employee_id_fkey(id, full_name)
      `)
      .single();

    if (error) throw error;
    return data as BankAccount;
  },

  async deleteAccount(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('bank_accounts')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id,
        is_active: false,
      })
      .eq('id', id);

    if (error) throw error;
  },

  async setDefaultAccount(id: string): Promise<void> {
    await supabase.from('bank_accounts').update({ is_default: false }).neq('id', id);

    const { error } = await supabase
      .from('bank_accounts')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
  },

  async getReceipts(filters?: {
    account_id?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    is_reconciled?: boolean;
  }): Promise<PaymentReceipt[]> {
    let query = supabase
      .from('payment_receipts')
      .select(`
        *,
        account:bank_accounts(id, account_name, account_type),
        payment_method:payment_methods(id, name),
        customer:customers_enhanced(id, customer_name, email),
        company:companies(id, company_name),
        case:cases(id, case_number)
      `)
      .is('deleted_at', null)
      .order('receipt_date', { ascending: false });

    if (filters?.account_id) {
      query = query.eq('account_id', filters.account_id);
    }

    if (filters?.start_date) {
      query = query.gte('receipt_date', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('receipt_date', filters.end_date);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.is_reconciled !== undefined) {
      query = query.eq('is_reconciled', filters.is_reconciled);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as PaymentReceipt[];
  },

  async createReceipt(receiptData: Partial<PaymentReceipt>): Promise<PaymentReceipt> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: receiptNumber } = await supabase.rpc('get_next_receipt_number');

    const { data, error } = await supabase
      .from('payment_receipts')
      .insert({
        ...receiptData,
        receipt_number: receiptNumber,
        unallocated_amount: receiptData.amount,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;

    if (data && receiptData.account_id) {
      await this.updateAccountBalance(receiptData.account_id, receiptData.amount || 0, 'credit');
    }

    return data as PaymentReceipt;
  },

  async getDisbursements(filters?: {
    account_id?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Promise<PaymentDisbursement[]> {
    let query = supabase
      .from('payment_disbursements')
      .select(`
        *,
        account:bank_accounts(id, account_name, account_type),
        payment_method:payment_methods(id, name),
        expense_category:expense_categories(id, name),
        expense:expenses(id, expense_number)
      `)
      .is('deleted_at', null)
      .order('disbursement_date', { ascending: false });

    if (filters?.account_id) {
      query = query.eq('account_id', filters.account_id);
    }

    if (filters?.start_date) {
      query = query.gte('disbursement_date', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('disbursement_date', filters.end_date);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as PaymentDisbursement[];
  },

  async createDisbursement(disbursementData: Partial<PaymentDisbursement>): Promise<PaymentDisbursement> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: canPay } = await supabase.rpc('validate_account_balance', {
      p_account_id: disbursementData.account_id,
      p_amount: disbursementData.amount,
    });

    if (!canPay) {
      throw new Error('Insufficient balance in the selected account');
    }

    const { data: disbursementNumber } = await supabase.rpc('get_next_disbursement_number');

    const { data, error } = await supabase
      .from('payment_disbursements')
      .insert({
        ...disbursementData,
        disbursement_number: disbursementNumber,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;

    if (data && data.status === 'paid' && disbursementData.account_id) {
      await this.updateAccountBalance(disbursementData.account_id, disbursementData.amount || 0, 'debit');
    }

    return data as PaymentDisbursement;
  },

  async approveDisbursement(id: string, notes?: string): Promise<PaymentDisbursement> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('payment_disbursements')
      .update({
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        approval_notes: notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PaymentDisbursement;
  },

  async getTransfers(filters?: {
    account_id?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Promise<AccountTransfer[]> {
    let query = supabase
      .from('account_transfers')
      .select(`
        *,
        from_account:bank_accounts!account_transfers_from_account_id_fkey(id, account_name, account_type),
        to_account:bank_accounts!account_transfers_to_account_id_fkey(id, account_name, account_type)
      `)
      .is('deleted_at', null)
      .order('transfer_date', { ascending: false });

    if (filters?.account_id) {
      query = query.or(`from_account_id.eq.${filters.account_id},to_account_id.eq.${filters.account_id}`);
    }

    if (filters?.start_date) {
      query = query.gte('transfer_date', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('transfer_date', filters.end_date);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as AccountTransfer[];
  },

  async createTransfer(transferData: Partial<AccountTransfer>): Promise<AccountTransfer> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: canTransfer } = await supabase.rpc('validate_account_balance', {
      p_account_id: transferData.from_account_id,
      p_amount: transferData.amount,
    });

    if (!canTransfer) {
      throw new Error('Insufficient balance in the source account');
    }

    const { data: transferNumber } = await supabase.rpc('get_next_transfer_number');

    const { data, error } = await supabase
      .from('account_transfers')
      .insert({
        ...transferData,
        transfer_number: transferNumber,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;

    if (data && data.status === 'completed') {
      await this.updateAccountBalance(transferData.from_account_id!, transferData.amount!, 'debit');
      await this.updateAccountBalance(transferData.to_account_id!, transferData.amount!, 'credit');
    }

    return data as AccountTransfer;
  },

  async approveTransfer(id: string, notes?: string): Promise<AccountTransfer> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('account_transfers')
      .update({
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        approval_notes: notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AccountTransfer;
  },

  async completeTransfer(id: string): Promise<AccountTransfer> {
    const { data: transfer } = await supabase
      .from('account_transfers')
      .select('*')
      .eq('id', id)
      .single();

    if (!transfer) throw new Error('Transfer not found');

    const { data, error } = await supabase
      .from('account_transfers')
      .update({ status: 'completed' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await this.updateAccountBalance(transfer.from_account_id, transfer.amount, 'debit');
    await this.updateAccountBalance(transfer.to_account_id, transfer.amount, 'credit');

    return data as AccountTransfer;
  },

  async allocateReceiptToInvoice(
    receiptId: string,
    invoiceId: string,
    amount: number
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('receipt_allocations')
      .insert({
        receipt_id: receiptId,
        invoice_id: invoiceId,
        allocated_amount: amount,
        created_by: user?.id,
      });

    if (error) throw error;

    const { data: invoice } = await supabase
      .from('invoices')
      .select('amount_paid, amount_due')
      .eq('id', invoiceId)
      .single();

    if (invoice) {
      const newAmountPaid = (invoice.amount_paid || 0) + amount;
      const newAmountDue = (invoice.amount_due || 0) - amount;

      await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          amount_due: newAmountDue,
          status: newAmountDue <= 0 ? 'paid' : 'partially-paid',
        })
        .eq('id', invoiceId);
    }
  },

  async updateAccountBalance(
    accountId: string,
    amount: number,
    type: 'credit' | 'debit'
  ): Promise<void> {
    const { data: account } = await supabase
      .from('bank_accounts')
      .select('current_balance')
      .eq('id', accountId)
      .single();

    if (!account) throw new Error('Account not found');

    const newBalance = type === 'credit'
      ? (account.current_balance || 0) + amount
      : (account.current_balance || 0) - amount;

    const { error } = await supabase
      .from('bank_accounts')
      .update({ current_balance: newBalance })
      .eq('id', accountId);

    if (error) throw error;
  },

  async getAccountBalanceSummary(): Promise<{
    totalBankBalance: number;
    totalCashBalance: number;
    totalMobileBalance: number;
    pendingReconciliations: number;
  }> {
    const { data: accounts } = await supabase
      .from('bank_accounts')
      .select('account_type, current_balance')
      .eq('is_active', true)
      .is('deleted_at', null);

    const { data: unreconciledCount } = await supabase
      .from('bank_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('is_reconciled', false);

    const bankBalance = accounts
      ?.filter(a => a.account_type === 'bank')
      .reduce((sum, a) => sum + (a.current_balance || 0), 0) || 0;

    const cashBalance = accounts
      ?.filter(a => a.account_type === 'cash')
      .reduce((sum, a) => sum + (a.current_balance || 0), 0) || 0;

    const mobileBalance = accounts
      ?.filter(a => a.account_type === 'mobile')
      .reduce((sum, a) => sum + (a.current_balance || 0), 0) || 0;

    return {
      totalBankBalance: bankBalance,
      totalCashBalance: cashBalance,
      totalMobileBalance: mobileBalance,
      pendingReconciliations: unreconciledCount?.count || 0,
    };
  },

  async getBankTransactions(filters?: {
    account_id?: string;
    start_date?: string;
    end_date?: string;
    is_reconciled?: boolean;
  }) {
    let query = supabase
      .from('bank_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (filters?.account_id) {
      query = query.eq('bank_account_id', filters.account_id);
    }

    if (filters?.start_date) {
      query = query.gte('transaction_date', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('transaction_date', filters.end_date);
    }

    if (filters?.is_reconciled !== undefined) {
      query = query.eq('is_reconciled', filters.is_reconciled);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getCasesWithInvoices(filters?: {
    search?: string;
    hasOutstandingInvoices?: boolean;
  }) {
    let query = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        amount_paid,
        amount_due,
        status,
        case_id,
        cases!invoices_case_id_fkey (
          id,
          case_number,
          title,
          customer_id,
          company_id,
          customers_enhanced!cases_customer_id_fkey (
            id,
            customer_name,
            email
          ),
          companies!cases_company_id_fkey (
            id,
            company_name,
            email
          )
        )
      `)
      .not('case_id', 'is', null);

    if (filters?.hasOutstandingInvoices) {
      query = query.gt('amount_due', 0);
    }

    if (filters?.search) {
      query = query.or(`cases.case_number.ilike.%${filters.search}%,cases.title.ilike.%${filters.search}%`);
    }

    const { data: invoices, error } = await query;
    if (error) throw error;

    const casesMap = new Map();

    (invoices || []).forEach((invoice: any) => {
      if (invoice.cases) {
        const caseId = invoice.cases.id;
        if (!casesMap.has(caseId)) {
          casesMap.set(caseId, {
            id: invoice.cases.id,
            case_number: invoice.cases.case_number,
            title: invoice.cases.title,
            customer_id: invoice.cases.customer_id,
            company_id: invoice.cases.company_id,
            customers_enhanced: invoice.cases.customers_enhanced,
            companies: invoice.cases.companies,
            invoices: [],
          });
        }
        casesMap.get(caseId).invoices.push({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          total_amount: invoice.total_amount,
          amount_paid: invoice.amount_paid,
          amount_due: invoice.amount_due,
          status: invoice.status,
        });
      }
    });

    const cases = Array.from(casesMap.values());

    cases.sort((a, b) => {
      const numA = parseInt(a.case_number) || 0;
      const numB = parseInt(b.case_number) || 0;
      return numB - numA;
    });

    return cases.slice(0, 50).map(c => ({
      ...c,
      client_name: c.customers_enhanced
        ? c.customers_enhanced.customer_name
        : c.companies?.company_name || 'Unknown Client',
    }));
  },

  async getInvoicesByCase(caseId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        due_date,
        invoice_type,
        status,
        total_amount,
        amount_paid,
        amount_due,
        currency_id,
        accounting_locale_id,
        accounting_locales (
          currency_symbol,
          currency_position,
          decimal_places
        )
      `)
      .eq('case_id', caseId)
      .order('invoice_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createReceiptWithAllocations(
    receiptData: Partial<PaymentReceipt>,
    allocations: Array<{ invoice_id: string; allocated_amount: number }>
  ): Promise<PaymentReceipt> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: receiptNumber } = await supabase.rpc('get_next_receipt_number');

    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
    const unallocated = (receiptData.amount || 0) - totalAllocated;

    const { data: receipt, error: receiptError } = await supabase
      .from('payment_receipts')
      .insert({
        ...receiptData,
        receipt_number: receiptNumber,
        allocated_amount: totalAllocated,
        unallocated_amount: unallocated,
        created_by: user?.id,
      })
      .select()
      .single();

    if (receiptError) throw receiptError;

    if (allocations.length > 0) {
      const allocationRecords = allocations.map(a => ({
        receipt_id: receipt.id,
        invoice_id: a.invoice_id,
        allocated_amount: a.allocated_amount,
        created_by: user?.id,
      }));

      const { error: allocError } = await supabase
        .from('receipt_allocations')
        .insert(allocationRecords);

      if (allocError) throw allocError;

      for (const allocation of allocations) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('amount_paid, amount_due, total_amount')
          .eq('id', allocation.invoice_id)
          .single();

        if (invoice) {
          const newAmountPaid = (invoice.amount_paid || 0) + allocation.allocated_amount;
          const newAmountDue = (invoice.amount_due || 0) - allocation.allocated_amount;

          let newStatus = invoice.status;
          if (newAmountDue <= 0) {
            newStatus = 'paid';
          } else if (newAmountPaid > 0) {
            newStatus = 'partially-paid';
          }

          await supabase
            .from('invoices')
            .update({
              amount_paid: newAmountPaid,
              amount_due: newAmountDue,
              status: newStatus,
            })
            .eq('id', allocation.invoice_id);
        }
      }
    }

    if (receiptData.account_id) {
      await this.updateAccountBalance(receiptData.account_id, receiptData.amount || 0, 'credit');
    }

    return receipt as PaymentReceipt;
  },
};
