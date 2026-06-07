// Single source of truth for expense editability, derived from the expense
// lifecycle (draft → pending → approved/rejected → paid). Status changes flow
// through the dedicated actions (submit/approve/reject/markPaid), never a content
// edit; this helper just centralizes the gates that were inline status strings.

export type ExpenseEditMode = 'full' | 'none';

export interface ExpenseEditability {
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  mode: ExpenseEditMode;
  reason: string;
}

const EDITABLE = ['draft', 'pending'];

export function getExpenseEditability(status: string | null | undefined): ExpenseEditability {
  const s = status ?? 'draft';
  const canEdit = EDITABLE.includes(s);
  const canDelete = s === 'draft';
  const canApprove = s === 'pending';

  const reason = canEdit
    ? ''
    : s === 'paid'
      ? 'Paid expenses are locked and can no longer be edited.'
      : s === 'approved'
        ? 'Approved expenses are locked; reject first if a change is required.'
        : s === 'rejected'
          ? 'Rejected expenses cannot be edited.'
          : 'This expense can no longer be edited.';

  return { canEdit, canDelete, canApprove, mode: canEdit ? 'full' : 'none', reason };
}
