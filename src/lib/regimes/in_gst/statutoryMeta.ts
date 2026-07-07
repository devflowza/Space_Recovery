// India-only Rule 46 document meta rows (place of supply, reverse-charge notation,
// ship-to-where-different) and the r.46(q) signature block. Lives under regimes/in_gst
// so the country logic never leaks into pdf/engine (no-country-branching-outside-regimes);
// the render layer reaches it only through resolveStatutoryDocumentMeta, keyed by the
// resolved DocumentComplianceProfile key — data-driven, not a country string.

export interface StatutoryMetaRow {
  label: { en: string };
  value: string;
}

export interface IndiaMetaContext {
  placeOfSupplyStateName: string | null;
  placeOfSupplyStateCode: string | null; // GST state code, e.g. '27'
  reverseCharge: boolean;
  billingAddress: string | null;
  deliveryAddress: string | null;        // ship-to, when captured
}

/** r.46(q) — every tax invoice carries the seller's authorised signatory block.
 *  {SELLER} is substituted by the adapter with the resolved seller name. */
export const INDIA_SIGNATURE_LINES = ['For {SELLER}', 'Authorised Signatory'] as const;

export function buildIndiaStatutoryMeta(ctx: IndiaMetaContext): StatutoryMetaRow[] {
  const rows: StatutoryMetaRow[] = [];
  if (ctx.placeOfSupplyStateName && ctx.placeOfSupplyStateCode) {
    rows.push({ label: { en: 'Place of Supply:' }, value: `${ctx.placeOfSupplyStateName} (${ctx.placeOfSupplyStateCode})` });
  }
  // r.46(p): whether tax is payable on reverse charge — mandatory, always printed.
  rows.push({ label: { en: 'Reverse Charge:' }, value: ctx.reverseCharge ? 'Yes' : 'No' });
  const delivery = ctx.deliveryAddress?.trim();
  if (delivery && delivery !== ctx.billingAddress?.trim()) {
    rows.push({ label: { en: 'Delivery Address:' }, value: delivery });
  }
  return rows;
}

export function resolveStatutoryDocumentMeta(profileKey: string, ctx: IndiaMetaContext): StatutoryMetaRow[] {
  if (profileKey === 'in_gst_invoice') return buildIndiaStatutoryMeta(ctx);
  return [];
}
