import { supabase } from '../supabaseClient';
import type { DocumentType } from './types';
import type { LanguageCode } from '../documentTranslations';

export interface PDFGenerationLogData {
  caseId: string;
  documentType: DocumentType | 'quote' | 'invoice' | 'report';
  languageCode: LanguageCode | null;
  mode: 'english_only' | 'bilingual';
  success: boolean;
  durationMs: number;
  errorMessage?: string;
  errorCode?: string;
  fontSource?: 'local' | 'cdn' | 'fallback';
}

export async function logPDFGeneration(data: PDFGenerationLogData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('[PDF Logging] No authenticated user, skipping log');
      return;
    }

    // Best-effort logging. Schema: id, tenant_id, document_type, document_id,
    // file_name, file_url, file_size, generation_time_ms, status,
    // error_message, generated_by, created_at, deleted_at. No case_id or
    // metadata columns; we store caseId as document_id.
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.tenant_id) {
      return;
    }

    const { error } = await supabase
      .from('pdf_generation_logs')
      .insert({
        tenant_id: profile.tenant_id,
        generated_by: user.id,
        document_id: data.caseId,
        document_type: data.documentType,
        status: data.success ? 'completed' : 'failed',
        generation_time_ms: data.durationMs,
        error_message: data.errorMessage,
      });

    if (error) {
      console.error('[PDF Logging] Failed to log PDF generation:', error);
    }
  } catch (error) {
    console.error('[PDF Logging] Error logging PDF generation:', error);
  }
}

export interface PDFGenerationStats {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  avgDurationMs: number;
  successRatePercent: number;
}

export async function getPDFGenerationStats(
  documentType?: string,
  days: number = 30
): Promise<PDFGenerationStats> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabase
      .from('pdf_generation_logs')
      .select('status, generation_time_ms')
      .gte('created_at', startDate.toISOString());

    if (documentType) {
      query = query.eq('document_type', documentType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[PDF Logging] Failed to fetch stats:', error);
      return {
        totalGenerations: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        avgDurationMs: 0,
        successRatePercent: 0,
      };
    }

    const totalGenerations = data.length;
    const successfulGenerations = data.filter(log => log.status === 'completed').length;
    const failedGenerations = totalGenerations - successfulGenerations;
    const avgDurationMs = data.length > 0
      ? data.reduce((sum, log) => sum + (log.generation_time_ms || 0), 0) / data.length
      : 0;
    const successRatePercent = totalGenerations > 0
      ? (successfulGenerations / totalGenerations) * 100
      : 0;

    return {
      totalGenerations,
      successfulGenerations,
      failedGenerations,
      avgDurationMs: Math.round(avgDurationMs),
      successRatePercent: Math.round(successRatePercent * 100) / 100,
    };
  } catch (error) {
    console.error('[PDF Logging] Error fetching stats:', error);
    return {
      totalGenerations: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      avgDurationMs: 0,
      successRatePercent: 0,
    };
  }
}

export async function getRecentFailures(limit: number = 10): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('pdf_generation_logs')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[PDF Logging] Failed to fetch recent failures:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[PDF Logging] Error fetching recent failures:', error);
    return [];
  }
}
