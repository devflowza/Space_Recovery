import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Printer, FileText, Tag, CheckCircle2, Copy, User, HardDrive, FileStack, AlertCircle, Calendar, Package, Activity, Settings, History, Users, DollarSign, Trash2, Grid2x2 as Grid, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../lib/format';
import { quotesService } from '../../lib/quotesService';
import { invoiceService } from '../../lib/invoiceService';
import { useCurrency } from '../../hooks/useCurrency';
import { CaseBackupDevicesTab } from '../../components/cases/CaseBackupDevicesTab';
import { openWhatsAppChat, isValidWhatsAppNumber, logWhatsAppCommunication } from '../../lib/whatsappUtils';
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
import { PDFPreviewModal } from '../../components/cases/PDFPreviewModal';
import { EmailDocumentModal } from '../../components/cases/EmailDocumentModal';
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
import { useCaseModals } from '../../components/cases/detail/useCaseModals';
import { useCaseQueries } from '../../components/cases/detail/useCaseQueries';
import { useCaseMutations } from '../../components/cases/detail/useCaseMutations';

type TabType = 'overview' | 'client' | 'devices' | 'clones' | 'reports' | 'quotes' | 'files' | 'engineers' | 'notes' | 'portal' | 'history' | 'stock';

export const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const modals = useCaseModals();

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

  const {
    caseData, isLoading, caseError,
    caseStatuses, devices, cloneDrives, attachments,
    quotes, invoices, caseFinancialSummary, reports,
    caseEngineers, portalSettings, notes, history,
  } = useCaseQueries(id, {
    reportTypeFilter: modals.reportTypeFilter,
    reportStatusFilter: modals.reportStatusFilter,
    showLatestOnly: modals.showLatestOnly,
  });


  const {
    addNoteMutation, updateCaseStatusMutation, updateCasePriorityMutation,
    updateAssignedEngineerMutation, createPaymentMutation, updateCaseInfoMutation,
    updateDeviceInfoMutation, updateCustomerInfoMutation, markAsDeliveredMutation,
    preserveLongTermMutation, duplicateCaseMutation, deleteCaseMutation,
    queryClient, navigate, profile, toast,
  } = useCaseMutations({ id, caseData, devices, modals });

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
    modals.setPreviewDocumentType('office_receipt');
    modals.setShowPDFPreviewModal(true);
  };

  const handlePrintCustomerCopy = () => {
    modals.setPreviewDocumentType('customer_copy');
    modals.setShowPDFPreviewModal(true);
  };

  const handlePrintLabel = () => {
    modals.setPreviewDocumentType('case_label');
    modals.setShowPDFPreviewModal(true);
  };

  const handleSendEmailFromPreview = (blobUrl: string, blob: Blob, filename: string) => {
    modals.setEmailPdfBlob(blob);
    modals.setEmailPdfFilename(filename);
    modals.setShowEmailModal(true);
  };

  const handleOpenCheckoutPreview = () => {
    modals.setPreviewDocumentType('checkout_form');
    modals.setShowPDFPreviewModal(true);
  };

  const handleRecordPayment = async (invoice: { id: string; invoice_type?: string }) => {
    // Only allow payment recording for tax invoices, not proforma invoices
    if (invoice.invoice_type !== 'tax_invoice') {
      toast.error('Payments can only be recorded against Tax Invoices, not Proforma Invoices. Please convert this to a Tax Invoice first.');
      return;
    }
    const fullInvoice = await invoiceService.fetchInvoiceById(invoice.id);
    modals.setSelectedInvoiceForPayment(fullInvoice);
    modals.setShowRecordPaymentModal(true);
  };

  const handleConvertProforma = async () => {
    if (!modals.convertingInvoice) return;

    try {
      await invoiceService.convertProformaToTaxInvoice(modals.convertingInvoice.id);

      // Close modal
      modals.setShowConvertProformaModal(false);
      modals.setConvertingInvoice(null);

      // Refresh the invoices list to show the new tax invoice
      queryClient.invalidateQueries({ queryKey: ['invoices', 'case', id] });
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['case-financial-summary', id] });
      toast.success('Proforma invoice successfully converted to Tax Invoice');
    } catch (error: unknown) {
      console.error('Error converting invoice:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to convert invoice');
    }
  };

  const handleDuplicateCase = () => {
    modals.setShowDuplicateModal(true);
  };

  const handleConfirmDuplicate = () => {
    duplicateCaseMutation.mutate();
  };

  const handleDeleteCase = () => {
    modals.setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    deleteCaseMutation.mutate();
  };

  const handleAddNote = () => {
    if (modals.newNote.trim()) {
      addNoteMutation.mutate(modals.newNote);
    }
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
              onClick={() => modals.setShowCheckoutModal(true)}
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
              expandedDevices={modals.expandedDevices}
              showPassword={modals.showPassword}
              onToggleDeviceDetails={modals.toggleDeviceDetails}
              onSetShowDeviceModal={modals.setShowDeviceModal}
              onSetEditingDevice={modals.setEditingDevice}
              onSetShowPassword={modals.setShowPassword}
            />
          )}


          {/* Clone Drives Tab */}
          {activeTab === 'clones' && (
            <CaseCloneDrivesTab
              caseData={caseData}
              devices={devices || []}
              cloneDrives={cloneDrives || []}
              onSetShowCloneDriveModal={modals.setShowCloneDriveModal}
              onSetViewCloneModal={modals.setViewCloneModal}
              onSetSelectedClone={modals.setSelectedClone}
              onSetShowMarkAsDeliveredModal={modals.setShowMarkAsDeliveredModal}
              onSetShowPreserveLongTermModal={modals.setShowPreserveLongTermModal}
            />
          )}


          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <CaseReportsTab
              reports={reports || []}
              reportTypeFilter={modals.reportTypeFilter}
              reportStatusFilter={modals.reportStatusFilter}
              showLatestOnly={modals.showLatestOnly}
              onSetShowReportTypeSelector={modals.setShowReportTypeSelector}
              onSetReportTypeFilter={modals.setReportTypeFilter}
              onSetReportStatusFilter={modals.setReportStatusFilter}
              onSetShowLatestOnly={modals.setShowLatestOnly}
              onSetViewReportId={modals.setViewReportId}
              onSetEditingReport={modals.setEditingReport}
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
              onSetShowQuoteModal={modals.setShowQuoteModal}
              onSetShowInvoiceModal={modals.setShowInvoiceModal}
              onSetEditingQuote={modals.setEditingQuote}
              onSetEditingInvoice={modals.setEditingInvoice}
              onSetViewingQuote={modals.setViewingQuote}
              onSetViewingInvoice={modals.setViewingInvoice}
              onHandleRecordPayment={handleRecordPayment}
              onSetConvertingInvoice={modals.setConvertingInvoice}
              onSetShowConvertProformaModal={modals.setShowConvertProformaModal}
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
              newNote={modals.newNote}
              onNoteChange={modals.setNewNote}
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
      {modals.showCheckoutModal && (
        <DeviceCheckoutModal
          isOpen={modals.showCheckoutModal}
          onClose={() => modals.setShowCheckoutModal(false)}
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
      {modals.showCloneDriveModal && (
        <CloneDriveModal
          isOpen={modals.showCloneDriveModal}
          onClose={() => modals.setShowCloneDriveModal(false)}
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
            modals.setShowCloneDriveModal(false);
          }}
        />
      )}

      {/* Duplicate Case Confirmation Modal */}
      {modals.showDuplicateModal && (
        <DuplicateCaseConfirmationModal
          isOpen={modals.showDuplicateModal}
          onClose={() => modals.setShowDuplicateModal(false)}
          onConfirm={handleConfirmDuplicate}
          originalCaseNumber={caseData.case_no}
          customerName={caseData.customer?.customer_name || 'Unknown'}
          serviceName={caseData.service_type?.name || 'Unknown'}
          isLoading={duplicateCaseMutation.isPending}
        />
      )}

      {/* Delete Case Confirmation Modal */}
      {modals.showDeleteModal && (
        <DeleteCaseConfirmationModal
          isOpen={modals.showDeleteModal}
          onClose={() => modals.setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          caseNumber={caseData.case_no}
          caseTitle={caseData.title || 'Untitled Case'}
          isDeleting={deleteCaseMutation.isPending}
        />
      )}

      {/* Device Form Modal */}
      {modals.showDeviceModal && (
        <DeviceFormModal
          isOpen={modals.showDeviceModal}
          onClose={() => {
            modals.setShowDeviceModal(false);
            modals.setEditingDevice(null);
          }}
          caseId={id!}
          deviceData={modals.editingDevice}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['case_devices', id] });
            modals.setShowDeviceModal(false);
            modals.setEditingDevice(null);
          }}
        />
      )}

      {/* View Clone Drive Modal */}
      {modals.viewCloneModal && (
        <Modal
          isOpen={!!modals.viewCloneModal}
          onClose={() => modals.setViewCloneModal(null)}
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
                <p className="text-sm text-slate-900 capitalize">{modals.viewCloneModal.status}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Storage Path</label>
                <p className="text-sm text-slate-900 font-mono break-all">{modals.viewCloneModal.storage_path}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Storage Server</label>
                <p className="text-sm text-slate-900">{modals.viewCloneModal.storage_server || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Image Format</label>
                <p className="text-sm text-slate-900 uppercase">{modals.viewCloneModal.image_format || 'DD'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Image Size</label>
                <p className="text-sm text-slate-900">{modals.viewCloneModal.image_size_gb ? `${modals.viewCloneModal.image_size_gb} GB` : 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Clone Date</label>
                <p className="text-sm text-slate-900">{formatDate(modals.viewCloneModal.clone_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Cloned By</label>
                <p className="text-sm text-slate-900">{modals.viewCloneModal.cloned_by_name || 'Unknown'}</p>
              </div>
              {modals.viewCloneModal.extracted_date && (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Extracted Date</label>
                    <p className="text-sm text-slate-900">{formatDate(modals.viewCloneModal.extracted_date)}</p>
                  </div>
                </>
              )}
            </div>
            {modals.viewCloneModal.notes && (
              <div>
                <label className="text-sm font-medium text-slate-600">Notes</label>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded">{modals.viewCloneModal.notes}</p>
              </div>
            )}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => modals.setViewCloneModal(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Mark As Delivered Modal */}
      <MarkAsDeliveredModal
        isOpen={modals.showMarkAsDeliveredModal}
        onClose={() => {
          modals.setShowMarkAsDeliveredModal(false);
          modals.setSelectedClone(null);
        }}
        onConfirm={(updateCaseStatus, deliveryNotes, retentionDays) => {
          if (modals.selectedClone) {
            markAsDeliveredMutation.mutate({ cloneId: modals.selectedClone.id, updateCaseStatus, deliveryNotes, retentionDays });
          }
        }}
        clone={modals.selectedClone}
        caseNo={caseData?.case_no}
        caseStatus={caseData?.status}
        patientDeviceName={
          modals.selectedClone && devices.length > 0
            ? (() => {
                const patientDevice = devices.find(d => d.id === modals.selectedClone.patient_device_id);
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
        isOpen={modals.showPreserveLongTermModal}
        onClose={() => {
          modals.setShowPreserveLongTermModal(false);
          modals.setSelectedClone(null);
        }}
        onConfirm={(preserveReason) => {
          if (modals.selectedClone) {
            preserveLongTermMutation.mutate({ cloneId: modals.selectedClone.id, preserveReason });
          }
        }}
        clone={modals.selectedClone}
        caseNo={caseData?.case_no}
        patientDeviceName={
          modals.selectedClone && devices.length > 0
            ? (() => {
                const patientDevice = devices.find(d => d.id === modals.selectedClone.patient_device_id);
                return patientDevice
                  ? `${patientDevice.device_type?.name || 'Device'} ${patientDevice.serial_no ? `(${patientDevice.serial_no})` : ''}`
                  : 'Unknown Device';
              })()
            : undefined
        }
        isLoading={preserveLongTermMutation.isPending}
      />

      {/* Quote View Modal */}
      {modals.viewingQuote && (
        <PDFPreviewModal
          isOpen={!!modals.viewingQuote}
          onClose={() => modals.setViewingQuote(null)}
          documentType="quote"
          documentId={modals.viewingQuote.id}
          documentNumber={modals.viewingQuote.quote_number}
          customerEmail={modals.viewingQuote.customers?.email}
        />
      )}

      {/* Invoice View Modal */}
      {modals.viewingInvoice && (
        <PDFPreviewModal
          isOpen={!!modals.viewingInvoice}
          onClose={() => modals.setViewingInvoice(null)}
          documentType="invoice"
          documentId={modals.viewingInvoice.id}
          documentNumber={modals.viewingInvoice.invoice_number}
          customerEmail={modals.viewingInvoice.customers_enhanced?.email || modals.viewingInvoice.customers?.email}
        />
      )}

      {/* Report Type Selection Modal */}
      {caseData && (
        <ReportTypeSelectionModal
          isOpen={modals.showReportTypeSelector}
          onClose={() => modals.setShowReportTypeSelector(false)}
          onSelectType={(type) => {
            modals.setSelectedReportType(type);
            modals.setShowReportTypeSelector(false);
          }}
          caseNumber={caseData.case_no || caseData.case_number || ''}
          serviceType={caseData.service_type?.name || 'Data Recovery'}
        />
      )}

      {/* Streamlined Report Editor */}
      {caseData && (modals.selectedReportType || modals.editingReport || modals.reportVersioningId) && (
        <StreamlinedReportEditor
          isOpen={!!(modals.selectedReportType || modals.editingReport || modals.reportVersioningId)}
          onClose={() => {
            modals.setSelectedReportType(null);
            modals.setEditingReport(null);
            modals.setReportVersioningId(null);
          }}
          reportType={modals.editingReport?.report_type || modals.selectedReportType}
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
          reportId={modals.editingReport?.id}
          existingReport={modals.editingReport}
          versioningFromReportId={modals.reportVersioningId || undefined}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['case_reports', id] });
            modals.setSelectedReportType(null);
            modals.setEditingReport(null);
            modals.setReportVersioningId(null);
          }}
        />
      )}

      {/* Report View Modal */}
      <ReportViewModal
        isOpen={!!modals.viewReportId}
        onClose={() => modals.setViewReportId(null)}
        reportId={modals.viewReportId || ''}
        onNewVersion={() => {
          modals.setReportVersioningId(modals.viewReportId);
          modals.setViewReportId(null);
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
      {modals.showPDFPreviewModal && modals.previewDocumentType && caseData && (
        <PDFPreviewModal
          isOpen={modals.showPDFPreviewModal}
          onClose={() => {
            modals.setShowPDFPreviewModal(false);
            modals.setPreviewDocumentType(null);
          }}
          documentId={id!}
          documentNumber={caseData.case_no || caseData.case_number || ''}
          documentType={modals.previewDocumentType}
          customerEmail={caseData.customer?.email}
          onSendEmail={handleSendEmailFromPreview}
        />
      )}

      {/* Email Document Modal */}
      {modals.showEmailModal && modals.emailPdfBlob && modals.previewDocumentType && caseData && (
        <EmailDocumentModal
          isOpen={modals.showEmailModal}
          onClose={() => {
            modals.setShowEmailModal(false);
            modals.setEmailPdfBlob(null);
            modals.setEmailPdfFilename('');
          }}
          blob={modals.emailPdfBlob}
          filename={modals.emailPdfFilename}
          documentType={modals.previewDocumentType}
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
