import { supabase } from './supabaseClient';
import { logger } from './logger';

export type ActionCategory =
  | 'creation'
  | 'modification'
  | 'access'
  | 'transfer'
  | 'verification'
  | 'communication'
  | 'evidence_handling'
  | 'financial'
  | 'critical_event';

export type TransferStatus = 'initiated' | 'pending_acceptance' | 'accepted' | 'rejected' | 'cancelled';

export type IntegrityCheckResult = 'passed' | 'failed' | 'warning' | 'not_applicable';

export interface ChainOfCustodyEntry {
  id: string;
  case_id: string;
  entry_number: number;
  action_category: ActionCategory;
  action_type: string;
  action_description: string;
  actor_id?: string;
  actor_name: string;
  actor_role?: string;
  actor_ip_address?: string;
  actor_user_agent?: string;
  device_id?: string;
  evidence_reference?: string;
  evidence_description?: string;
  location_facility?: string;
  location_details?: string;
  hash_algorithm?: string;
  hash_value?: string;
  previous_hash?: string;
  digital_signature?: string;
  before_values?: Record<string, any>;
  after_values?: Record<string, any>;
  metadata?: Record<string, any>;
  witness_id?: string;
  witness_name?: string;
  supervisor_id?: string;
  supervisor_approved_at?: string;
  occurred_at: string;
  created_at: string;
}

export interface CustodyTransfer {
  id: string;
  case_id: string;
  custody_entry_id?: string;
  transfer_reason: string;
  transfer_method?: string;
  transfer_location?: string;
  from_custodian_id?: string;
  from_custodian_name: string;
  to_custodian_id?: string;
  to_custodian_name: string;
  condition_before?: string;
  condition_after?: string;
  condition_verified: boolean;
  seal_number?: string;
  new_seal_number?: string;
  seal_intact?: boolean;
  transfer_status: TransferStatus;
  initiated_at: string;
  accepted_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  from_signature?: string;
  to_signature?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AccessLogEntry {
  id: string;
  case_id: string;
  custody_entry_id?: string;
  device_id?: string;
  access_type: string;
  access_purpose: string;
  access_method?: string;
  tools_used?: string[];
  accessor_id?: string;
  accessor_name: string;
  supervisor_id?: string;
  supervisor_approved: boolean;
  access_started_at: string;
  access_ended_at?: string;
  duration_minutes?: number;
  access_location?: string;
  notes?: string;
  findings?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface IntegrityCheck {
  id: string;
  case_id: string;
  device_id?: string;
  custody_entry_id?: string;
  check_type: string;
  check_reason?: string;
  scheduled_check: boolean;
  expected_hash?: string;
  actual_hash?: string;
  hash_algorithm?: string;
  hash_match?: boolean;
  physical_inspection_performed: boolean;
  physical_condition?: string;
  seal_number?: string;
  seal_intact?: boolean;
  overall_result: IntegrityCheckResult;
  findings?: string;
  anomalies?: string[];
  photo_urls?: string[];
  document_urls?: string[];
  inspector_id?: string;
  inspector_name: string;
  witness_id?: string;
  checked_at: string;
  next_check_due?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export async function getChainOfCustody(
  caseId: string,
  options?: {
    category?: ActionCategory;
    startDate?: Date;
    endDate?: Date;
    actorId?: string;
    limit?: number;
  }
): Promise<ChainOfCustodyEntry[]> {
  // chain_of_custody schema has no entry_number or occurred_at column.
  // Order by created_at instead; filter date ranges via created_at.
  let query = supabase
    .from('chain_of_custody')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (options?.category) {
    query = query.eq('action_category', options.category);
  }

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate.toISOString());
  }

  if (options?.endDate) {
    query = query.lte('created_at', options.endDate.toISOString());
  }

  if (options?.actorId) {
    query = query.eq('actor_id', options.actorId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching Chain of Custody:', error);
    throw error;
  }

  return data || [];
}

export async function logChainOfCustody(params: {
  caseId: string;
  actionCategory: ActionCategory;
  actionType: string;
  actionDescription: string;
  deviceId?: string;
  evidenceReference?: string;
  beforeValues?: Record<string, any>;
  afterValues?: Record<string, any>;
  metadata?: Record<string, any>;
}): Promise<string> {
  const { data, error } = await supabase.rpc('log_chain_of_custody', {
    p_case_id: params.caseId,
    p_action_category: params.actionCategory,
    p_action_type: params.actionType,
    p_action_description: params.actionDescription,
    p_device_id: params.deviceId || null,
    p_evidence_reference: params.evidenceReference || null,
    p_before_values: params.beforeValues || {},
    p_after_values: params.afterValues || {},
    p_metadata: params.metadata || {},
  });

  if (error) {
    logger.error('Error logging Chain of Custody:', error);
    throw error;
  }

  return data as string;
}

export async function initiateCustodyTransfer(params: {
  caseId: string;
  transferReason: string;
  fromCustodianName: string;
  toCustodianId: string;
  toCustodianName: string;
  transferMethod?: string;
  transferLocation?: string;
  conditionBefore?: string;
  sealNumber?: string;
  metadata?: Record<string, any>;
}): Promise<CustodyTransfer> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  const { data, error } = await supabase
    .from('chain_of_custody_transfers')
    .insert({
      case_id: params.caseId,
      transfer_reason: params.transferReason,
      transfer_method: params.transferMethod,
      transfer_location: params.transferLocation,
      from_custodian_id: userId,
      from_custodian_name: params.fromCustodianName,
      to_custodian_id: params.toCustodianId,
      to_custodian_name: params.toCustodianName,
      condition_before: params.conditionBefore,
      seal_number: params.sealNumber,
      transfer_status: 'pending_acceptance',
      metadata: params.metadata,
    })
    .select()
    .maybeSingle();

  if (error) {
    logger.error('Error initiating custody transfer:', error);
    throw error;
  }

  await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'transfer',
    actionType: 'CUSTODY_TRANSFER_INITIATED',
    actionDescription: `Custody transfer initiated to ${params.toCustodianName}`,
    metadata: {
      transfer_id: data.id,
      reason: params.transferReason,
    },
  });

  return data;
}

