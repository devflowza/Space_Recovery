import { supabase } from './supabaseClient';

export const logAuditTrail = async (actionType: string, tableName: string, recordId: string, oldValues: object, newValues: object) => {
  try {
    await supabase.rpc('log_audit_trail', {
      p_action_type: actionType,
      p_table_name: tableName,
      p_record_id: recordId,
      p_old_values: oldValues,
      p_new_values: newValues,
    });
  } catch (e) {
    console.error('Audit trail logging failed:', e);
    throw new Error(`Audit trail logging failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
};
