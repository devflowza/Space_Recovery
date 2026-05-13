import { supabase } from './supabaseClient';
import type { Report, ReportType, ReportStatus, ReportTemplate, ReportSectionData } from './reportTypes';
import { isValidUuid } from './postgrestSanitizer';
import { logger } from './logger';

export const reportsService = {
  /**
   * Get all report templates, optionally filtered by report type
   */
  async getReportTemplates(reportType?: ReportType): Promise<ReportTemplate[]> {
    let query = supabase
      .from('master_case_report_templates')
      .select('*')
      .eq('is_active', true)
      .order('report_type')
      .order('template_name');

    if (reportType) {
      query = query.eq('report_type', reportType);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching report templates:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get the default template for a specific report type
   */
  async getDefaultTemplate(reportType: ReportType): Promise<ReportTemplate | null> {
    const { data, error } = await supabase
      .from('master_case_report_templates')
      .select('*')
      .eq('report_type', reportType)
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching default template:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get all templates for a specific report type
   */
  async getTemplatesForReportType(reportType: ReportType): Promise<ReportTemplate[]> {
    const { data, error } = await supabase
      .from('master_case_report_templates')
      .select('*')
      .eq('report_type', reportType)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('template_name');

    if (error) {
      logger.error('Error fetching templates:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Generate next report number based on report type
   */
  async generateReportNumber(reportType: ReportType): Promise<string> {
    const sequenceScope = `report_${reportType}`;

    const { data, error } = await supabase.rpc('get_next_number', {
      p_scope: sequenceScope
    });

    if (error) {
      logger.error('Error generating report number:', error);
      throw error;
    }

    return data;
  },

  /**
   * Create a new report
   */
  async createReport(
    caseId: string,
    reportType: ReportType,
    title: string,
    templateId: string,
    sections: Array<{ key: string; title: string; content: string; order: number; required: boolean }>,
    forensicChainOfCustodyId?: string
  ): Promise<Report> {
    // Generate report number
    const reportNumber = await this.generateReportNumber(reportType);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create the report
    const { data: report, error: reportError } = await supabase
      .from('case_reports')
      .insert({
        case_id: caseId,
        report_number: reportNumber,
        report_type: reportType,
        title: title,
        status: 'draft',
        version_number: 1,
        is_latest_version: true,
        report_template_id: templateId,
        chain_of_custody_id: forensicChainOfCustodyId || null,
        visible_to_customer: false,
        created_by: user.id,
      })
      .select()
      .maybeSingle();

    if (reportError) {
      logger.error('Error creating report:', reportError);
      throw reportError;
    }

    // Create report sections
    if (sections && sections.length > 0) {
      const sectionsData = sections.map(section => ({
        report_id: report.id,
        section_key: section.key,
        section_title: section.title,
        section_content: section.content || '',
        section_order: section.order,
        is_required: section.required,
      }));

      const { error: sectionsError } = await supabase
        .from('case_report_sections')
        .insert(sectionsData);

      if (sectionsError) {
        logger.error('Error creating report sections:', sectionsError);
        throw sectionsError;
      }
    }

    return report;
  },

  /**
   * Create a new version of an existing report
   */
  async createReportVersion(
    originalReportId: string,
    versionNotes: string,
    updatedSections: Array<{ key: string; title: string; content: string; order: number; required: boolean }>
  ): Promise<Report> {
    // Get the original report
    const originalReport = await this.getReportById(originalReportId);
    if (!originalReport) {
      throw new Error('Original report not found');
    }

    // Determine version number
    const parentReportId = originalReport.parent_report_id || originalReport.id;
    const newVersionNumber = originalReport.version_number + 1;

    // Generate version report number (e.g., REP-0001-v2)
    const baseNumber = originalReport.report_number.split('-v')[0];
    const versionedReportNumber = `${baseNumber}-v${newVersionNumber}`;

    // Set previous version to not latest
    const { error: updateError } = await supabase
      .from('case_reports')
      .update({ is_latest_version: false })
      .eq('id', originalReportId);

    if (updateError) {
      logger.error('Error updating previous version:', updateError);
      throw updateError;
    }

    // Create new version
    const { data: newReport, error: createError } = await supabase
      .from('case_reports')
      .insert({
        case_id: originalReport.case_id,
        report_number: versionedReportNumber,
        report_type: originalReport.report_type,
        title: originalReport.title,
        status: 'draft',
        version_number: newVersionNumber,
        parent_report_id: parentReportId,
        is_latest_version: true,
        version_notes: versionNotes,
        report_template_id: originalReport.report_template_id,
        forensic_chain_of_custody_id: originalReport.forensic_chain_of_custody_id,
        visible_to_customer: false,
      })
      .select()
      .maybeSingle();

    if (createError) {
      logger.error('Error creating report version:', createError);
      throw createError;
    }

    // Create sections for new version
    if (updatedSections && updatedSections.length > 0) {
      const sectionsData = updatedSections.map(section => ({
        report_id: newReport.id,
        section_key: section.key,
        section_title: section.title,
        section_content: section.content || '',
        section_order: section.order,
        is_required: section.required,
      }));

      const { error: sectionsError } = await supabase
        .from('case_report_sections')
        .insert(sectionsData);

      if (sectionsError) {
        logger.error('Error creating version sections:', sectionsError);
        throw sectionsError;
      }
    }

    return newReport;
  },

  /**
   * Get a report by ID with all sections
   */
  async getReportById(reportId: string): Promise<Report | null> {
    const { data, error } = await supabase
      .from('case_reports')
      .select(`
        *,
        created_by_profile:profiles!created_by(full_name),
        reviewed_by_profile:profiles!reviewed_by(full_name),
        approved_by_profile:profiles!approved_by(full_name)
      `)
      .eq('id', reportId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching report:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get report sections
   */
  async getReportSections(reportId: string): Promise<ReportSectionData[]> {
    const { data, error } = await supabase
      .from('case_report_sections')
      .select('*')
      .eq('report_id', reportId)
      .order('section_order');

    if (error) {
      logger.error('Error fetching report sections:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get all reports for a case
   */
  async getReportsByCaseId(caseId: string, filters?: {
    reportType?: ReportType;
    status?: ReportStatus;
    latestOnly?: boolean;
  }): Promise<Report[]> {
    let query = supabase
      .from('case_reports')
      .select(`
        *,
        created_by_profile:profiles!created_by(full_name)
      `)
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (filters?.reportType) {
      query = query.eq('report_type', filters.reportType);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.latestOnly) {
      query = query.eq('is_latest_version', true);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching reports:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get version history for a report
   */
  async getReportVersionHistory(reportId: string): Promise<Report[]> {
    // Get the report to find the parent
    const report = await this.getReportById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const parentId = report.parent_report_id || report.id;

    // Get all versions
    const { data, error } = await supabase
      .from('case_reports')
      .select(`
        *,
        created_by_profile:profiles!created_by(full_name)
      `)
      .or(isValidUuid(parentId) ? `id.eq.${parentId},parent_report_id.eq.${parentId}` : 'id.eq.00000000-0000-0000-0000-000000000000')
      .order('version_number', { ascending: false });

    if (error) {
      logger.error('Error fetching version history:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Update report sections
   */
  async updateReportSections(
    reportId: string,
    sections: Array<{ id?: string; key: string; title: string; content: string; order: number; required: boolean }>
  ): Promise<void> {
    // Delete existing sections
    const { error: deleteError } = await supabase
      .from('case_report_sections')
      .update({ deleted_at: new Date().toISOString() })
      .eq('report_id', reportId);

    if (deleteError) {
      logger.error('Error deleting old sections:', deleteError);
      throw deleteError;
    }

    // Insert updated sections
    const sectionsData = sections.map(section => ({
      report_id: reportId,
      section_key: section.key,
      section_title: section.title,
      section_content: section.content || '',
      section_order: section.order,
      is_required: section.required,
    }));

    const { error: insertError } = await supabase
      .from('case_report_sections')
      .insert(sectionsData);

    if (insertError) {
      logger.error('Error updating sections:', insertError);
      throw insertError;
    }
  },

  /**
   * Update report metadata
   */
  async updateReport(
    reportId: string,
    updates: {
      title?: string;
      status?: ReportStatus;
      visible_to_customer?: boolean;
      findings?: string;
      recommendations?: string;
    }
  ): Promise<Report> {
    const { data, error } = await supabase
      .from('case_reports')
      .update(updates)
      .eq('id', reportId)
      .select()
      .maybeSingle();

    if (error) {
      logger.error('Error updating report:', error);
      throw error;
    }

    return data;
  },

  /**
   * Approve a report
   */
  async approveReport(reportId: string, approverId: string): Promise<Report> {
    const { data, error } = await supabase
      .from('case_reports')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .maybeSingle();

    if (error) {
      logger.error('Error approving report:', error);
      throw error;
    }

    return data;
  },

  /**
   * Send report to customer
   */
  async sendReportToCustomer(reportId: string): Promise<Report> {
    const { data, error } = await supabase
      .from('case_reports')
      .update({
        status: 'sent',
        sent_to_customer_at: new Date().toISOString(),
        visible_to_customer: true,
      })
      .eq('id', reportId)
      .select()
      .maybeSingle();

    if (error) {
      logger.error('Error sending report to customer:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a report (only if no newer versions exist)
   */
  async deleteReport(reportId: string): Promise<void> {
    const { error } = await supabase
      .from('case_reports')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', reportId);

    if (error) {
      logger.error('Error deleting report:', error);
      throw error;
    }
  },

  /**
   * Get chain of custody events for forensic report
   */
  async getChainOfCustodyForReport(caseId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('chain_of_custody_events')
      .select(`
        *,
        actor:profiles!chain_of_custody_events_actor_id_fkey(full_name),
        location:inventory_locations(name)
      `)
      .eq('case_id', caseId)
      .order('event_timestamp', { ascending: true });

    if (error) {
      logger.error('Error fetching chain of custody:', error);
      throw error;
    }

    return data || [];
  },
};