export async function acceptCustodyTransfer(params: {
  transferId: string;
  conditionAfter?: string;
  sealIntact?: boolean;
  newSealNumber?: string;
  signature?: string;
}): Promise<CustodyTransfer> {
  const { data, error } = await supabase
    .from('chain_of_custody_transfers')
    .update({
      transfer_status: 'accepted',
      accepted_at: new Date().toISOString(),
      condition_after: params.conditionAfter,
      seal_intact: params.sealIntact,
      new_seal_number: params.newSealNumber,
      to_signature: params.signature,
      condition_verified: true,
    })
    .eq('id', params.transferId)
    .select()
    .maybeSingle();

  if (error) {
    logger.error('Error accepting custody transfer:', error);
    throw error;
  }

  await logChainOfCustody({
    caseId: data.case_id,
    actionCategory: 'transfer',
    actionType: 'CUSTODY_TRANSFER_ACCEPTED',
    actionDescription: `Custody transfer accepted by ${data.to_custodian_name}`,
    metadata: {
      transfer_id: data.id,
      seal_intact: params.sealIntact,
    },
  });

  return data;
}

export async function rejectCustodyTransfer(params: {
  transferId: string;
  rejectionReason: string;
}): Promise<CustodyTransfer> {
  const { data, error } = await supabase
    .from('chain_of_custody_transfers')
    .update({
      transfer_status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: params.rejectionReason,
    })
    .eq('id', params.transferId)
    .select()
    .maybeSingle();

  if (error) {
    logger.error('Error rejecting custody transfer:', error);
    throw error;
  }

  await logChainOfCustody({
    caseId: data.case_id,
    actionCategory: 'transfer',
    actionType: 'CUSTODY_TRANSFER_REJECTED',
    actionDescription: `Custody transfer rejected: ${params.rejectionReason}`,
    metadata: {
      transfer_id: data.id,
      reason: params.rejectionReason,
    },
  });

  return data;
}

