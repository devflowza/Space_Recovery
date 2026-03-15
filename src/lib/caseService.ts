import { supabase } from './supabaseClient';
import { checkRateLimit, RATE_LIMITS } from './rateLimiter';

interface DeleteCaseResult {
  success: boolean;
  case_number: string;
  case_title: string;
  log_id: string;
  deleted_counts: {
    devices: number;
    attachments: number;
    communications: number;
    quotes: number;
    reports: number;
    notes: number;
    clones: number;
    inventory_assignments: number;
    portal_visibility: number;
  };
  total_records_deleted: number;
}

export async function deleteCaseService(caseId: string): Promise<DeleteCaseResult> {
  const rl = checkRateLimit(RATE_LIMITS.CASE_DELETION);
  if (!rl.allowed) {
    throw new Error(rl.message);
  }

  try {
    const { data, error } = await supabase.rpc('delete_case_permanently', {
      p_case_id: caseId,
    });

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from deletion');
    }

    return data as DeleteCaseResult;
  } catch (error: any) {
    console.error('Error deleting case:', error);
    throw new Error(error.message || 'Failed to delete case');
  }
}
