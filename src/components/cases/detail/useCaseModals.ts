import { useState } from 'react';
import { type ReportType, type ReportStatus } from '@/lib/reportTypes';
import type { DocumentType } from '@/lib/pdf/types';

export function useCaseModals() {
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
  const [showPassword, setShowPassword] = useState(false);
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

  return {
    showCheckoutModal, setShowCheckoutModal,
    showDuplicateModal, setShowDuplicateModal,
    showDeleteModal, setShowDeleteModal,
    showCloneDriveModal, setShowCloneDriveModal,
    viewCloneModal, setViewCloneModal,
    showDeviceModal, setShowDeviceModal,
    showMarkAsDeliveredModal, setShowMarkAsDeliveredModal,
    showPreserveLongTermModal, setShowPreserveLongTermModal,
    selectedClone, setSelectedClone,
    editingDevice, setEditingDevice,
    editingReport, setEditingReport,
    showReportTypeSelector, setShowReportTypeSelector,
    selectedReportType, setSelectedReportType,
    viewReportId, setViewReportId,
    reportVersioningId, setReportVersioningId,
    reportTypeFilter, setReportTypeFilter,
    reportStatusFilter, setReportStatusFilter,
    showLatestOnly, setShowLatestOnly,
    showPassword, setShowPassword,
    expandedDevices, setExpandedDevices,
    newNote, setNewNote,
    showQuoteModal, setShowQuoteModal,
    showInvoiceModal, setShowInvoiceModal,
    viewingQuote, setViewingQuote,
    viewingInvoice, setViewingInvoice,
    editingQuote, setEditingQuote,
    editingInvoice, setEditingInvoice,
    showRecordPaymentModal, setShowRecordPaymentModal,
    selectedInvoiceForPayment, setSelectedInvoiceForPayment,
    showConvertProformaModal, setShowConvertProformaModal,
    convertingInvoice, setConvertingInvoice,
    showPDFPreviewModal, setShowPDFPreviewModal,
    previewDocumentType, setPreviewDocumentType,
    showEmailModal, setShowEmailModal,
    emailPdfBlob, setEmailPdfBlob,
    emailPdfFilename, setEmailPdfFilename,
    toggleDeviceDetails,
  };
}
