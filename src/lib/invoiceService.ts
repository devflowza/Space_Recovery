import { supabase } from './supabaseClient';

const sanitizeUuidFields = (data: any): any => {
  const sanitized = { ...data };
  const uuidFields = ['customer_id', 'company_id', 'case_id', 'created_by', 'template_id', 'accounting_locale_id', 'quote_id', 'currency_id'];

  uuidFields.forEach(field => {
    if (field in sanitized && (sanitized[field] === '' || sanitized[field] === undefined)) {
      sanitized[field] = null;
    }
  });

  return sanitized;
};

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  discount_percent?: number;
  line_total?: number;
  sort_order?: number;
}

export interface Invoice {
  id?: string;
  invoice_number?: string;
  case_id: string;
  customer_id?: string | null;
  company_id?: string | null;
  invoice_type: 'proforma' | 'tax_invoice';
  title: string;
  invoice_date: string;
  due_date: string;
  status: string;
  client_reference?: string;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_type?: 'fixed' | 'percentage';
  discount_amount?: number;
  total_amount?: number;
  amount_paid?: number;
  amount_due?: number;
  currency_id?: string | null;
  terms_and_conditions?: string;
  notes?: string;
  internal_notes?: string;
  payment_terms?: string;
  sent_at?: string | null;
  created_by?: string;
  template_id?: string | null;
  accounting_locale_id?: string | null;
  bank_account_id?: string | null;
  quote_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceWithDetails extends Invoice {
  cases?: {
    id: string;
    case_no: string;
    title: string;
  };
  customers_enhanced?: {
    id: string;
    customer_name: string;
    email: string;
    mobile_number: string;
  };
  companies?: {
    id: string;
    company_name: string;
    email: string;
    phone_number: string;
  };
  customer_associated_company?: {
    id: string;
    company_name: string;
  } | null;
  created_by_profile?: {
    id: string;
    full_name: string;
  };
  invoice_line_items?: InvoiceItem[];
  quote?: {
    id: string;
    quote_number: string;
  };
  bank_accounts?: {
    id: string;
    account_name: string;
    bank_name: string;
    account_number: string;
    iban: string;
    swift_code: string;
    branch_code: string;
  };
}

export const fetchInvoices = async (filters?: {
  status?: string;
  invoiceType?: string;
  search?: string;
  caseId?: string;
  customerId?: string;
  companyId?: string;
}) => {
  let query = supabase
    .from('invoices')
    .select(`
      *,
      cases (
        id,
        case_no,
        title
      ),
      customers_enhanced (
        id,
        customer_name,
        email,
        mobile_number
      ),
      companies (
        id,
        company_name,
        email,
        phone_number
      ),
      created_by_profile:profiles!invoices_created_by_fkey (
        id,
        full_name
      ),
      quote:quotes!invoices_quote_id_fkey (
        id,
        quote_number
      )
    `)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.invoiceType && filters.invoiceType !== 'all') {
    query = query.eq('invoice_type', filters.invoiceType);
  }