export async function getCustodyTransfers(caseId: string): Promise<CustodyTransfer[]> {
  const { data, error } = await supabase
    .from('chain_of_custody_transfers')
    .select('*')
    .eq('case_id', caseId)
    .order('initiated_at', { ascending: false });

  if (error) {
    logger.error('Error fetching custody transfers:', error);
    throw error;
  }

  return data || [];
}

export async function logAccess(params: {
  caseId: string;
  deviceId?: string;
  accessType: string;
  accessPurpose: string;
  accessMethod?: string;
  toolsUsed?: string[];
  accessorName: string;
  accessLocation?: string;
  notes?: string;
  metadata?: Record<string, any>;
}): Promise<AccessLogEntry> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  const { data, error } = await supabase
    .from('chain_of_custody_access_log')
    .insert({
      case_id: params.caseId,
      device_id: params.deviceId,
      access_type: params.accessType,
      access_purpose: params.accessPurpose,
      access_method: params.accessMethod,
      tools_used: params.toolsUsed,
      accessor_id: userId,
      accessor_name: params.accessorName,
      access_location: params.accessLocation,
      notes: params.notes,
      metadata: params.metadata,
    })
    .select()
    .maybeSingle();

  if (error) {
    logger.error('Error logging access:', error);
    throw error;
  }

  await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'access',
    actionType: 'EVIDENCE_ACCESS',
    actionDescription: `Evidence accessed: ${params.accessPurpose}`,
    deviceId: params.deviceId,
    metadata: {
      access_log_id: data.id,
      access_type: params.accessType,
    },
  });

  return data;
}

export async function endAccess(params: {
  accessLogId: string;
  findings?: string;
}): Promise<AccessLogEntry> {
  const { data, error } = await supabase
    .from('chain_of_custody_access_log')
    .update({
      access_ended_at: new Date().toISOString(),
      findings: params.findings,
    })
    .eq('id', params.accessLogId)
    .select()
    .maybeSingle();

  if (error) {
    logger.error('Error ending access:', error);
    throw error;
  }

  return data;
}

export async function performIntegrityCheck(params: {
  caseId: string;
  deviceId?: string;
  checkType: string;
  checkReason?: string;
  expectedHash?: string;
  actualHash?: string;
  hashAlgorithm?: string;
  physicalCondition?: string;
  sealNumber?: string;
  sealIntact?: boolean;
  overallResult: IntegrityCheckResult;
  findings?: string;
  anomalies?: string[];
  inspectorName: string;
  metadata?: Record<string, any>;
}): Promise<IntegrityCheck> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  const hashMatch = params.expectedHash && params.actualHash
    ? params.expectedHash === params.actualHash
    : undefined;

  const { data, error } = await supabase
    .from('chain_of_custody_integrity_checks')
    .insert({
      case_id: params.caseId,
      device_id: params.deviceId,
      check_type: params.checkType,
      check_reason: params.checkReason,
      expected_hash: params.expectedHash,
      actual_hash: params.actualHash,
      hash_algorithm: params.hashAlgorithm,
      hash_match: hashMatch,
      physical_inspection_performed: !!params.physicalCondition,
      physical_condition: params.physicalCondition,
      seal_number: params.sealNumber,
      seal_intact: params.sealIntact,
      overall_result: params.overallResult,
      findings: params.findings,
      anomalies: params.anomalies,
      inspector_id: userId,
      inspector_name: params.inspectorName,
      metadata: params.metadata,
    })
    .select()
    .maybeSingle();

  if (error) {
    logger.error('Error performing integrity check:', error);
    throw error;
  }

  await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'verification',
    actionType: 'INTEGRITY_CHECK',
    actionDescription: `Integrity check performed: ${params.overallResult}`,
    deviceId: params.deviceId,
    metadata: {
      integrity_check_id: data.id,
      result: params.overallResult,
      hash_match: hashMatch,
    },
  });

  return data;
}

export async function getIntegrityChecks(caseId: string): Promise<IntegrityCheck[]> {
  const { data, error } = await supabase
    .from('chain_of_custody_integrity_checks')
    .select('*')
    .eq('case_id', caseId)
    .order('checked_at', { ascending: false });

  if (error) {
    logger.error('Error fetching integrity checks:', error);
    throw error;
  }

  return data || [];
}

