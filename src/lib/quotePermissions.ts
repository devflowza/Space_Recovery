// Single source of truth for quote editability, derived from the quote lifecycle
// rather than scattered inline `['draft','sent']` checks. Quotes have no payment
// settlement, so editability is purely a function of lifecycle status. Status
// itself changes only via the dedicated "Change Status" action (updateQuoteStatus),
// never via the content-edit form — see the Phase 2 payment-workflow spec.

export interface QuoteLifecycle {
  status?: string | null;
}

export type QuoteEditMode = 'full' | 'none';

export interface QuoteEditability {
  canEdit: boolean;
  canDelete: boolean;
  canConvert: boolean;
  mode: QuoteEditMode;
  reason: string;
}

const EDITABLE = ['draft', 'sent'];

export function getQuoteEditability(quote: QuoteLifecycle): QuoteEditability {
  const status = quote.status ?? 'draft';
  const canEdit = EDITABLE.includes(status);
  const canDelete = status === 'draft';
  const canConvert = status === 'accepted';

  const reason = canEdit
    ? ''
    : status === 'converted'
      ? 'This quote has been converted to an invoice and can no longer be edited.'
      : status === 'accepted'
        ? 'Accepted quotes are locked; create a new revision instead of editing.'
        : status === 'rejected'
          ? 'Rejected quotes cannot be edited.'
          : status === 'expired'
            ? 'Expired quotes cannot be edited.'
            : 'This quote cannot be edited.';

  return { canEdit, canDelete, canConvert, mode: canEdit ? 'full' : 'none', reason };
}
