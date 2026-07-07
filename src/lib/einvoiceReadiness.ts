// IRN-READINESS ONLY (Phase 4 D3): xSuite does not generate IRNs. This flag
// records that GST e-invoicing legally applies to the tenant (aggregate
// turnover above the notified threshold) so invoice surfaces warn loudly and
// the printed invoice reserves the IRN QR slot. Pure module — no I/O — so the
// pdfmake adapter can import it without dragging in supabaseClient.

export interface EInvoiceReadiness {
  applicable: boolean;
  marked_at: string | null;
}

export const EINVOICE_READINESS_METADATA_KEY = 'einvoice_readiness';

export const DEFAULT_EINVOICE_READINESS: EInvoiceReadiness = { applicable: false, marked_at: null };

/** Guard against corrupt metadata / JSON string round-trips: only boolean true passes. */
export function normalizeEInvoiceReadiness(value: unknown): EInvoiceReadiness {
  if (!value || typeof value !== 'object') return DEFAULT_EINVOICE_READINESS;
  const bag = value as Record<string, unknown>;
  return {
    applicable: bag.applicable === true,
    marked_at: typeof bag.marked_at === 'string' ? bag.marked_at : null,
  };
}

/** Reads the flag off a raw company_settings.metadata bag (adapter-safe, total). */
export function isEInvoiceApplicable(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  return normalizeEInvoiceReadiness(
    (metadata as Record<string, unknown>)[EINVOICE_READINESS_METADATA_KEY],
  ).applicable;
}
