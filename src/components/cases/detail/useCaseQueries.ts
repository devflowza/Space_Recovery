import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { quotesService } from '../../../lib/quotesService';
import { invoiceService } from '../../../lib/invoiceService';
import { getCaseFinancialSummary } from '../../../lib/caseFinanceService';
import { type ReportType, type ReportStatus } from '../../../lib/reportTypes';

export function useCaseQueries(
  id: string | undefined,
  filters: {
    reportTypeFilter: ReportType | 'all';
    reportStatusFilter: ReportStatus | 'all';
    showLatestOnly: boolean;
  }
) {
  const { data: caseData, isLoading, error: caseError } = useQuery({
    queryKey: ['case', id],
    queryFn: async () => {
      const { data: caseRecord, error } = await supabase
        .from('cases')
        .select(`
          id,
          case_no,
          title,
          priority,
          status,
          client_reference,
          created_at,
          updated_at,
          due_date,
          summary,
          important_data,
          accessories,
          customer_id,
          contact_id,
          service_type_id,
          created_by,
          checkout_date,
          checkout_collector_name,
          recovery_outcome,
          assigned_engineer_id,
          company_id
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching case:', error);
        throw error;
      }

      const [customerData, contactData, serviceTypeData, createdByData, assignedEngineerData, companyData] = await Promise.all([
        caseRecord.customer_id
          ? supabase
              .from('customers_enhanced')
              .select('id, customer_number, customer_name, email, mobile_number, phone_number, city, country, address_line1, address_line2, postal_code')
              .eq('id', caseRecord.customer_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        caseRecord.contact_id
          ? supabase
              .from('customers_enhanced')
              .select('id, customer_name, email, mobile_number, phone_number')
              .eq('id', caseRecord.contact_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        caseRecord.service_type_id
          ? supabase
              .from('service_types')
              .select('id, name')
              .eq('id', caseRecord.service_type_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        caseRecord.created_by
          ? supabase
              .from('profiles')
              .select('id, full_name')
              .eq('id', caseRecord.created_by)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        caseRecord.assigned_engineer_id
          ? supabase
              .from('profiles')
              .select('id, full_name')
              .eq('id', caseRecord.assigned_engineer_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        (async () => {
          if (caseRecord.company_id) {
            return supabase
              .from('companies')
              .select('id, company_number, company_name, email, phone_number, city, country, vat_number')
              .eq('id', caseRecord.company_id)
              .maybeSingle();
          } else if (caseRecord.customer_id) {
            const { data: relationship, error: relError } = await supabase
              .from('customer_company_relationships')
              .select(`
                company_id,
                companies (
                  id, company_number, company_name, email, phone_number, city, country, vat_number
                )
              `)
              .eq('customer_id', caseRecord.customer_id)
              .order('is_primary_contact', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (relError) {
              return { data: null, error: relError };
            }
            return { data: relationship?.companies || null, error: null };
          }
          return Promise.resolve({ data: null });
        })(),
      ]);

      const result = {
        ...caseRecord,
        case_number: caseRecord.case_no,
        customer: customerData.data,
        contact: contactData.data,
        service_type: serviceTypeData.data,
        created_by_profile: createdByData.data,
        assigned_engineer: assignedEngineerData.data,
        company: companyData.data,
      };

      return result;
    },
    enabled: !!id,
  });

  const { data: caseStatuses = [] } = useQuery({
    queryKey: ['case_statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_statuses')
        .select('id, name, type, color, is_active')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    },
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['case_devices', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_devices')
        .select(`
          id,
          model,
          serial_no,
          device_problem,
          recovery_requirements,
          device_password,
          device_type_id,
          capacity_id,
          accessories,
          device_role_id,
          is_primary,
          parent_device_id,
          role_notes,
          created_at,
          created_by,
          device_type:device_types(id, name),
          brand:brands(name),
          capacity:capacities(id, name),
          condition:device_conditions(name),
          encryption_type:device_encryption(name),
          device_role:device_roles(id, name),
          created_by_profile:profiles!created_by(full_name)
        `)
        .eq('case_id', id)
        .order('is_primary', { ascending: false })
        .order('created_at');

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: cloneDrives = [] } = useQuery({
    queryKey: ['clone_drives', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clone_drives')
        .select(`
          id,
          case_id,
          patient_device_id,
          resource_clone_drive_id,
          physical_drive_serial,
          physical_drive_brand,
          physical_drive_model,
          physical_drive_capacity,
          storage_path,
          storage_server,
          storage_type,
          physical_location_id,
          image_format,
          image_size_gb,
          clone_date,
          cloned_by,
          status,
          extracted_date,
          extracted_by,
          backup_device_id,
          extraction_notes,
          retention_days,
          notes,
          physical_location:inventory_locations(name),
          cloned_by_user:profiles!clone_drives_cloned_by_fkey(full_name),
          resource_clone_drive:resource_clone_drives(
            clone_id,
            physical_drive_brand,
            physical_drive_model,
            physical_drive_capacity_gb,
            physical_drive_serial,
            storage_type
          )
        `)
        .eq('case_id', id)
        .order('clone_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['case_attachments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_attachments')
        .select(`
          id,
          file_name,
          file_path,
          file_size,
          mime_type,
          category,
          description,
          created_at,
          uploaded_by:profiles(full_name)
        `)
        .eq('case_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes', 'case', id],
    queryFn: async () => {
      if (!id) return [];
      return await quotesService.getQuotesByCaseId(id);
    },
    enabled: !!id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', 'case', id],
    queryFn: async () => {
      if (!id) return [];
      return await invoiceService.getInvoicesByCaseId(id);
    },
    enabled: !!id,
  });

  const { data: caseFinancialSummary } = useQuery({
    queryKey: ['case_financial_summary', id],
    queryFn: async () => {
      if (!id) return null;
      return await getCaseFinancialSummary(id);
    },
    enabled: !!id,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['case_reports', id, filters.reportTypeFilter, filters.reportStatusFilter, filters.showLatestOnly],
    queryFn: async () => {
      let query = supabase
        .from('case_reports')
        .select(`
          id,
          report_number,
          report_type,
          title,
          status,
          visible_to_customer,
          version_number,
          is_latest_version,
          created_at,
          approved_at,
          sent_to_customer_at,
          created_by_profile:profiles!created_by(full_name)
        `)
        .eq('case_id', id);

      if (filters.reportTypeFilter !== 'all') {
        query = query.eq('report_type', filters.reportTypeFilter);
      }

      if (filters.reportStatusFilter !== 'all') {
        query = query.eq('status', filters.reportStatusFilter);
      }

      if (filters.showLatestOnly) {
        query = query.eq('is_latest_version', true);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: caseEngineers = [] } = useQuery({
    queryKey: ['case_engineers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_engineers')
        .select(`
          id,
          role_text,
          created_at,
          engineer:profiles(id, full_name, role)
        `)
        .eq('case_id', id)
        .order('created_at');

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: portalSettings } = useQuery({
    queryKey: ['case_portal_visibility', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_portal_visibility')
        .select('*')
        .eq('case_id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['case_notes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_internal_notes')
        .select(`
          id,
          note_text,
          private,
          created_at,
          author:profiles(full_name)
        `)
        .eq('case_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['case_history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_job_history')
        .select(`
          id,
          action,
          details_json,
          created_at,
          actor:profiles(full_name)
        `)
        .eq('case_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  return {
    caseData,
    isLoading,
    caseError,
    caseStatuses,
    devices,
    cloneDrives,
    attachments,
    quotes,
    invoices,
    caseFinancialSummary,
    reports,
    caseEngineers,
    portalSettings,
    notes,
    history,
  };
}