  if (filters?.search) {
    query = query.or(`invoice_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
  }

  if (filters?.caseId) {
    query = query.eq('case_id', filters.caseId);
  }

  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }

  if (filters?.companyId) {
    query = query.eq('company_id', filters.companyId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as InvoiceWithDetails[];
};

export const fetchInvoiceById = async (id: string) => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      cases (
        id,
        case_no,
        title,
        customer_id,
        company_id
      ),
      customers_enhanced (
        id,
        customer_name,
        email,
        mobile_number,
        phone_number,
        address_line1,
        address_line2,
        city,
        postal_code,
        country
      ),
      companies (
        id,
        company_name,
        email,
        phone_number,
        address_line1,
        address_line2,
        city,
        postal_code,
        country
      ),
      created_by_profile:profiles!invoices_created_by_fkey (
        id,
        full_name
      ),
      quote:quotes!invoices_quote_id_fkey (
        id,
        quote_number,
        title
      ),
      bank_accounts (
        id,
        account_name,
        bank_name,
        account_number,
        iban,
        swift_code,
        branch_code
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  let customerAssociatedCompany = null;
  if (data.customer_id) {
    const { data: relationshipData } = await supabase
      .from('customer_company_relationships')
      .select(`
        companies (id, company_name)
      `)
      .eq('customer_id', data.customer_id)
      .eq('is_primary_contact', true)
      .maybeSingle();

    if (relationshipData && relationshipData.companies) {
      customerAssociatedCompany = relationshipData.companies;
    }
  }

  const { data: items, error: itemsError } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true });

  if (itemsError) throw itemsError;

  return {
    ...data,
    invoice_line_items: items || [],
    customer_associated_company: customerAssociatedCompany,
  } as InvoiceWithDetails;
};

export const getNextInvoiceNumber = async (invoiceType: 'proforma' | 'tax_invoice') => {
  const { data, error } = await supabase.rpc('get_next_invoice_number', {
    invoice_type_param: invoiceType,
  });

  if (error) throw error;
  return data as string;
};

export const createInvoice = async (invoice: Partial<Invoice>, items: InvoiceItem[]) => {
  const invoiceTitle = invoice.title;
  if (!invoiceTitle || invoiceTitle.trim() === '') {
    throw new Error('Invoice title is required');
  }

  if (!invoice.case_id) {
    throw new Error('Case ID is required for invoice');
  }

  const invoiceNumber = await getNextInvoiceNumber(invoice.invoice_type);

  const subtotal = items.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.unit_price;
    const discount = itemSubtotal * ((item.discount_percent || 0) / 100);
    return sum + (itemSubtotal - discount);
  }, 0);

  const discountedSubtotal = subtotal - (invoice.discount_amount || 0);
  const invoiceTaxRate = invoice.tax_rate || 0;
  const taxAmount = (discountedSubtotal * invoiceTaxRate) / 100;
  const totalAmount = discountedSubtotal + taxAmount;
  const amountDue = totalAmount - (invoice.amount_paid || 0);

  const invoiceToInsert = {
    title: invoiceTitle,
    invoice_number: invoiceNumber,
    invoice_type: invoice.invoice_type || 'tax_invoice',
    case_id: invoice.case_id,
    customer_id: invoice.customer_id || null,
    company_id: invoice.company_id || null,
    quote_id: invoice.quote_id || null,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    status: invoice.status || 'draft',
    client_reference: invoice.client_reference || null,
    subtotal,
    tax_rate: invoiceTaxRate,
    tax_amount: taxAmount,
    discount_type: invoice.discount_type || 'fixed',
    discount_amount: invoice.discount_amount || 0,
    total_amount: totalAmount,
    amount_paid: invoice.amount_paid || 0,
    amount_due: amountDue,
    terms_and_conditions: invoice.terms_and_conditions || null,
    notes: invoice.notes || null,
    bank_account_id: invoice.bank_account_id || null,
    accounting_locale_id: invoice.accounting_locale_id || null,
  };

  const sanitizedInvoice = sanitizeUuidFields(invoiceToInsert);

  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .insert([sanitizedInvoice])
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  const itemsWithInvoiceId = items.map((item, index) => {
    const itemSubtotal = item.quantity * item.unit_price;
    const discount = itemSubtotal * ((item.discount_percent || 0) / 100);
    const taxableAmount = itemSubtotal - discount;
    const itemTax = taxableAmount * (invoiceTaxRate / 100);
    const lineTotal = taxableAmount + itemTax;

    return {
      invoice_id: invoiceData.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: invoiceTaxRate,
      discount_percent: item.discount_percent || 0,
      line_total: lineTotal,
      sort_order: index,
    };
  });

  const { error: itemsError } = await supabase
    .from('invoice_line_items')
    .insert(itemsWithInvoiceId);

  if (itemsError) throw itemsError;

  return invoiceData;
};

export const updateInvoice = async (id: string, invoice: Partial<Invoice>, items?: InvoiceItem[]) => {
  let updateData: any = sanitizeUuidFields({ ...invoice });

  if (items) {
    const subtotal = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unit_price;
      const discount = itemSubtotal * ((item.discount_percent || 0) / 100);
      return sum + (itemSubtotal - discount);
    }, 0);

    // Apply global invoice discount to subtotal first, then calculate VAT on discounted amount
    const discountedSubtotal = subtotal - (invoice.discount_amount || 0);

    // Use the invoice-level tax rate for all items
    const invoiceTaxRate = invoice.tax_rate || 0;
    const taxAmount = (discountedSubtotal * invoiceTaxRate) / 100;

    const totalAmount = discountedSubtotal + taxAmount;
    const amountDue = totalAmount - (invoice.amount_paid || 0);

    updateData = {
      ...updateData,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      amount_due: amountDue,
    };

    await supabase.from('invoice_line_items').delete().eq('invoice_id', id);

    const itemsWithInvoiceId = items.map((item, index) => {
      const itemSubtotal = item.quantity * item.unit_price;
      const discount = itemSubtotal * ((item.discount_percent || 0) / 100);
      const taxableAmount = itemSubtotal - discount;
      const itemTax = taxableAmount * (invoiceTaxRate / 100);
      const lineTotal = taxableAmount + itemTax;

      return {
        invoice_id: id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: invoiceTaxRate,
        discount_percent: item.discount_percent || 0,
        line_total: lineTotal,
        sort_order: index,
      };
    });

    const { error: itemsError } = await supabase
      .from('invoice_line_items')
      .insert(itemsWithInvoiceId);

    if (itemsError) throw itemsError;
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteInvoice = async (id: string) => {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
};

export const updateInvoiceStatus = async (
  id: string,
  status: string,
  additionalData?: Partial<Invoice>
) => {
  const { data, error } = await supabase
    .from('invoices')
    .update({
      status,
      ...additionalData,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getInvoiceStats = async (filters?: { caseId?: string }) => {
  let query = supabase.from('invoices').select('status, total_amount, amount_paid, amount_due, invoice_type');

  if (filters?.caseId) {
    query = query.eq('case_id', filters.caseId);
  }

  const { data: invoices, error } = await query;

  if (error) throw error;

  const stats = {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === 'draft').length,
    sent: invoices.filter((i) => i.status === 'sent').length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    partial: invoices.filter((i) => i.status === 'partial').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
    proforma: invoices.filter((i) => i.invoice_type === 'proforma').length,
    taxInvoice: invoices.filter((i) => i.invoice_type === 'tax_invoice').length,
    totalValue: invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
    totalPaid: invoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0),
    totalOutstanding: invoices.reduce((sum, i) => sum + (i.amount_due || 0), 0),
  };

  return stats;
};

export const convertQuoteToInvoice = async (
  quoteId: string,
  invoiceType: 'proforma' | 'tax_invoice',
  dueDate: string,
  additionalData?: Partial<Invoice>
) => {
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_items (*)
    `)
    .eq('id', quoteId)
    .single();

  if (quoteError) throw quoteError;
  if (!quote) throw new Error('Quote not found');

  if (!quote.case_id) {
    throw new Error('Quote must be linked to a case to convert to invoice');
  }

  const newInvoice: Invoice = {
    case_id: quote.case_id,
    customer_id: quote.customer_id,
    company_id: quote.company_id,
    invoice_type: invoiceType,
    title: quote.title || 'Invoice',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: dueDate,
    status: 'draft',
    discount_amount: quote.discount_amount || 0,
    terms_and_conditions: quote.terms_and_conditions || '',
    notes: quote.notes || '',
    quote_id: quote.id,
    template_id: quote.template_id,
    accounting_locale_id: quote.accounting_locale_id,
    ...additionalData,
  };

  const items: InvoiceItem[] = (quote.quote_items || []).map((item: any) => ({
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    tax_rate: quote.tax_rate || 0,
  }));

  const createdInvoice = await createInvoice(newInvoice, items);

  await supabase
    .from('quotes')
    .update({
      status: 'converted',
      converted_to_case_id: quote.case_id,
    })
    .eq('id', quoteId);

  return createdInvoice;
};

export const getInvoicesByCaseId = async (caseId: string) => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      accounting_locales (
        currency_symbol,
        currency_position,
        decimal_places
      )
    `)
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const { data: defaultLocale } = await supabase
    .from('accounting_locales')
    .select('currency_symbol, currency_position, decimal_places')
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle();

  const defaultCurrencySymbol = defaultLocale?.currency_symbol || 'OMR';
  const defaultCurrencyPosition = defaultLocale?.currency_position || 'after';
  const defaultDecimalPlaces = defaultLocale?.decimal_places || 3;

  return data.map(invoice => ({
    ...invoice,
    currency_symbol: invoice.accounting_locales?.currency_symbol || defaultCurrencySymbol,
    currency_position: invoice.accounting_locales?.currency_position || defaultCurrencyPosition,
    decimal_places: invoice.accounting_locales?.decimal_places || defaultDecimalPlaces,
  }));
};

export const recordPayment = async (
  invoiceId: string,
  paymentData: {
    amount: number;
    payment_method: string;
    payment_date: string;
    reference_number?: string;
    notes?: string;
  }
) => {
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid, invoice_type')
    .eq('id', invoiceId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!invoice) throw new Error('Invoice not found');

  // Only allow payment recording for tax invoices, not proforma invoices
  if (invoice.invoice_type !== 'tax_invoice') {
    throw new Error('Payments can only be recorded against Tax Invoices, not Proforma Invoices.');
  }

  const newAmountPaid = (invoice.amount_paid || 0) + paymentData.amount;
  const newBalanceDue = invoice.total_amount - newAmountPaid;

  let newStatus = 'partial';
  if (newBalanceDue <= 0) {
    newStatus = 'paid';
  } else if (newAmountPaid === 0) {
    newStatus = 'sent';
  }

  const { data: payment, error: paymentError } = await supabase
    .from('invoice_payments')
    .insert([
      {
        invoice_id: invoiceId,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
        reference_number: paymentData.reference_number,
        notes: paymentData.notes,
      },
    ])
    .select()
    .single();

  if (paymentError) throw paymentError;

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      amount_paid: newAmountPaid,
      amount_due: newBalanceDue,
      status: newStatus,
    })
    .eq('id', invoiceId);

  if (updateError) throw updateError;

  return payment;
};

export const getPaymentHistory = async (invoiceId: string) => {
  const { data, error } = await supabase
    .from('invoice_payments')
    .select(`
      *,
      recorded_by_profile:profiles!invoice_payments_recorded_by_fkey (
        id,
        full_name
      )
    `)
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const convertProformaToTaxInvoice = async (
  proformaId: string,
  dueDate?: string,
  notes?: string
) => {
  const { data, error } = await supabase.rpc('convert_proforma_to_tax_invoice', {
    p_proforma_id: proformaId,
    p_due_date: dueDate || null,
    p_notes: notes || null,
  });

  if (error) throw error;
  return data;
};

export const getConversionHistory = async (proformaId: string) => {
  const { data, error } = await supabase
    .from('invoice_conversion_history')
    .select('*')
    .eq('proforma_id', proformaId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

import { generateInvoice, generateInvoiceAsBlob } from './pdf/pdfService';
import type { PDFGenerationResult, PDFBlobResult } from './pdf/pdfService';

export async function generateInvoicePDF(invoiceId: string, download: boolean = true): Promise<PDFGenerationResult> {
  return generateInvoice(invoiceId, download);
}

export async function generateInvoicePDFBlob(invoiceId: string): Promise<PDFBlobResult> {
  return generateInvoiceAsBlob(invoiceId);
}

export const invoiceService = {
  fetchInvoices,
  fetchInvoiceById,
  getNextInvoiceNumber,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  getInvoiceStats,
  recordPayment,
  getPaymentHistory,
  convertQuoteToInvoice,
  getInvoicesByCaseId,
  convertProformaToTaxInvoice,
  getConversionHistory,
  generateInvoicePDF,
  generateInvoicePDFBlob,
};
