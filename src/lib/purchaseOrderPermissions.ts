// Single source of truth for purchase-order editability. PO status comes from the
// tenant-customizable `master_purchase_order_statuses` lookup, so we use denylist
// semantics: a PO is editable unless its status is clearly terminal. This blocks
// content edits to approved/received orders (previously the Edit action had no gate
// at all) without over-locking tenant-defined early-lifecycle statuses.

export interface PurchaseOrderEditability {
  canEdit: boolean;
  reason: string;
}

const TERMINAL = ['approved', 'received', 'cancelled', 'canceled', 'closed', 'completed'];

export function getPurchaseOrderEditability(statusName: string | null | undefined): PurchaseOrderEditability {
  const name = (statusName ?? '').trim().toLowerCase();
  const isTerminal = TERMINAL.includes(name);

  return {
    canEdit: !isTerminal,
    reason: isTerminal
      ? `This purchase order is ${name} and can no longer be edited.`
      : '',
  };
}
