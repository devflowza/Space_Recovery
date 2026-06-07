import { describe, it, expect } from 'vitest';
import { getPurchaseOrderEditability } from './purchaseOrderPermissions';

describe('getPurchaseOrderEditability', () => {
  it('allows editing early-lifecycle statuses (case-insensitive)', () => {
    for (const s of ['Draft', 'Ordered', 'draft', 'ordered']) {
      expect(getPurchaseOrderEditability(s).canEdit).toBe(true);
    }
  });

  it('locks editing once terminal (approved/received/cancelled/closed/completed)', () => {
    for (const s of ['Approved', 'Received', 'Cancelled', 'Closed', 'Completed']) {
      const e = getPurchaseOrderEditability(s);
      expect(e.canEdit).toBe(false);
      expect(e.reason).toBeTruthy();
    }
  });

  it('treats a missing status as editable (new/unknown, denylist semantics)', () => {
    expect(getPurchaseOrderEditability(null).canEdit).toBe(true);
    expect(getPurchaseOrderEditability(undefined).canEdit).toBe(true);
  });
});
