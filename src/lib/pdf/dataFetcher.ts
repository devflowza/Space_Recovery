import { supabase } from '../supabaseClient';
import { getOrCreateCompanySettings } from '../companySettingsService';
import type {
  CaseData,
  DeviceData,
  CompanySettingsData,
  ReceiptData,
  QuoteData,
  QuoteDocumentData,
  InvoiceData,
  InvoiceDocumentData
} from './types';

export async function fetchReceiptData(caseId: string): Promise<ReceiptData> {
  const [caseResult, devicesResult, settingsResult] = await Promise.all([
    fetchCaseData(caseId),
    fetchCaseDevices(caseId),
    fetchCompanySettings(),
  ]);

  return {
    caseData: caseResult,
    devices: devicesResult,
    companySettings: settingsResult,
  };
}

async function fetchCaseData(caseId: string): Promise<CaseData> {
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .maybeSingle();

  if (caseError) {
    console.error('Error fetching case data:', caseError);
    throw new Error('Failed to load case data');
  }

  if (!caseData) {
    throw new Error('Case not found');
  }

  const [customerData, companyData, serviceTypeData, technicianData, createdByData] = await Promise.all([
    caseData.customer_id
      ? supabase
          .from('customers_enhanced')
          .select('id, customer_name, email, mobile_number, phone_number')
          .eq('id', caseData.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    caseData.company_id
      ? supabase
          .from('companies')
          .select('id, company_name')
          .eq('id', caseData.company_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    caseData.service_type_id
      ? supabase
          .from('service_types')
          .select('id, name')
          .eq('id', caseData.service_type_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    caseData.assigned_engineer_id
      ? supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', caseData.assigned_engineer_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    caseData.created_by
      ? supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', caseData.created_by)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    ...caseData,
    customer: customerData.data,
    company: companyData.data,
    service_type: serviceTypeData.data,
    assigned_technician: technicianData.data,
    created_by_profile: createdByData.data,
  } as CaseData;
}

async function fetchCaseDevices(caseId: string): Promise<DeviceData[]> {
  const { data, error } = await supabase
    .from('case_devices')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching case devices:', error);
    return [];
  }

  if (!data) return [];

  const deviceTypeIds = data.map(d => d.device_type_id).filter(Boolean);
  const brandIds = data.map(d => d.brand_id).filter(Boolean);
  const capacityIds = data.map(d => d.capacity_id).filter(Boolean);
  const deviceRoleIds = data.map(d => d.device_role_id).filter(Boolean);

  const [deviceTypes, brands, capacities, deviceRoles] = await Promise.all([
    deviceTypeIds.length > 0
      ? supabase.from('device_types').select('id, name').in('id', deviceTypeIds)
      : { data: [], error: null },
    brandIds.length > 0
      ? supabase.from('brands').select('id, name').in('id', brandIds)
      : { data: [], error: null },
    capacityIds.length > 0
      ? supabase.from('capacities').select('id, name').in('id', capacityIds)
      : { data: [], error: null },
    deviceRoleIds.length > 0
      ? supabase.from('device_roles').select('id, name').in('id', deviceRoleIds)
      : { data: [], error: null },
  ]);

  const deviceTypeMap = new Map((deviceTypes.data || []).map(dt => [dt.id, dt.name]));
  const brandMap = new Map((brands.data || []).map(b => [b.id, b.name]));
  const capacityMap = new Map((capacities.data || []).map(c => [c.id, c.name]));
  const roleMap = new Map((deviceRoles.data || []).map(role => [role.id, role.name]));

  return data.map(device => ({
    id: device.id,
    device_type: device.device_type_id ? deviceTypeMap.get(device.device_type_id) || device.media_type : device.media_type,
    brand: device.brand_id ? brandMap.get(device.brand_id) || device.brand : device.brand,
    model: device.model,
    serial_number: device.serial_no,
    capacity: device.capacity_id ? capacityMap.get(device.capacity_id) : (device.capacity_gb ? `${device.capacity_gb} GB` : null),
    condition: device.condition_text,
    role: device.device_role_id ? roleMap.get(device.device_role_id) : null,
    notes: device.device_problem || device.accessories,
    device_problem: device.device_problem,
  })) as DeviceData[];
}

async function fetchCompanySettings(): Promise<CompanySettingsData> {
  try {
    const settings = await getOrCreateCompanySettings();
    return {
      basic_info: settings.basic_info,
      location: settings.location,
      contact_info: settings.contact_info,
      branding: settings.branding,
      online_presence: settings.online_presence,
      legal_compliance: settings.legal_compliance,
      localization: settings.localization,
    } as CompanySettingsData;
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return {
      basic_info: { company_name: 'Company Name' },
      location: {},
      contact_info: {},
      branding: {},
      online_presence: {},
      legal_compliance: {},
      localization: {
        document_language_settings: {
          mode: 'english_only',
          secondary_language: null,
          language_name: null,
        },
      },
    };
  }
}

export async function fetchQuoteData(quoteId: string): Promise<QuoteDocumentData> {
  const [quoteResult, settingsResult] = await Promise.all([
    fetchQuoteDetails(quoteId),
    fetchCompanySettings(),
  ]);

  return {
    quoteData: quoteResult,
    companySettings: settingsResult,
  };
}

async function fetchQuoteDetails(quoteId: string): Promise<QuoteData> {
  const { data: quoteData, error: quoteError } = await supabase
    .from('quotes')
    .select(`
      *,
      cases!case_id (
        id,
        case_no,
        title,
        contact_name,
        contact_email,
        contact_phone
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
      bank_accounts (
        id,
        account_name,
        bank_name,
        account_number,
        iban,
        swift_code,
        branch_code
      ),
      accounting_locales (
        currency_symbol,
        currency_position,
        decimal_places
      )
    `)
    .eq('id', quoteId)
    .maybeSingle();

  if (quoteError) {
    console.error('Error fetching quote data:', quoteError);
    throw new Error('Failed to load quote data');
  }

  if (!quoteData) {
    throw new Error('Quote not found');
  }

  let customerAssociatedCompany = null;
  if (quoteData.customer_id) {
    const { data: relationshipData } = await supabase
      .from('customer_company_relationships')
      .select(`companies (id, company_name)`)
      .eq('customer_id', quoteData.customer_id)
      .eq('is_primary_contact', true)
      .maybeSingle();

    if (relationshipData && relationshipData.companies) {
      customerAssociatedCompany = relationshipData.companies;
    }
  }

  const { data: items, error: itemsError } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    console.error('Error fetching quote items:', itemsError);
  }

  const { data: defaultLocale } = await supabase
    .from('accounting_locales')
    .select('currency_symbol, currency_position, decimal_places')
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle();

  return {
    ...quoteData,
    quote_items: items || [],
    customer_associated_company: customerAssociatedCompany,
    accounting_locales: quoteData.accounting_locales || defaultLocale || {
      currency_symbol: 'OMR',
      currency_position: 'after',
      decimal_places: 3,
    },
  } as QuoteData;
}

export async function fetchInvoiceData(invoiceId: string): Promise<InvoiceDocumentData> {
  const [invoiceResult, settingsResult] = await Promise.all([
    fetchInvoiceDetails(invoiceId),
    fetchCompanySettings(),
  ]);

  return {
    invoiceData: invoiceResult,
    companySettings: settingsResult,
  };
}

async function fetchInvoiceDetails(invoiceId: string): Promise<InvoiceData> {
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .select(`
      *,
      cases (
        id,
        case_no,
        title,
        contact_name,
        contact_email,
        contact_phone
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
      ),
      accounting_locales (
        currency_symbol,
        currency_position,
        decimal_places
      )
    `)
    .eq('id', invoiceId)
    .maybeSingle();

  if (invoiceError) {
    console.error('Error fetching invoice data:', invoiceError);
    throw new Error('Failed to load invoice data');
  }

  if (!invoiceData) {
    throw new Error('Invoice not found');
  }

  let customerAssociatedCompany = null;
  if (invoiceData.customer_id) {
    const { data: relationshipData } = await supabase
      .from('customer_company_relationships')
      .select(`companies (id, company_name)`)
      .eq('customer_id', invoiceData.customer_id)
      .eq('is_primary_contact', true)
      .maybeSingle();

    if (relationshipData && relationshipData.companies) {
      customerAssociatedCompany = relationshipData.companies;
    }
  }

  const { data: items, error: itemsError } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    console.error('Error fetching invoice items:', itemsError);
  }

  const { data: defaultLocale } = await supabase
    .from('accounting_locales')
    .select('currency_symbol, currency_position, decimal_places')
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle();

  return {
    ...invoiceData,
    invoice_line_items: items || [],
    customer_associated_company: customerAssociatedCompany,
    accounting_locales: invoiceData.accounting_locales || defaultLocale || {
      currency_symbol: 'OMR',
      currency_position: 'after',
      decimal_places: 3,
    },
  } as InvoiceData;
}