export async function searchChainOfCustody(params: {
  caseId: string;
  searchTerm?: string;
  categories?: ActionCategory[];
  startDate?: Date;
  endDate?: Date;
  actorId?: string;
}): Promise<ChainOfCustodyEntry[]> {
  let query = supabase
    .from('chain_of_custody')
    .select('*')
    .eq('case_id', params.caseId);

  if (params.categories && params.categories.length > 0) {
    query = query.in('action_category', params.categories);
  }

  if (params.startDate) {
    query = query.gte('created_at', params.startDate.toISOString());
  }

  if (params.endDate) {
    query = query.lte('created_at', params.endDate.toISOString());
  }

  if (params.actorId) {
    query = query.eq('actor_id', params.actorId);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    logger.error('Error searching Chain of Custody:', error);
    throw error;
  }

  let results = data || [];

  if (params.searchTerm) {
    const term = params.searchTerm.toLowerCase();
    results = results.filter(entry =>
      entry.action_description.toLowerCase().includes(term) ||
      entry.action_type.toLowerCase().includes(term) ||
      entry.actor_name.toLowerCase().includes(term) ||
      (entry.evidence_reference && entry.evidence_reference.toLowerCase().includes(term))
    );
  }

  return results;
}

export function generateHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

export function getCategoryColor(category: ActionCategory): string {
  const colors: Record<ActionCategory, string> = {
    creation: 'bg-success-muted text-success border-success/30',
    modification: 'bg-info-muted text-info border-info/30',
    access: 'bg-accent text-accent-foreground border-accent-foreground/20',
    transfer: 'bg-orange-100 text-orange-800 border-orange-300',
    verification: 'bg-teal-100 text-teal-800 border-teal-300',
    communication: 'bg-secondary text-secondary-foreground border-secondary/40',
    evidence_handling: 'bg-primary/10 text-primary border-primary/30',
    financial: 'bg-success-muted text-success border-success/30',
    critical_event: 'bg-danger-muted text-danger border-danger/30',
  };
  return colors[category] || 'bg-slate-100 text-slate-800 border-slate-300';
}

export function getCategoryIcon(category: ActionCategory): string {
  const icons: Record<ActionCategory, string> = {
    creation: 'Plus',
    modification: 'Edit',
    access: 'Eye',
    transfer: 'ArrowRightLeft',
    verification: 'CheckCircle2',
    communication: 'MessageCircle',
    evidence_handling: 'Package',
    financial: 'DollarSign',
    critical_event: 'AlertTriangle',
  };
  return icons[category] || 'Activity';
}

export function formatActionType(actionType: string): string {
  return actionType
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export async function logQuoteCreated(params: {
  caseId: string;
  quoteNo: string;
  total: number;
  subtotal: number;
  discount?: number;
  tax?: number;
}): Promise<string> {
  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'financial',
    actionType: 'QUOTE_CREATED',
    actionDescription: `Quote ${params.quoteNo} created with total amount ${params.total}`,
    metadata: {
      quote_no: params.quoteNo,
      subtotal: params.subtotal,
      discount: params.discount,
      tax: params.tax,
      total: params.total,
    },
  });
}

export async function logQuoteModified(params: {
  caseId: string;
  quoteNo: string;
  beforeValues: Record<string, any>;
  afterValues: Record<string, any>;
}): Promise<string> {
  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'financial',
    actionType: 'QUOTE_MODIFIED',
    actionDescription: `Quote ${params.quoteNo} modified`,
    beforeValues: params.beforeValues,
    afterValues: params.afterValues,
    metadata: { quote_no: params.quoteNo },
  });
}

export async function logQuoteStatusChanged(params: {
  caseId: string;
  quoteNo: string;
  oldStatus: string;
  newStatus: string;
}): Promise<string> {
  const actionType =
    params.newStatus === 'approved' ? 'QUOTE_APPROVED' :
    params.newStatus === 'rejected' ? 'QUOTE_REJECTED' :
    params.newStatus === 'converted' ? 'QUOTE_CONVERTED' :
    'QUOTE_STATUS_CHANGED';

  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'financial',
    actionType,
    actionDescription: `Quote ${params.quoteNo} status changed from ${params.oldStatus} to ${params.newStatus}`,
    beforeValues: { status: params.oldStatus },
    afterValues: { status: params.newStatus },
    metadata: { quote_no: params.quoteNo },
  });
}

