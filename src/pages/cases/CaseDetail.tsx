import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle, Printer, FileText, Tag, CheckCircle2, Copy, User, HardDrive, FileStack, AlertCircle, Calendar, Package, Activity, Settings, History, Users, DollarSign, Trash2, Grid2x2 as Grid, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../lib/format';
import { quotesService } from '../../lib/quotesService';
import { invoiceService } from '../../lib/invoiceService';
import { createPayment } from '../../lib/paymentsService';
import { useCurrency } from '../../hooks/useCurrency';
import { getCaseFinancialSummary } from '../../lib/caseFinanceService';
import { CaseBackupDevicesTab } from '../../components/cases/CaseBackupDevicesTab';
import { openWhatsAppChat, isValidWhatsAppNumber, logWhatsAppCommunication } from '../../lib/whatsappUtils';
import { deleteCaseService } from '../../lib/caseService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { DeviceCheckoutModal } from '../../components/cases/DeviceCheckoutModal';
import { DuplicateCaseConfirmationModal } from '../../components/cases/DuplicateCaseConfirmationModal';
import { DeleteCaseConfirmationModal } from '../../components/cases/DeleteCaseConfirmationModal';
import { ClientTab } from '../../components/cases/ClientTab';
import { CloneDriveModal } from '../../components/cases/CloneDriveModal';
import { DeviceFormModal } from '../../components/cases/DeviceFormModal';
import { MarkAsDeliveredModal } from '../../components/cases/MarkAsDeliveredModal';
import { PreserveLongTermModal } from '../../components/cases/PreserveLongTermModal';
import { ChainOfCustodyTab } from '../../components/cases/ChainOfCustodyTab';
import { RecordPaymentModal } from '../../components/financial/RecordPaymentModal';
import { ReportTypeSelectionModal } from '../../components/cases/ReportTypeSelectionModal';
import { StreamlinedReportEditor } from '../../components/cases/StreamlinedReportEditor';
import ReportViewModal from '../../components/cases/ReportViewModal';
import { reportsService } from '../../lib/reportsService';
import { type ReportType, type ReportStatus } from '../../lib/reportTypes';
import { PDFPreviewModal } from '../../components/cases/PDFPreviewModal';
import { EmailDocumentModal } from '../../components/cases/EmailDocumentModal';
import type { DocumentType } from '../../lib/pdf/types';
import {
  CaseOverviewTab,
  CaseDevicesTab,
  CaseCloneDrivesTab,
  CaseReportsTab,
  CaseFinancesTab,
  CaseFilesTab,
  CaseEngineersTab,
  CaseNotesTab,
  CasePortalTab,
} from '../../components/cases/detail';

type TabType = 'overview' | 'client' | 'devices' | 'clones' | 'reports' | 'quotes' | 'files' | 'engineers' | 'notes' | 'portal' | 'history' | 'stock';

