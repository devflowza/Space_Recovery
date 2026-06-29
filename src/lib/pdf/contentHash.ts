/**
 * contentHash — dependency-free provability helpers for the Document Studio.
 *
 * Kept free of the Supabase client (and any DB import) so the forensic-critical
 * hashing/path logic is unit-testable in isolation. See
 * docs/superpowers/specs/2026-06-27-document-studio-design.md (provability).
 */

import type { Database } from '../../types/database.types';

export type DocumentInstanceType = Database['public']['Enums']['document_instance_type'];

/** Lowercase hex SHA-256 of a blob's bytes (browser/Node WebCrypto, no deps). */
export async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Deterministic storage path for a delivered document artifact. Hash-in-path =
 * content-addressed: identical bytes resolve to the same path (idempotent
 * re-render / dedupe), and a changed document produces a new path — a
 * tamper-evident record of what was actually delivered.
 */
export function buildDocumentPdfPath(
  tenantId: string,
  docType: DocumentInstanceType,
  instanceId: string,
  sha256: string,
): string {
  return `${tenantId}/${docType}/${instanceId}/${sha256}.pdf`;
}