export async function logInvoiceCreated(params: {
  caseId: string;
  invoiceNo: string;
  total: number;
  subtotal: number;
  discount?: number;
  tax?: number;
  dueDate?: string;
}): Promise<string> {
  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'financial',
    actionType: 'INVOICE_CREATED',
    actionDescription: `Invoice ${params.invoiceNo} created with total amount ${params.total}`,
    metadata: {
      invoice_no: params.invoiceNo,
      subtotal: params.subtotal,
      discount: params.discount,
      tax: params.tax,
      total: params.total,
      due_date: params.dueDate,
    },
  });
}

export async function logInvoiceModified(params: {
  caseId: string;
  invoiceNo: string;
  beforeValues: Record<string, any>;
  afterValues: Record<string, any>;
}): Promise<string> {
  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'financial',
    actionType: 'INVOICE_MODIFIED',
    actionDescription: `Invoice ${params.invoiceNo} modified`,
    beforeValues: params.beforeValues,
    afterValues: params.afterValues,
    metadata: { invoice_no: params.invoiceNo },
  });
}

export async function logInvoiceStatusChanged(params: {
  caseId: string;
  invoiceNo: string;
  oldStatus: string;
  newStatus: string;
}): Promise<string> {
  const actionType =
    params.newStatus === 'sent' ? 'INVOICE_SENT' :
    params.newStatus === 'paid' ? 'INVOICE_PAID' :
    params.newStatus === 'partially_paid' ? 'INVOICE_PARTIAL_PAYMENT' :
    params.newStatus === 'voided' ? 'INVOICE_VOIDED' :
    params.newStatus === 'overdue' ? 'INVOICE_OVERDUE' :
    'INVOICE_STATUS_CHANGED';

  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'financial',
    actionType,
    actionDescription: `Invoice ${params.invoiceNo} status changed from ${params.oldStatus} to ${params.newStatus}`,
    beforeValues: { status: params.oldStatus },
    afterValues: { status: params.newStatus },
    metadata: { invoice_no: params.invoiceNo },
  });
}

export async function logInvoicePayment(params: {
  caseId: string;
  invoiceNo: string;
  paymentAmount: number;
  totalPaid: number;
  totalAmount: number;
  paymentMethod?: string;
}): Promise<string> {
  const isFull = params.totalPaid >= params.totalAmount;

  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'financial',
    actionType: isFull ? 'INVOICE_PAYMENT_RECEIVED' : 'INVOICE_PARTIAL_PAYMENT_RECEIVED',
    actionDescription: `Payment of ${params.paymentAmount} received for invoice ${params.invoiceNo}`,
    afterValues: {
      payment_amount: params.paymentAmount,
      total_paid: params.totalPaid,
      remaining_balance: params.totalAmount - params.totalPaid,
    },
    metadata: {
      invoice_no: params.invoiceNo,
      payment_method: params.paymentMethod,
      is_full_payment: isFull,
    },
  });
}

export async function logReportGenerated(params: {
  caseId: string;
  reportNumber: string;
  reportType: string;
  title: string;
}): Promise<string> {
  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'evidence_handling',
    actionType: 'REPORT_GENERATED',
    actionDescription: `Report ${params.reportNumber} generated: ${params.title}`,
    metadata: {
      report_number: params.reportNumber,
      report_type: params.reportType,
      title: params.title,
    },
  });
}

export async function logReportModified(params: {
  caseId: string;
  reportNumber: string;
  changes: string;
}): Promise<string> {
  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'modification',
    actionType: 'REPORT_MODIFIED',
    actionDescription: `Report ${params.reportNumber} content updated: ${params.changes}`,
    metadata: { report_number: params.reportNumber },
  });
}