export const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showPassword, setShowPassword] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCloneDriveModal, setShowCloneDriveModal] = useState(false);
  const [viewCloneModal, setViewCloneModal] = useState<any>(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showMarkAsDeliveredModal, setShowMarkAsDeliveredModal] = useState(false);
  const [showPreserveLongTermModal, setShowPreserveLongTermModal] = useState(false);
  const [selectedClone, setSelectedClone] = useState<any>(null);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [showReportTypeSelector, setShowReportTypeSelector] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  const [viewReportId, setViewReportId] = useState<string | null>(null);
  const [reportVersioningId, setReportVersioningId] = useState<string | null>(null);
  const [reportTypeFilter, setReportTypeFilter] = useState<ReportType | 'all'>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [showLatestOnly, setShowLatestOnly] = useState(true);
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set());
  const [newNote, setNewNote] = useState('');
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<any>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  const [editingQuote, setEditingQuote] = useState<any>(null);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);
  const [showConvertProformaModal, setShowConvertProformaModal] = useState(false);
  const [convertingInvoice, setConvertingInvoice] = useState<any>(null);
  const [showPDFPreviewModal, setShowPDFPreviewModal] = useState(false);
  const [previewDocumentType, setPreviewDocumentType] = useState<DocumentType | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailPdfBlob, setEmailPdfBlob] = useState<Blob | null>(null);
  const [emailPdfFilename, setEmailPdfFilename] = useState<string>('');

  const { formatCurrency } = useCurrency();

  const formatCurrencyAmount = (
    amount: number,
    currencySymbol: string,
    currencyPosition: 'before' | 'after',
    decimalPlaces: number
  ) => {
    const formattedAmount = amount.toFixed(decimalPlaces);
    if (currencyPosition === 'before') {
      return `${currencySymbol} ${formattedAmount}`;
    } else {
      return `${formattedAmount} ${currencySymbol}`;
    }
  };

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
        // Two-tier company fallback
        // Tier 1: Use case-level company_id if set
        // Tier 2: Fallback to customer's company from customer_company_relationships
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
    queryKey: ['case_reports', id, reportTypeFilter, reportStatusFilter, showLatestOnly],
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

      if (reportTypeFilter !== 'all') {
        query = query.eq('report_type', reportTypeFilter);
      }

      if (reportStatusFilter !== 'all') {
        query = query.eq('status', reportStatusFilter);
      }

      if (showLatestOnly) {
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


  const addNoteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      const { error } = await supabase
        .from('case_internal_notes')
        .insert({
          case_id: id,
          author_id: profile?.id,
          note_text: noteText,
          private: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case_notes', id] });
      setNewNote('');
    },
  });

  const updateCaseStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      console.log('Updating case status to:', newStatus);
      const { data, error } = await supabase
        .from('cases')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating status:', error);
        throw error;
      }
      console.log('Status update result:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case_history', id] });
    },
    onError: (error) => {
      console.error('Status update failed:', error);
      toast.error('Failed to update status. Please try again.');
    },
  });

  const updateCasePriorityMutation = useMutation({
    mutationFn: async (newPriority: string) => {
      console.log('Updating case priority to:', newPriority);
      const { data, error } = await supabase
        .from('cases')
        .update({ priority: newPriority, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating priority:', error);
        throw error;
      }
      console.log('Priority update result:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case_history', id] });
    },
    onError: (error) => {
      console.error('Priority update failed:', error);
      toast.error('Failed to update priority. Please try again.');
    },
  });

  const updateAssignedEngineerMutation = useMutation({
    mutationFn: async (newEngineerId: string | null) => {
      console.log('Updating assigned engineer to:', newEngineerId);
      const { data, error } = await supabase
        .from('cases')
        .update({ assigned_engineer_id: newEngineerId, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating assigned engineer:', error);
        throw error;
      }
      console.log('Assigned engineer update result:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case_history', id] });
    },
    onError: (error) => {
      console.error('Assigned engineer update failed:', error);
      toast.error('Failed to update assigned engineer. Please try again.');
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async ({
      paymentData,
      allocations,
    }: {
      paymentData: any;
      allocations: Array<{ invoice_id: string; amount: number }>;
    }) => {
      return createPayment(paymentData, allocations);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'case', id] });
      queryClient.invalidateQueries({ queryKey: ['case_financial_summary', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setShowRecordPaymentModal(false);
      setSelectedInvoiceForPayment(null);
    },
  });

  const updateCaseInfoMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('cases')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  const updateDeviceInfoMutation = useMutation({
    mutationFn: async ({ deviceId, updates }: { deviceId: string; updates: any }) => {
      const { error } = await supabase
        .from('case_devices')
        .update(updates)
        .eq('id', deviceId);

      if (error) {
        console.error('Error updating device:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case_devices', id] });
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  const updateCustomerInfoMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('customers_enhanced')
        .update(updates)
        .eq('id', caseData?.customer_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
    },
  });

  const markAsDeliveredMutation = useMutation({
    mutationFn: async ({ cloneId, updateCaseStatus, deliveryNotes, retentionDays }: { cloneId: string; updateCaseStatus: boolean; deliveryNotes: string; retentionDays: number }) => {
      const deliveryDate = new Date();
      const retentionDeadline = new Date(deliveryDate.getTime() + retentionDays * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('clone_drives')
        .update({
          status: 'delivered',
          retention_days: retentionDays,
          delivered_date: deliveryDate.toISOString(),
          delivered_by: profile?.id,
          retention_deadline: retentionDeadline.toISOString(),
          notes: deliveryNotes || null,
        })
        .eq('id', cloneId);

      if (error) throw error;

      if (updateCaseStatus && id) {
        const { error: caseError } = await supabase
          .from('cases')
          .update({ status: 'Delivered' })
          .eq('id', id);

        if (caseError) throw caseError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['clone_drives', id] });
      queryClient.invalidateQueries({ queryKey: ['resource_clone_drives'] });
      setShowMarkAsDeliveredModal(false);
      setSelectedClone(null);
    },
  });

  const preserveLongTermMutation = useMutation({
    mutationFn: async ({ cloneId, preserveReason }: { cloneId: string; preserveReason: string }) => {
      const { error } = await supabase
        .from('clone_drives')
        .update({
          status: 'preserved',
          preserve_reason: preserveReason,
        })
        .eq('id', cloneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clone_drives', id] });
      queryClient.invalidateQueries({ queryKey: ['resource_clone_drives'] });
      setShowPreserveLongTermModal(false);
      setSelectedClone(null);
    },
  });

  const handleWhatsApp = async () => {
    if (!caseData) return;

    const phoneNumber = caseData.contact?.mobile_number || caseData.customer?.mobile_number;

    if (!phoneNumber || !isValidWhatsAppNumber(phoneNumber)) {
      toast.error('No valid WhatsApp number available for this customer');
      return;
    }

    try {
      openWhatsAppChat({
        phoneNumber,
        caseNumber: caseData.case_no,
        customerName: caseData.customer?.customer_name || 'Customer',
        status: caseData.status,
      });

      await logWhatsAppCommunication(supabase, id!, phoneNumber, `Case ${caseData.case_no} update`);
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      toast.error('Failed to open WhatsApp. Please check the phone number.');
    }
  };

  const handlePrintOfficeReceipt = () => {
    setPreviewDocumentType('office_receipt');
    setShowPDFPreviewModal(true);
  };

  const handlePrintCustomerCopy = () => {
    setPreviewDocumentType('customer_copy');
    setShowPDFPreviewModal(true);
  };

  const handlePrintLabel = () => {
    setPreviewDocumentType('case_label');
    setShowPDFPreviewModal(true);
  };

  const handleSendEmailFromPreview = (blobUrl: string, blob: Blob, filename: string) => {
    setEmailPdfBlob(blob);
    setEmailPdfFilename(filename);
    setShowEmailModal(true);
  };

  const handleOpenCheckoutPreview = () => {
    setPreviewDocumentType('checkout_form');
    setShowPDFPreviewModal(true);
  };

  const handleRecordPayment = async (invoice: any) => {
    // Only allow payment recording for tax invoices, not proforma invoices
    if (invoice.invoice_type !== 'tax_invoice') {
      toast.error('Payments can only be recorded against Tax Invoices, not Proforma Invoices. Please convert this to a Tax Invoice first.');
      return;
    }
    const fullInvoice = await invoiceService.fetchInvoiceById(invoice.id);
    setSelectedInvoiceForPayment(fullInvoice);
    setShowRecordPaymentModal(true);
  };

  const handleConvertProforma = async () => {
    if (!convertingInvoice) return;

    try {
      await invoiceService.convertProformaToTaxInvoice(convertingInvoice.id);

      // Close modal
      setShowConvertProformaModal(false);
      setConvertingInvoice(null);

      // Refresh the invoices list to show the new tax invoice
      queryClient.invalidateQueries({ queryKey: ['invoices', 'case', id] });
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['case-financial-summary', id] });
      toast.success('Proforma invoice successfully converted to Tax Invoice');
    } catch (error: any) {
      console.error('Error converting invoice:', error);
      toast.error(error.message || 'Failed to convert invoice');
    }
  };

  const duplicateCaseMutation = useMutation({
    mutationFn: async () => {
      const { data: nextCaseNumber, error: numberError } = await supabase
        .rpc('get_next_case_number');

      if (numberError) {
        console.error('Error getting next case number:', numberError);
        throw new Error('Failed to get next case number');
      }

      const newCaseData: any = {
        case_no: nextCaseNumber,
        customer_id: caseData!.customer_id,
        service_type_id: caseData!.service_type_id,
        priority: caseData!.priority,
        status: 'Received',
        client_reference: caseData!.case_no,
        title: caseData!.title,
        summary: caseData!.summary,
        important_data: caseData!.important_data,
        accessories: caseData!.accessories,
        created_by: profile?.id,
      };

      if (caseData!.contact_id) {
        newCaseData.contact_id = caseData!.contact_id;
      }
      if (caseData!.assigned_engineer_id) {
        newCaseData.assigned_engineer_id = caseData!.assigned_engineer_id;
      }
      if (caseData!.company_id) {
        newCaseData.company_id = caseData!.company_id;
      }

      const { data: newCase, error: caseError } = await supabase
        .from('cases')
        .insert(newCaseData)
        .select()
        .single();

      if (caseError) {
        console.error('Error creating duplicate case:', caseError);
        throw new Error(`Failed to duplicate case: ${caseError.message}`);
      }

      if (devices && devices.length > 0) {
        // First insert devices without parent_device_id to get new IDs
        const devicesToInsert = devices.map(device => ({
          case_id: newCase.id,
          device_type_id: device.device_type_id,
          brand_id: device.brand_id,
          model: device.model,
          serial_no: device.serial_no,
          capacity_id: device.capacity_id,
          condition_id: device.condition_id,
          accessories: device.accessories,
          device_problem: device.device_problem,
          recovery_requirements: device.recovery_requirements,
          device_password: device.device_password,
          encryption_type_id: device.encryption_type_id,
          device_role_id: device.device_role_id,
          is_primary: device.is_primary,
          role_notes: device.role_notes,
          created_by: profile?.id,
        }));

        const { data: newDevices, error: devicesError } = await supabase
          .from('case_devices')
          .insert(devicesToInsert)
          .select('id');

        if (devicesError) {
          console.error('Error duplicating devices:', devicesError);
          throw new Error(`Failed to duplicate devices: ${devicesError.message}`);
        }

        // Create mapping from old device IDs to new device IDs
        const deviceIdMapping: Record<string, string> = {};
        devices.forEach((oldDevice, index) => {
          if (newDevices && newDevices[index]) {
            deviceIdMapping[oldDevice.id] = newDevices[index].id;
          }
        });

        // Update parent_device_id references with new IDs
        const devicesWithParents = devices.filter(d => d.parent_device_id);
        if (devicesWithParents.length > 0 && newDevices) {
          for (let i = 0; i < devices.length; i++) {
            const oldDevice = devices[i];
            if (oldDevice.parent_device_id && deviceIdMapping[oldDevice.parent_device_id]) {
              const newDeviceId = newDevices[i]?.id;
              const newParentId = deviceIdMapping[oldDevice.parent_device_id];

              if (newDeviceId && newParentId) {
                const { error: updateError } = await supabase
                  .from('case_devices')
                  .update({ parent_device_id: newParentId })
                  .eq('id', newDeviceId);

                if (updateError) {
                  console.error('Error updating parent_device_id:', updateError);
                }
              }
            }
          }
        }
      }

      return newCase;
    },
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setShowDuplicateModal(false);
      navigate(`/cases/${newCase.id}`);
    },
    onError: (error) => {
      console.error('Case duplication error:', error);
      toast.error(`Failed to duplicate case: ${(error as Error).message}`);
    },
  });

  const handleDuplicateCase = () => {
    setShowDuplicateModal(true);
  };

  const handleConfirmDuplicate = () => {
    duplicateCaseMutation.mutate();
  };

  const deleteCaseMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('No case ID');
      return await deleteCaseService(id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success(`Case ${result.case_number} deleted successfully. ${result.total_records_deleted} total records removed.`);
      navigate('/cases');
    },
    onError: (error: any) => {
      console.error('Failed to delete case:', error);
      toast.error(`Failed to delete case: ${error.message}`);
    },
  });

  const handleDeleteCase = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    deleteCaseMutation.mutate();
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNoteMutation.mutate(newNote);
    }
  };

  const toggleDeviceDetails = (deviceId: string) => {
    setExpandedDevices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deviceId)) {
        newSet.delete(deviceId);
      } else {
        newSet.add(deviceId);
      }
      return newSet;
    });
  };

  const getStatusColor = (statusName: string) => {
    const status = caseStatuses.find(s => s.name === statusName);
    return status?.color || '#6b7280';
  };

  const getStatusDisplayName = (statusName: string) => {
    const status = caseStatuses.find(s => s.name === statusName);
    return status?.name || statusName;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Grid },
    { id: 'client', label: 'Client', icon: User },
    { id: 'devices', label: 'Devices', icon: HardDrive },
    { id: 'clones', label: 'Clone Drives', icon: Copy },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'quotes', label: 'Quotes/Invoices', icon: DollarSign },
    { id: 'stock', label: 'Backup Devices', icon: Package },
    { id: 'files', label: 'Files', icon: FileStack },
    { id: 'engineers', label: 'Engineers', icon: Users },
    { id: 'notes', label: 'Internal Notes', icon: FileText },
    { id: 'portal', label: 'Client Portal', icon: Eye },
    { id: 'history', label: 'History', icon: History },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-600 mt-4">Loading case details...</p>
        </div>
      </div>
    );
  }

  if (caseError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">Error loading case</p>
          <p className="text-slate-400 text-sm mt-2">{(caseError as Error).message}</p>
          <Button onClick={() => navigate('/cases')} className="mt-4">
            Back to Cases
          </Button>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">Case not found</p>
          <Button onClick={() => navigate('/cases')} className="mt-4">
            Back to Cases
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="p-4 md:p-8 max-w-[1800px] mx-auto">
      {/* Header - Unified White Container */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-slate-200">
        <button
          onClick={() => navigate('/cases')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Cases</span>
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-blue-600">Case #{caseData.case_no}</h1>
              <Badge variant="custom" color={getStatusColor(caseData.status)} size="lg">
                {getStatusDisplayName(caseData.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Created {formatDate(caseData.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                by {caseData.created_by_profile?.full_name || 'System'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleWhatsApp}
              style={{ backgroundColor: '#25D366' }}
              size="sm"
              title="Send WhatsApp Message"
            >
              <MessageCircle className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">WhatsApp</span>
            </Button>
            <Button
              onClick={handlePrintOfficeReceipt}
              style={{ backgroundColor: '#ea580c' }}
              size="sm"
              title="Print Office Receipt"
            >
              <Printer className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Office Receipt</span>
            </Button>
            <Button
              onClick={handlePrintCustomerCopy}
              style={{ backgroundColor: '#16a34a' }}
              size="sm"
              title="Print Customer Copy"
            >
              <FileText className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Customer Copy</span>
            </Button>
            <Button
              onClick={handlePrintLabel}
              style={{ backgroundColor: '#7c3aed' }}
              size="sm"
              title="Print Label"
            >
              <Tag className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Print Label</span>
            </Button>
            <Button
              onClick={() => setShowCheckoutModal(true)}
              style={{ backgroundColor: '#8b5cf6' }}
              size="sm"
              title="Device Checkout"
            >
              <CheckCircle2 className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Checkout</span>
            </Button>
            <Button
              onClick={handleDuplicateCase}
              variant="secondary"
              size="sm"
              title="Duplicate Case"
            >
              <Copy className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Duplicate</span>
            </Button>
            {profile?.role === 'admin' && (
              <Button
                onClick={handleDeleteCase}
                style={{ backgroundColor: '#dc2626' }}
                size="sm"
                title="Delete Case Permanently"
              >
                <Trash2 className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Delete</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50/30 border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 font-medium">Customer</div>
                <div className="text-sm font-bold text-slate-900 truncate">{caseData.customer?.customer_name || '-'}</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50/30 border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 font-medium">Service</div>
                <div className="text-sm font-bold text-slate-900 truncate">{caseData.service_type?.name || '-'}</div>
              </div>
            </div>
          </div>

          <div className="bg-violet-50/30 border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 font-medium">Devices</div>
                <div className="text-sm font-bold text-slate-900">{devices.length} item{devices.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50/30 border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 font-medium">Priority</div>
                <div className="text-sm font-bold text-slate-900 capitalize">{caseData.priority}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Navigation */}
      <div className="mb-6 border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <CaseOverviewTab
          caseData={caseData}
          devices={devices || []}
          isSavingCaseInfo={updateCaseInfoMutation.isPending}
          isSavingDeviceInfo={updateDeviceInfoMutation.isPending}
          isSavingClientInfo={updateCustomerInfoMutation.isPending}
          onSaveCaseInfo={(updates) => updateCaseInfoMutation.mutate(updates)}
          onSaveDeviceInfo={(deviceId, updates) => updateDeviceInfoMutation.mutate({ deviceId, updates })}
          onSaveClientInfo={(customerUpdates, deviceUpdates) => {
            if (Object.keys(customerUpdates).length > 0) {
              updateCustomerInfoMutation.mutate(customerUpdates);
            }
            if (deviceUpdates.device_password !== undefined && devices[0]) {
              updateDeviceInfoMutation.mutate({ deviceId: devices[0].id, updates: { device_password: deviceUpdates.device_password } });
            }
          }}
          onUpdateStatus={(newStatus) => updateCaseStatusMutation.mutate(newStatus)}
          onUpdatePriority={(newPriority) => updateCasePriorityMutation.mutate(newPriority)}
          onUpdateEngineer={(engineerId) => updateAssignedEngineerMutation.mutate(engineerId)}
          profile={profile}
        />
      )}

      {/* Other tabs content */}
      {activeTab !== 'overview' && (
        <>
          {/* Client Tab */}
          {activeTab === 'client' && (
            <ClientTab caseId={id!} caseData={caseData} />
          )}

          {/* Devices Tab */}
          {activeTab === 'devices' && (
            <CaseDevicesTab
              caseData={caseData}
              devices={devices || []}
              expandedDevices={expandedDevices}
              showPassword={showPassword}
              onToggleDeviceDetails={toggleDeviceDetails}
              onSetShowDeviceModal={setShowDeviceModal}
              onSetEditingDevice={setEditingDevice}
              onSetShowPassword={setShowPassword}
            />
          )}


          {/* Clone Drives Tab */}
          {activeTab === 'clones' && (
            <CaseCloneDrivesTab
              caseData={caseData}
              devices={devices || []}
              cloneDrives={cloneDrives || []}
              onSetShowCloneDriveModal={setShowCloneDriveModal}
              onSetViewCloneModal={setViewCloneModal}
              onSetSelectedClone={setSelectedClone}
              onSetShowMarkAsDeliveredModal={setShowMarkAsDeliveredModal}
              onSetShowPreserveLongTermModal={setShowPreserveLongTermModal}
            />
          )}


          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <CaseReportsTab
              reports={reports || []}
              reportTypeFilter={reportTypeFilter}
              reportStatusFilter={reportStatusFilter}
              showLatestOnly={showLatestOnly}
              onSetShowReportTypeSelector={setShowReportTypeSelector}
              onSetReportTypeFilter={setReportTypeFilter}
              onSetReportStatusFilter={setReportStatusFilter}
              onSetShowLatestOnly={setShowLatestOnly}
              onSetViewReportId={setViewReportId}
              onSetEditingReport={setEditingReport}
            />
          )}


          {/* Quotes Tab */}
          {activeTab === 'quotes' && (
            <CaseFinancesTab
              caseId={id!}
              caseData={caseData}
              quotes={quotes || []}
              invoices={invoices || []}
              caseFinancialSummary={caseFinancialSummary}
              formatCurrency={formatCurrency}
              formatCurrencyAmount={formatCurrencyAmount}
              onSetShowQuoteModal={setShowQuoteModal}
              onSetShowInvoiceModal={setShowInvoiceModal}
              onSetEditingQuote={setEditingQuote}
              onSetEditingInvoice={setEditingInvoice}
              onSetViewingQuote={setViewingQuote}
              onSetViewingInvoice={setViewingInvoice}
              onHandleRecordPayment={handleRecordPayment}
              onSetConvertingInvoice={setConvertingInvoice}
              onSetShowConvertProformaModal={setShowConvertProformaModal}
              quotesService={quotesService}
              invoiceService={invoiceService}
            />
          )}


          {/* Files Tab */}
          {activeTab === 'files' && (
            <CaseFilesTab
              caseId={id!}
              attachments={attachments}
              uploadedBy={profile?.id || ''}
            />
          )}

          {/* Engineers Tab */}
          {activeTab === 'engineers' && (
            <CaseEngineersTab
              caseId={id!}
              caseEngineers={caseEngineers}
            />
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <CaseNotesTab
              caseId={id!}
              notes={notes}
              newNote={newNote}
              onNoteChange={setNewNote}
              onAddNote={handleAddNote}
              isAdding={addNoteMutation.isPending}
            />
          )}

          {/* Client Portal Tab */}
          {activeTab === 'portal' && (
            <CasePortalTab
              caseId={id!}
              portalSettings={portalSettings}
            />
          )}

          {/* Stock Tab - Backup Devices & Stock Usage */}
          {activeTab === 'stock' && (
            <CaseBackupDevicesTab
              caseId={id!}
              customerId={caseData.customer_id}
              companyId={caseData.company_id}
            />
          )}

          {/* History Tab - Forensic Chain of Custody */}
          {activeTab === 'history' && (
            <ChainOfCustodyTab caseId={id!} caseNumber={caseData.case_no} />
          )}
        </>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <DeviceCheckoutModal
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          caseId={id!}
          caseNumber={caseData.case_no}
          devices={devices as any}
          customerName={caseData.customer?.customer_name || ''}
          customerMobileNumber={caseData.customer?.mobile_number || caseData.customer?.phone_number || ''}
          onCheckoutComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['case', id] });
            queryClient.invalidateQueries({ queryKey: ['case_history', id] });
          }}
          onShowCheckoutPreview={handleOpenCheckoutPreview}
        />
      )}

      {/* Clone Drive Modal */}
      {showCloneDriveModal && (
        <CloneDriveModal
          isOpen={showCloneDriveModal}
          onClose={() => setShowCloneDriveModal(false)}
          caseId={id!}
          caseNo={caseData.case_no}
          patientDevices={devices
            .filter(d => d.device_role?.name?.toLowerCase() === 'patient')
            .map(d => ({
              id: d.id,
              name: `${d.device_type?.name || 'Device'} - ${d.brand?.name || ''} ${d.model || ''}`.trim(),
              serial_no: d.serial_no,
            }))}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['clone_drives', id] });
            setShowCloneDriveModal(false);
          }}
        />
      )}

      {/* Duplicate Case Confirmation Modal */}
      {showDuplicateModal && (
        <DuplicateCaseConfirmationModal
          isOpen={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          onConfirm={handleConfirmDuplicate}
          originalCaseNumber={caseData.case_no}
          customerName={caseData.customer?.customer_name || 'Unknown'}
          serviceName={caseData.service_type?.name || 'Unknown'}
          isLoading={duplicateCaseMutation.isPending}
        />
      )}

      {/* Delete Case Confirmation Modal */}
      {showDeleteModal && (
        <DeleteCaseConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          caseNumber={caseData.case_no}
          caseTitle={caseData.title || 'Untitled Case'}
          isDeleting={deleteCaseMutation.isPending}
        />
      )}

      {/* Device Form Modal */}
      {showDeviceModal && (
        <DeviceFormModal
          isOpen={showDeviceModal}
          onClose={() => {
            setShowDeviceModal(false);
            setEditingDevice(null);
          }}
          caseId={id!}
          deviceData={editingDevice}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['case_devices', id] });
            setShowDeviceModal(false);
            setEditingDevice(null);
          }}
        />
      )}

      {/* View Clone Drive Modal */}
      {viewCloneModal && (
        <Modal
          isOpen={!!viewCloneModal}
          onClose={() => setViewCloneModal(null)}
          title={`Clone Drive Details - ${caseData.case_no}`}
          icon={Copy}
          maxWidth="3xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Clone ID</label>
                <p className="text-sm text-slate-900 font-semibold">Clone #{caseData.case_no}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Status</label>
                <p className="text-sm text-slate-900 capitalize">{viewCloneModal.status}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Storage Path</label>
                <p className="text-sm text-slate-900 font-mono break-all">{viewCloneModal.storage_path}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Storage Server</label>
                <p className="text-sm text-slate-900">{viewCloneModal.storage_server || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Image Format</label>
                <p className="text-sm text-slate-900 uppercase">{viewCloneModal.image_format || 'DD'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Image Size</label>
                <p className="text-sm text-slate-900">{viewCloneModal.image_size_gb ? `${viewCloneModal.image_size_gb} GB` : 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Clone Date</label>
                <p className="text-sm text-slate-900">{formatDate(viewCloneModal.clone_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Cloned By</label>
                <p className="text-sm text-slate-900">{viewCloneModal.cloned_by_name || 'Unknown'}</p>
              </div>
              {viewCloneModal.extracted_date && (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Extracted Date</label>
                    <p className="text-sm text-slate-900">{formatDate(viewCloneModal.extracted_date)}</p>
                  </div>
                </>
              )}
            </div>
            {viewCloneModal.notes && (
              <div>
                <label className="text-sm font-medium text-slate-600">Notes</label>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded">{viewCloneModal.notes}</p>
              </div>
            )}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setViewCloneModal(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Mark As Delivered Modal */}
      <MarkAsDeliveredModal
        isOpen={showMarkAsDeliveredModal}
        onClose={() => {
          setShowMarkAsDeliveredModal(false);
          setSelectedClone(null);
        }}
        onConfirm={(updateCaseStatus, deliveryNotes, retentionDays) => {
          if (selectedClone) {
            markAsDeliveredMutation.mutate({ cloneId: selectedClone.id, updateCaseStatus, deliveryNotes, retentionDays });
          }
        }}
        clone={selectedClone}
        caseNo={caseData?.case_no}
        caseStatus={caseData?.status}
        patientDeviceName={
          selectedClone && devices.length > 0
            ? (() => {
                const patientDevice = devices.find(d => d.id === selectedClone.patient_device_id);
                return patientDevice
                  ? `${patientDevice.device_type?.name || 'Device'} ${patientDevice.serial_no ? `(${patientDevice.serial_no})` : ''}`
                  : 'Unknown Device';
              })()
            : undefined
        }
        isLoading={markAsDeliveredMutation.isPending}
      />

      {/* Preserve Long-term Modal */}
      <PreserveLongTermModal
        isOpen={showPreserveLongTermModal}
        onClose={() => {
          setShowPreserveLongTermModal(false);
          setSelectedClone(null);
        }}
        onConfirm={(preserveReason) => {
          if (selectedClone) {
            preserveLongTermMutation.mutate({ cloneId: selectedClone.id, preserveReason });
          }
        }}
        clone={selectedClone}
        caseNo={caseData?.case_no}
        patientDeviceName={
          selectedClone && devices.length > 0
            ? (() => {
                const patientDevice = devices.find(d => d.id === selectedClone.patient_device_id);
                return patientDevice
                  ? `${patientDevice.device_type?.name || 'Device'} ${patientDevice.serial_no ? `(${patientDevice.serial_no})` : ''}`
                  : 'Unknown Device';
              })()
            : undefined
        }
        isLoading={preserveLongTermMutation.isPending}
      />

      {/* Quote View Modal */}
      {viewingQuote && (
        <PDFPreviewModal
          isOpen={!!viewingQuote}
          onClose={() => setViewingQuote(null)}
          documentType="quote"
          documentId={viewingQuote.id}
          documentNumber={viewingQuote.quote_number}
          customerEmail={viewingQuote.customers?.email}
        />
      )}

      {/* Invoice View Modal */}
      {viewingInvoice && (
        <PDFPreviewModal
          isOpen={!!viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          documentType="invoice"
          documentId={viewingInvoice.id}
          documentNumber={viewingInvoice.invoice_number}
          customerEmail={viewingInvoice.customers_enhanced?.email || viewingInvoice.customers?.email}
        />
      )}

      {/* Report Type Selection Modal */}
      {caseData && (
        <ReportTypeSelectionModal
          isOpen={showReportTypeSelector}
          onClose={() => setShowReportTypeSelector(false)}
          onSelectType={(type) => {
            setSelectedReportType(type);
            setShowReportTypeSelector(false);
          }}
          caseNumber={caseData.case_no || caseData.case_number || ''}
          serviceType={caseData.service_type?.name || 'Data Recovery'}
        />
      )}

      {/* Streamlined Report Editor */}
      {caseData && (selectedReportType || editingReport || reportVersioningId) && (
        <StreamlinedReportEditor
          isOpen={!!(selectedReportType || editingReport || reportVersioningId)}
          onClose={() => {
            setSelectedReportType(null);
            setEditingReport(null);
            setReportVersioningId(null);
          }}
          reportType={editingReport?.report_type || selectedReportType}
          caseId={id!}
          caseData={{
            case_no: caseData.case_no || caseData.case_number || '',
            title: caseData.title || '',
            summary: caseData.summary,
            important_data: caseData.important_data,
            service_type: caseData.service_type,
            customer: caseData.customer,
            assigned_engineer: caseData.assigned_engineer,
            created_at: caseData.created_at,
          }}
          deviceData={devices && devices.length > 0 ? {
            device_type: devices[0].device_type?.name || '',
            brand: devices[0].brand?.name || '',
            model: devices[0].model || '',
            capacity: devices[0].capacity?.name || '',
            serial_number: devices[0].serial_number || '',
            symptoms: devices[0].symptoms || '',
            diagnostic_notes: devices[0].diagnostic_notes || '',
          } : undefined}
          reportId={editingReport?.id}
          existingReport={editingReport}
          versioningFromReportId={reportVersioningId || undefined}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['case_reports', id] });
            setSelectedReportType(null);
            setEditingReport(null);
            setReportVersioningId(null);
          }}
        />
      )}

      {/* Report View Modal */}
      <ReportViewModal
        isOpen={!!viewReportId}
        onClose={() => setViewReportId(null)}
        reportId={viewReportId || ''}
        onNewVersion={() => {
          setReportVersioningId(viewReportId);
          setViewReportId(null);
        }}
        onApprove={async (reportId) => {
          await reportsService.approveReport(reportId, profile?.id || '');
          queryClient.invalidateQueries({ queryKey: ['case_reports', id] });
        }}
        onSend={async (reportId) => {
          await reportsService.sendReportToCustomer(reportId);
          queryClient.invalidateQueries({ queryKey: ['case_reports', id] });
        }}
      />

      {/* PDF Preview Modal */}
      {showPDFPreviewModal && previewDocumentType && caseData && (
        <PDFPreviewModal
          isOpen={showPDFPreviewModal}
          onClose={() => {
            setShowPDFPreviewModal(false);
            setPreviewDocumentType(null);
          }}
          documentId={id!}
          documentNumber={caseData.case_no || caseData.case_number || ''}
          documentType={previewDocumentType}
          customerEmail={caseData.customer?.email}
          onSendEmail={handleSendEmailFromPreview}
        />
      )}

      {/* Email Document Modal */}
      {showEmailModal && emailPdfBlob && previewDocumentType && caseData && (
        <EmailDocumentModal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            setEmailPdfBlob(null);
            setEmailPdfFilename('');
          }}
          blob={emailPdfBlob}
          filename={emailPdfFilename}
          documentType={previewDocumentType}
          caseId={id!}
          caseNumber={caseData.case_no || caseData.case_number || ''}
          customerName={caseData.customer?.customer_name || 'Customer'}
          customerEmail={caseData.customer?.email}
          companyName="Data Recovery"
        />
      )}
    </div>
    </>
  );
};

export default CaseDetail;
