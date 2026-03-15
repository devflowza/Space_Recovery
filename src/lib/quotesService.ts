import { supabase } from './supabaseClient';

const sanitizeUuidFields = (data: any): any => {
  const sanitized = { ...data };
  const uuidFields = ['customer_id', 'company_id', 'case_id', 'created_by', 'approved_by', 'converted_to_case_id', 'template_id', 'accounting_locale_id', 'bank_account_id'];

  uuidFields.forEach(field => {
    if (field in sanitized && (sanitized[field] === '' || sanitized[field] === undefined)) {
      sanitized[field] = null;
    }
  });

  return sanitized;
};

export interface QuoteItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total?: number;
  sort_order?: number;
}

export interface Quote {
  id?: string;
  quote_number?: string;
  case_id: string;
  customer_id: string | null;
  company_id: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  title: string;
  description?: string;
  valid_until?: string;
  client_reference?: string;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  discount_type?: 'amount' | 'percentage';
  total_amount?: number;
  terms_and_conditions?: string;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  converted_to_case_id?: string;
  template_id?: string | null;
  accounting_locale_id?: string | null;
  bank_account_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface QuoteWithDetails extends Quote {
  cases?: {
    id: string;
    case_no: string;
    title: string;
  };
  customers?: {
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
  bank_accounts?: {
    id: string;
    account_name: string;
    bank_name: string;
    account_number: string;
    iban?: string;
    swift_code?: string;
    branch_code?: string;
  };
  quote_items?: QuoteItem[];
}

export const fetchQuotes = async (filters?: {
  status?: string;
  search?: string;
  customerId?: string;
  companyId?: string;
  caseId?: string;
}) => {
  try {
    let query = supabase
      .from('quotes')
      .select(`
        *,
        cases:cases!case_id (
          id,
          case_no,
          title
        ),
        customers:customers_enhanced (
          id,
          customer_name,
          email,
          mobile_number
        ),
        companies:companies (
          id,
          company_name,
          email,
          phone_number
        ),
        created_by_profile:profiles!quotes_created_by_fkey (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      query = query.or(`quote_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
    }

    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }

    if (filters?.caseId) {
      query = query.eq('case_id', filters.caseId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching quotes:', error);
      throw new Error(`Failed to fetch quotes: ${error.message}`);
    }

    return (data || []) as QuoteWithDetails[];
  } catch (error: any) {
    console.error('Fetch quotes failed:', error);
    throw error;
  }
};

export const fetchQuoteById = async (id: string) => {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      cases!case_id (
        id,
        case_no,
        title,
        customer_id,
        company_id
      ),
      customers:customers_enhanced (
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
        address_line1
      ),
      created_by_profile:profiles!quotes_created_by_fkey (
        id,
        full_name
      ),
      approved_by_profile:profiles!quotes_approved_by_fkey (
        id,
        full_name
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
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true });

  if (itemsError) throw itemsError;

  return {
    ...data,
    quote_items: items || [],
    customer_associated_company: customerAssociatedCompany,
  } as QuoteWithDetails;
};

export const getNextQuoteNumber = async () => {
  const { data, error } = await supabase.rpc('get_next_number', {
    sequence_scope: 'quote',
  });

  if (error) {
    console.error('Error generating quote number:', error);
    if (error.message?.includes('not found in the schema cache')) {
      throw new Error('Quote numbering system is not configured. Please contact your system administrator.');
    }
    if (error.message?.includes('Number sequence not found')) {
      throw new Error('Quote number sequence not found. Please configure it in Settings > System & Numbers.');
    }
    throw new Error(`Failed to generate quote number: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to generate quote number. Please try again or contact support.');
  }

  return data as string;
};

export const createQuote = async (quote: Quote, items: QuoteItem[]) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated. Please log in and try again.');
    }

    if (!quote.case_id) {
      throw new Error('Case ID is required to create a quote.');
    }

    if (!quote.customer_id && !quote.company_id) {
      throw new Error('Either customer or company must be specified for the quote.');
    }

    if (!items || items.length === 0) {
      throw new Error('At least one line item is required.');
    }

    if (!quote.title || quote.title.trim() === '') {
      throw new Error('Quote title is required.');
    }

    const quoteNumber = await getNextQuoteNumber();
    if (!quoteNumber) {
      throw new Error('Failed to generate quote number. Please try again.');
    }

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    const discountValue = quote.discount_type === 'percentage'
      ? (subtotal * (quote.discount_amount || 0)) / 100
      : (quote.discount_amount || 0);

    // Apply discount to subtotal first, then calculate VAT on discounted amount
    const discountedSubtotal = subtotal - discountValue;
    const taxAmount = discountedSubtotal * ((quote.tax_rate || 0) / 100);

    const totalAmount = discountedSubtotal + taxAmount;

    const quoteToInsert = sanitizeUuidFields({
      case_id: quote.case_id,
      customer_id: quote.customer_id || null,
      company_id: quote.company_id || null,
      status: quote.status || 'draft',
      title: quote.title.trim(),
      valid_until: quote.valid_until || null,
      client_reference: quote.client_reference || null,
      tax_rate: quote.tax_rate || 0,
      discount_amount: quote.discount_amount || 0,
      discount_type: quote.discount_type || 'fixed',
      terms_and_conditions: quote.terms_and_conditions || null,
      notes: quote.notes || null,
      quote_number: quoteNumber,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      created_by: user.id,
      bank_account_id: quote.bank_account_id || null,
      template_id: quote.template_id || null,
      accounting_locale_id: quote.accounting_locale_id || null,
    });

    const { data: quoteData, error: quoteError } = await supabase
      .from('quotes')
      .insert([quoteToInsert])
      .select()
      .single();

    if (quoteError) {
      console.error('Error creating quote:', quoteError);
      if (quoteError.message.includes('duplicate')) {
        throw new Error('A quote with this number already exists. Please try again.');
      }
      if (quoteError.message.includes('foreign key')) {
        throw new Error('Invalid case, customer, or company reference. Please check your data.');
      }
      if (quoteError.code === '42501') {
        throw new Error('You do not have permission to create quotes for this case.');
      }
      throw new Error(`Failed to create quote: ${quoteError.message}`);
    }

    if (!quoteData || !quoteData.id) {
      throw new Error('Quote was not created successfully. Please try again.');
    }

    const itemsWithQuoteId = items.map((item, index) => ({
      quote_id: quoteData.id,
      description: item.description.trim(),
      quantity: item.quantity,
      unit_price: item.unit_price,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(itemsWithQuoteId);

    if (itemsError) {
      console.error('Error creating quote items:', itemsError);
      await supabase.from('quotes').delete().eq('id', quoteData.id);
      throw new Error(`Failed to add quote items: ${itemsError.message}`);
    }

    return quoteData;
  } catch (error: any) {
    console.error('Quote creation failed:', error);
    throw error;
  }
};

export const updateQuote = async (id: string, quote: Partial<Quote>, items?: QuoteItem[]) => {
  let updateData: any = sanitizeUuidFields({ ...quote });

  if (items) {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    const discountValue = quote.discount_type === 'percentage'
      ? (subtotal * (quote.discount_amount || 0)) / 100
      : (quote.discount_amount || 0);

    // Apply discount to subtotal first, then calculate VAT on discounted amount
    const discountedSubtotal = subtotal - discountValue;
    const taxAmount = discountedSubtotal * ((quote.tax_rate || 0) / 100);

    const totalAmount = discountedSubtotal + taxAmount;

    updateData = {
      ...updateData,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    };

    await supabase.from('quote_items').delete().eq('quote_id', id);

    const itemsWithQuoteId = items.map((item, index) => ({
      quote_id: id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(itemsWithQuoteId);

    if (itemsError) throw itemsError;
  }

  const { data, error } = await supabase
    .from('quotes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteQuote = async (id: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('quotes')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq('id', id);

  if (error) throw error;
};

export const restoreQuote = async (id: string) => {
  const { error } = await supabase
    .from('quotes')
    .update({
      deleted_at: null,
      deleted_by: null,
    })
    .eq('id', id);

  if (error) throw error;
};

export const permanentDeleteQuote = async (id: string) => {
  const { error } = await supabase.from('quotes').delete().eq('id', id);
  if (error) throw error;
};

export const fetchDeletedQuotes = async () => {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      cases!case_id (
        id,
        case_no,
        title
      ),
      customers:customers_enhanced (
        id,
        customer_name,
        email,
        mobile_number
      ),
      companies:companies (
        id,
        company_name,
        email,
        phone_number
      ),
      created_by_profile:profiles!quotes_created_by_fkey (
        id,
        full_name
      ),
      deleted_by_profile:profiles!quotes_deleted_by_fkey (
        id,
        full_name
      )
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) throw error;
  return (data || []) as QuoteWithDetails[];
};

export const updateQuoteStatus = async (
  id: string,
  status: Quote['status'],
  additionalData?: Partial<Quote>
) => {
  const { data, error } = await supabase
    .from('quotes')
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

export const getQuoteStats = async () => {
  try {
    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('status, total_amount');

    if (error) {
      console.error('Error fetching quote stats:', error);
      throw new Error(`Failed to fetch quote statistics: ${error.message}`);
    }

    const quotesList = quotes || [];

    const stats = {
      total: quotesList.length,
      draft: quotesList.filter((q) => q.status === 'draft').length,
      sent: quotesList.filter((q) => q.status === 'sent').length,
      accepted: quotesList.filter((q) => q.status === 'accepted').length,
      rejected: quotesList.filter((q) => q.status === 'rejected').length,
      expired: quotesList.filter((q) => q.status === 'expired').length,
      converted: quotesList.filter((q) => q.status === 'converted').length,
      totalValue: quotesList.reduce((sum, q) => sum + (q.total_amount || 0), 0),
      sentValue: quotesList
        .filter((q) => q.status === 'sent')
        .reduce((sum, q) => sum + (q.total_amount || 0), 0),
      acceptedValue: quotesList
        .filter((q) => q.status === 'accepted')
        .reduce((sum, q) => sum + (q.total_amount || 0), 0),
    };

    return stats;
  } catch (error: any) {
    console.error('Get quote stats failed:', error);
    return {
      total: 0,
      draft: 0,
      sent: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
      converted: 0,
      totalValue: 0,
      sentValue: 0,
      acceptedValue: 0,
    };
  }
};

export const duplicateQuote = async (sourceId: string) => {
  const sourceQuote = await fetchQuoteById(sourceId);
  if (!sourceQuote) throw new Error('Source quote not found');

  const newQuote: Quote = {
    case_id: sourceQuote.case_id,
    customer_id: sourceQuote.customer_id,
    company_id: sourceQuote.company_id,
    status: 'draft',
    title: `${sourceQuote.title} (Copy)`,
    description: sourceQuote.description,
    valid_until: sourceQuote.valid_until,
    tax_rate: sourceQuote.tax_rate,
    discount_amount: sourceQuote.discount_amount,
    discount_type: sourceQuote.discount_type || 'amount',
    terms_and_conditions: sourceQuote.terms_and_conditions,
    notes: sourceQuote.notes,
    template_id: sourceQuote.template_id,
    accounting_locale_id: sourceQuote.accounting_locale_id,
    bank_account_id: sourceQuote.bank_account_id,
  };

  const items: QuoteItem[] =
    sourceQuote.quote_items?.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })) || [];

  return createQuote(newQuote, items);
};

export const getQuotesByCaseId = async (caseId: string) => {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      accounting_locales (
        currency_symbol,
        currency_position,
        decimal_places
      ),
      cases!case_id (
        id,
        case_no
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

  return data.map(quote => ({
    ...quote,
    currency_symbol: quote.accounting_locales?.currency_symbol || defaultCurrencySymbol,
    currency_position: quote.accounting_locales?.currency_position || defaultCurrencyPosition,
    decimal_places: quote.accounting_locales?.decimal_places || defaultDecimalPlaces,
  }));
};

import { generateQuote, generateQuoteAsBlob } from './pdf/pdfService';
import type { PDFGenerationResult, PDFBlobResult } from './pdf/pdfService';

export async function generateQuotePDF(quoteId: string, download: boolean = true): Promise<PDFGenerationResult> {
  return generateQuote(quoteId, download);
}

export async function generateQuotePDFBlob(quoteId: string): Promise<PDFBlobResult> {
  return generateQuoteAsBlob(quoteId);
}

export const quotesService = {
  fetchQuotes,
  fetchQuoteById,
  getNextQuoteNumber,
  createQuote,
  updateQuote,
  deleteQuote,
  restoreQuote,
  permanentDeleteQuote,
  fetchDeletedQuotes,
  updateQuoteStatus,
  getQuoteStats,
  duplicateQuote,
  getQuotesByCaseId,
  generateQuotePDF,
  generateQuotePDFBlob,
};