export async function logReportStatusChanged(params: {
  caseId: string;
  reportNumber: string;
  oldStatus: string;
  newStatus: string;
}): Promise<string> {
  const actionType =
    params.newStatus === 'finalized' ? 'REPORT_FINALIZED' :
    params.newStatus === 'delivered' ? 'REPORT_DELIVERED' :
    'REPORT_STATUS_CHANGED';

  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'evidence_handling',
    actionType,
    actionDescription: `Report ${params.reportNumber} status changed from ${params.oldStatus} to ${params.newStatus}`,
    beforeValues: { status: params.oldStatus },
    afterValues: { status: params.newStatus },
    metadata: { report_number: params.reportNumber },
  });
}

export async function logFileDownloaded(params: {
  caseId: string;
  fileName: string;
  fileCategory: string;
  fileSize?: number;
}): Promise<string> {
  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'access',
    actionType: 'FILE_DOWNLOADED',
    actionDescription: `File downloaded: ${params.fileName}`,
    metadata: {
      file_name: params.fileName,
      category: params.fileCategory,
      file_size: params.fileSize,
    },
  });
}

export async function logFileViewed(params: {
  caseId: string;
  fileName: string;
  fileCategory: string;
}): Promise<string> {
  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'access',
    actionType: 'FILE_VIEWED',
    actionDescription: `File viewed: ${params.fileName}`,
    metadata: {
      file_name: params.fileName,
      category: params.fileCategory,
    },
  });
}

export async function logPortalLogin(params: {
  caseId: string;
  customerName: string;
  ipAddress?: string;
}): Promise<string> {
  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'access',
    actionType: 'PORTAL_LOGIN',
    actionDescription: `Customer ${params.customerName} accessed case portal`,
    metadata: {
      customer_name: params.customerName,
      ip_address: params.ipAddress,
      access_type: 'portal',
    },
  });
}

export async function logPortalFileAccess(params: {
  caseId: string;
  customerName: string;
  fileName: string;
  action: 'viewed' | 'downloaded';
}): Promise<string> {
  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'access',
    actionType: 'PORTAL_FILE_ACCESS',
    actionDescription: `Customer ${params.customerName} ${params.action} file: ${params.fileName} via portal`,
    metadata: {
      customer_name: params.customerName,
      file_name: params.fileName,
      action: params.action,
      access_type: 'portal',
    },
  });
}

export async function logPortalApproval(params: {
  caseId: string;
  customerName: string;
  documentType: 'quote' | 'report' | 'invoice';
  documentNumber: string;
}): Promise<string> {
  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'critical_event',
    actionType: 'PORTAL_APPROVAL',
    actionDescription: `Customer ${params.customerName} approved ${params.documentType} ${params.documentNumber} via portal`,
    metadata: {
      customer_name: params.customerName,
      document_type: params.documentType,
      document_number: params.documentNumber,
      access_type: 'portal',
    },
  });
}

export async function logDeviceCheckout(params: {
  caseId: string;
  deviceId?: string;
  collectorName: string;
  collectorMobile?: string;
  collectorId?: string;
  checkoutDate: string;
}): Promise<string> {
  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'transfer',
    actionType: 'DEVICE_CHECKED_OUT',
    actionDescription: `Device checked out to ${params.collectorName}`,
    deviceId: params.deviceId,
    afterValues: {
      checkout_date: params.checkoutDate,
      collector_name: params.collectorName,
      collector_mobile: params.collectorMobile,
      collector_id: params.collectorId,
    },
    metadata: {
      checkout_date: params.checkoutDate,
    },
  });
}

export async function logDeviceReturn(params: {
  caseId: string;
  deviceId?: string;
  returnedBy: string;
  returnDate: string;
  condition?: string;
  integrityVerified?: boolean;
}): Promise<string> {
  return await logChainOfCustody({
    caseId: params.caseId,
    actionCategory: 'transfer',
    actionType: 'DEVICE_RETURNED',
    actionDescription: `Device returned by ${params.returnedBy}`,
    deviceId: params.deviceId,
    afterValues: {
      return_date: params.returnDate,
      returned_by: params.returnedBy,
      condition: params.condition,
      integrity_verified: params.integrityVerified,
    },
    metadata: {
      return_date: params.returnDate,
    },
  });
}
