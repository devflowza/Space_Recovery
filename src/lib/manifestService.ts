import { supabase } from './supabaseClient';
import { logger } from './logger';
import type { Database } from '../types/database.types';
import { parseManifest, type ManifestFormat, type ManifestItem } from './manifestIngest';

type ManifestRow = Database['public']['Tables']['recovery_manifests']['Row'];
type ManifestItemRow = Database['public']['Tables']['recovery_manifest_items']['Row'];
type ManifestItemInsert = Database['public']['Tables']['recovery_manifest_items']['Insert'];
type AcceptanceRow = Database['public']['Tables']['recovery_manifest_acceptances']['Row'];

export interface ImportManifestInput {
  title: string;
  toolName?: string | null;
  source?: 'tool_export' | 'manual' | 'scan';
  text: string;
  format?: ManifestFormat;
}

const ITEM_CHUNK = 500;

async function insertItems(
  manifestId: string,
  tenantId: string,
  items: ManifestItem[],
): Promise<void> {
  for (let i = 0; i < items.length; i += ITEM_CHUNK) {
    const rows: ManifestItemInsert[] = items.slice(i, i + ITEM_CHUNK).map((it) => ({
      tenant_id: tenantId,
      manifest_id: manifestId,
      path: it.path,
      name: it.name,
      item_type: it.item_type,
      size_bytes: it.size_bytes,
      modified_at: it.modified_at,
      checksum: it.checksum,
    }));
    const { error } = await supabase.from('recovery_manifest_items').insert(rows);
    if (error) {
      logger.error('Error inserting manifest items:', error);
      throw error;
    }
  }
}

export const manifestService = {
  /** Parse a tool export (CSV/JSON) and persist a manifest header + its items. */
  async importManifest(
    caseId: string,
    tenantId: string,
    userId: string | null,
    input: ImportManifestInput,
  ): Promise<ManifestRow> {
    const parsed = parseManifest(input.text, input.format ?? 'auto');

    const { data: manifest, error } = await supabase
      .from('recovery_manifests')
      .insert({
        tenant_id: tenantId,
        case_id: caseId,
        title: input.title,
        source: input.source ?? 'tool_export',
        tool_name: input.toolName ?? null,
        total_files: parsed.summary.total_files,
        total_folders: parsed.summary.total_folders,
        total_bytes: parsed.summary.total_bytes,
        created_by: userId,
      })
      .select()
      .maybeSingle();
    if (error) {
      logger.error('Error creating recovery manifest:', error);
      throw error;
    }
    if (!manifest) throw new Error('Failed to create recovery manifest');

    if (parsed.items.length > 0) {
      await insertItems(manifest.id, tenantId, parsed.items);
    }
    return manifest;
  },

  async listManifests(caseId: string): Promise<ManifestRow[]> {
    const { data, error } = await supabase
      .from('recovery_manifests')
      .select('*')
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) {
      logger.error('Error listing recovery manifests:', error);
      throw error;
    }
    return data ?? [];
  },

  async listItems(manifestId: string): Promise<ManifestItemRow[]> {
    const { data, error } = await supabase
      .from('recovery_manifest_items')
      .select('*')
      .eq('manifest_id', manifestId)
      .is('deleted_at', null)
      .order('path', { ascending: true });
    if (error) {
      logger.error('Error listing manifest items:', error);
      throw error;
    }
    return data ?? [];
  },

  async listAcceptances(manifestId: string): Promise<AcceptanceRow[]> {
    const { data, error } = await supabase
      .from('recovery_manifest_acceptances')
      .select('*')
      .eq('manifest_id', manifestId)
      .order('accepted_at', { ascending: false });
    if (error) {
      logger.error('Error listing manifest acceptances:', error);
      throw error;
    }
    return data ?? [];
  },

  /** Staff-attested acceptance (the interim until portal-customer acceptance lands). */
  async recordStaffAcceptance(
    manifestId: string,
    tenantId: string,
    userId: string | null,
    input: { acceptedByName: string; notes?: string | null },
  ): Promise<AcceptanceRow> {
    const { data, error } = await supabase
      .from('recovery_manifest_acceptances')
      .insert({
        tenant_id: tenantId,
        manifest_id: manifestId,
        accepted_by_type: 'staff',
        acceptance_method: 'staff_attested',
        accepted_by: userId,
        accepted_by_name: input.acceptedByName,
        notes: input.notes ?? null,
      })
      .select()
      .maybeSingle();
    if (error) {
      logger.error('Error recording manifest acceptance:', error);
      throw error;
    }
    if (!data) throw new Error('Failed to record manifest acceptance');

    const { error: finalizeError } = await supabase
      .from('recovery_manifests')
      .update({ status: 'finalized', finalized_at: new Date().toISOString() })
      .eq('id', manifestId);
    if (finalizeError) {
      logger.error('Error finalizing manifest after acceptance:', finalizeError);
      throw finalizeError;
    }
    return data;
  },
};
