import { supabase } from './supabaseClient';
import { initializePDFFonts, getFontFamily, createPdfWithFonts } from './pdf/fonts';
import { buildReportDocument, type ReportData } from './pdf/documents/ReportDocument';
import { loadImageAsBase64 } from './pdf/utils';
import { logPDFGeneration } from './pdf/loggingService';
import type { TranslationContext } from './pdf/types';
import { logger } from './logger';
import {
  getTranslation,
  isRTLLanguage,
  formatBilingualText,
  type LanguageCode,
  type TranslationKey,
} from './documentTranslations';

const PDF_GENERATION_TIMEOUT = 45000; // 45 seconds

export interface PDFGenerationResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

export interface PDFBlobResult {
  success: boolean;
  blobUrl?: string;
  blob?: Blob;
  filename?: string;
  error?: string;
  errorCode?: string;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${errorMessage} (timeout after ${timeoutMs}ms)`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

function createTranslationContext(
  mode: 'english_only' | 'bilingual',
  languageCode: LanguageCode | null
): TranslationContext {
  const isRTL = languageCode ? isRTLLanguage(languageCode) : false;
  const isBilingual = mode === 'bilingual' && languageCode !== null;
  const fontFamily = getFontFamily(languageCode);

  const t = (key: string, englishText: string): string => {
    if (!isBilingual || !languageCode) return englishText;
    const translated = getTranslation(key as TranslationKey, languageCode);
    return formatBilingualText(englishText, translated, isRTL);
  };

  return {
    t,
    isRTL,
    isBilingual,
    languageCode,
    fontFamily,
  };
}

class ReportPDFService {
  /**
   * Generate report PDF using pdfmake for consistent styling with receipts
   */
  async generateReportPDF(reportId: string, download: boolean = true): Promise<PDFGenerationResult> {
    const startTime = Date.now();
    let languageCode: LanguageCode | null = null;
    let mode: 'english_only' | 'bilingual' = 'english_only';
    let fontSource: 'local' | 'cdn' | 'fallback' = 'local';

    try {
      const data = await withTimeout(
        this.fetchReportData(reportId),
        10000,
        'Failed to fetch report data'
      );

      const languageSettings = data.companySettings.localization?.document_language_settings;
      languageCode = (languageSettings?.secondary_language as LanguageCode) || null;
      mode = languageSettings?.mode || 'english_only';

      const fontsLoaded = await withTimeout(
        initializePDFFonts(languageCode),
        15000,
        'Font initialization timeout'
      );

      if (!fontsLoaded && languageCode) {
        logger.error(`[Report PDF Service] ${languageCode} fonts unavailable, falling back to English-only mode`);
        languageCode = null;
        mode = 'english_only';
        fontSource = 'fallback';
      }

      const ctx = createTranslationContext(mode, languageCode);

      const [logoBase64, qrCodeBase64] = await Promise.all([
        data.companySettings.branding?.logo_url
          ? withTimeout(
              loadImageAsBase64(data.companySettings.branding.logo_url),
              5000,
              'Logo loading timeout'
            )
          : Promise.resolve(null),
        data.companySettings.branding?.qr_code_general_url
          ? withTimeout(
              loadImageAsBase64(data.companySettings.branding.qr_code_general_url),
              5000,
              'QR code loading timeout'
            )
          : Promise.resolve(null),
      ]);

      const qrCodeCaption = data.companySettings.branding?.qr_code_general_caption || 'Scan for more information';

      const docDefinition = buildReportDocument(data, ctx, logoBase64, qrCodeBase64, qrCodeCaption);

      const filename = `Report_${data.report.report_number || 'Draft'}_${new Date().toISOString().split('T')[0]}.pdf`;

      if (download) {
        createPdfWithFonts(docDefinition).download(filename);
      } else {
        createPdfWithFonts(docDefinition).open();
      }

      const duration = Date.now() - startTime;

      await logPDFGeneration({
        caseId: data.report.case_id,
        documentType: 'report',
        languageCode,
        mode,
        success: true,
        durationMs: duration,
        fontSource,
      });

      return { success: true };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
      const errorCode = error instanceof Error && error.message.includes('timeout') ? 'TIMEOUT' : 'GENERATION_FAILED';

      logger.error('[Report PDF Service] Error generating report:', error);

      await logPDFGeneration({
        caseId: reportId,
        documentType: 'report',
        languageCode,
        mode,
        success: false,
        durationMs: duration,
        errorMessage,
        errorCode,
        fontSource,
      });

      return {
        success: false,
        error: errorMessage,
        errorCode,
      };
    }
  }

  async generateReportAsBlob(reportId: string): Promise<PDFBlobResult> {
    const startTime = Date.now();
    let languageCode: LanguageCode | null = null;
    let mode: 'english_only' | 'bilingual' = 'english_only';
    let fontSource: 'local' | 'cdn' | 'fallback' = 'local';

    try {

      const data = await withTimeout(
        this.fetchReportData(reportId),
        10000,
        'Failed to fetch report data'
      );

      const languageSettings = data.companySettings.localization?.document_language_settings;
      languageCode = (languageSettings?.secondary_language as LanguageCode) || null;
      mode = languageSettings?.mode || 'english_only';

      const fontsLoaded = await withTimeout(
        initializePDFFonts(languageCode),
        15000,
        'Font initialization timeout'
      );

      if (!fontsLoaded && languageCode) {
        logger.error(`[Report PDF Service] ${languageCode} fonts unavailable, falling back to English-only mode`);
        languageCode = null;
        mode = 'english_only';
        fontSource = 'fallback';
      }

      const ctx = createTranslationContext(mode, languageCode);

      const [logoBase64, qrCodeBase64] = await Promise.all([
        data.companySettings.branding?.logo_url
          ? withTimeout(
              loadImageAsBase64(data.companySettings.branding.logo_url),
              5000,
              'Logo loading timeout'
            )
          : Promise.resolve(null),
        data.companySettings.branding?.qr_code_general_url
          ? withTimeout(
              loadImageAsBase64(data.companySettings.branding.qr_code_general_url),
              5000,
              'QR code loading timeout'
            )
          : Promise.resolve(null),
      ]);

      const qrCodeCaption = data.companySettings.branding?.qr_code_general_caption || 'Scan for more information';

      const docDefinition = buildReportDocument(data, ctx, logoBase64, qrCodeBase64, qrCodeCaption);
      const filename = `Report_${data.report.report_number || 'Draft'}_${new Date().toISOString().split('T')[0]}.pdf`;

      const blobPromise = new Promise<{ blobUrl: string; blob: Blob }>((resolve, reject) => {
        try {
          const pdf = createPdfWithFonts(docDefinition);

          pdf.getBlob((blob: Blob) => {
            const blobUrl = URL.createObjectURL(blob);
            resolve({ blobUrl, blob });
          }, undefined, (err: any) => {
            logger.error('[Report PDF Service] Error in getBlob callback:', err);
            reject(err);
          });
        } catch (error) {
          logger.error('[Report PDF Service] Error creating PDF:', error);
          reject(error);
        }
      });

      const { blobUrl, blob } = await withTimeout(
        blobPromise,
        PDF_GENERATION_TIMEOUT,
        'PDF blob generation timeout'
      );

      const duration = Date.now() - startTime;

      await logPDFGeneration({
        caseId: data.report.case_id,
        documentType: 'report',
        languageCode,
        mode,
        success: true,
        durationMs: duration,
        fontSource,
      });

      return { success: true, blobUrl, blob, filename };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
      const errorCode = error instanceof Error && error.message.includes('timeout') ? 'TIMEOUT' : 'GENERATION_FAILED';

      logger.error('[Report PDF Service] Error generating report blob:', error);

      await logPDFGeneration({
        caseId: reportId,
        documentType: 'report',
        languageCode,
        mode,
        success: false,
        durationMs: duration,
        errorMessage,
        errorCode,
        fontSource,
      });

      return {
        success: false,
        error: errorMessage,
        errorCode,
      };
    }
  }

  private async fetchReportData(reportId: string): Promise<ReportData> {
    const { data: report, error: reportError } = await supabase
      .from('case_reports')
      .select(`
        *,
        created_by_profile:profiles!case_reports_created_by_fkey(full_name, email)
      `)
      .eq('id', reportId)
      .maybeSingle();

    if (reportError || !report) {
      throw new Error('Failed to fetch report');
    }

    const { data: sections } = await supabase
      .from('case_report_sections')
      .select('*')
      .eq('report_id', reportId)
      .order('section_order');

    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select(`
        case_no,
        title,
        service_types!service_type_id(name),
        priority,
        status,
        created_at,
        client_reference,
        customers_enhanced!customer_id(customer_name, email, mobile_number),
        companies!company_id(company_name),
        profiles!assigned_engineer_id(full_name)
      `)
      .eq('id', report.case_id)
      .maybeSingle();

    if (caseError) {
      logger.error('[Report PDF Service] Error fetching case data:', caseError);
    }

    // Get Patient device role ID
    const { data: patientRole } = await supabase
      .from('catalog_device_roles')
      .select('id')
      .eq('name', 'Patient')
      .maybeSingle();

    // Get device data - filter by Patient role
    const deviceQuery = supabase
      .from('case_devices')
      .select(`
        id,
        device_types!device_type_id(name),
        brands!brand_id(name),
        model,
        capacities!capacity_id(name),
        serial_no,
        device_conditions!condition_id(name),
        device_role_id,
        is_primary
      `)
      .eq('case_id', report.case_id);

    if (patientRole?.id) {
      deviceQuery.eq('device_role_id', patientRole.id);
    }

    const { data: devices, error: deviceError } = await deviceQuery
      .order('is_primary', { ascending: false })
      .limit(1);

    if (deviceError) {
      logger.error('[Report PDF Service] Error fetching device data:', deviceError);
    }

    let deviceData = null;
    let diagnosticsData = null;

    if (devices && devices.length > 0) {
      const device = devices[0];
      deviceData = {
        device_type: (device.device_types as any)?.name,
        brand: (device.brands as any)?.name,
        model: device.model,
        capacity: (device.capacities as any)?.name,
        serial_number: device.serial_no,
        condition: (device.device_conditions as any)?.name,
      };

      // Load diagnostics
      const { data: diagnostics } = await supabase
        .from('device_diagnostics')
        .select('*')
        .eq('case_device_id', device.id)
        .maybeSingle();

      if (diagnostics) {
        diagnosticsData = diagnostics;
      }
    }

    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('*')
      .maybeSingle();

    let chainOfCustodyEvents: any[] = [];
    if (report.report_type === 'forensic' && report.forensic_chain_of_custody_id) {
      const { data: cocEvents } = await supabase
        .from('forensic_chain_of_custody_events')
        .select(`
          *,
          actor:profiles!forensic_chain_of_custody_events_actor_id_fkey(full_name)
        `)
        .eq('chain_of_custody_id', report.forensic_chain_of_custody_id)
        .order('event_date', { ascending: true });

      chainOfCustodyEvents = cocEvents || [];
    }

    const customer = caseData?.customers_enhanced as any;
    const company = caseData?.companies as any;
    const preparedByName = (report.created_by_profile as any)?.full_name || (report.created_by_profile as any)?.email || 'N/A';

    return {
      report,
      sections: sections || [],
      caseData: caseData ? {
        case_number: caseData.case_no,
        case_no: caseData.case_no,
        customer_name: customer ? customer.customer_name : 'Unknown',
        customer_email: customer?.email,
        customer_phone: customer?.mobile_number,
        customer_company: company?.company_name,
        company_name: company?.company_name,
        client_reference: caseData.client_reference,
        service_type: (caseData.service_types as any)?.name,
        assigned_engineer: (caseData.profiles as any)?.full_name,
        created_at: caseData.created_at
      } : undefined,
      customerData: customer ? {
        customer_name: customer.customer_name,
        email: customer.email,
        mobile_number: customer.mobile_number,
        company_name: company?.company_name,
      } : undefined,
      deviceData,
      diagnosticsData,
      chainOfCustodyEvents,
      companySettings: companySettings || {
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
      },
      preparedByName,
    };
  }

  async downloadReportPDF(reportId: string) {
    try {
      await this.generateReportPDF(reportId, true);
    } catch (error) {
      logger.error('Error downloading report PDF:', error);
      throw error;
    }
  }
}

export const reportPDFService = new ReportPDFService();
