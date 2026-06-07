import { describe, it, expect } from 'vitest';
import { getExpenseEditability } from './expensePermissions';

describe('getExpenseEditability', () => {
  it('allows edit + delete for a draft', () => {
    expect(getExpenseEditability('draft')).toMatchObject({ canEdit: true, canDelete: true, canApprove: false });
  });

  it('allows edit + approve (not delete) once pending', () => {
    expect(getExpenseEditability('pending')).toMatchObject({ canEdit: true, canDelete: false, canApprove: true });
  });

  it('locks editing for approved / rejected / paid, with a reason', () => {
    for (const s of ['approved', 'rejected', 'paid']) {
      const e = getExpenseEditability(s);
      expect(e.canEdit).toBe(false);
      expect(e.canApprove).toBe(false);
      expect(e.reason).toBeTruthy();
    }
  });

  it('defaults a missing status to an editable draft', () => {
    expect(getExpenseEditability(null).canEdit).toBe(true);
  });
});
