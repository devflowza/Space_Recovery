import { describe, it, expect } from 'vitest';
import { buildCaseStatusOptions, type StatusLite } from './caseStatusOptions';
import type { AllowedTransition } from './caseStateMachineService';
import type { Database } from '../types/database.types';

type CaseStatusRow = Database['public']['Tables']['master_case_statuses']['Row'];

// Minimal master_case_statuses fixtures (only id/name/type are read by the picker).
const REGISTERED: StatusLite = { id: 's-registered', name: 'Registered', type: 'intake' };
const RECEIVED: StatusLite = { id: 's-received', name: 'Device Received', type: 'intake' };
const IN_DIAGNOSIS: StatusLite = { id: 's-diagnosis', name: 'In Diagnosis', type: 'diagnosis' };
const RECOVERY: StatusLite = { id: 's-recovery', name: 'Recovery in Progress', type: 'recovery' };
const ON_HOLD: StatusLite = { id: 's-onhold', name: 'On Hold — Awaiting Parts', type: 'recovery' };
const QA: StatusLite = { id: 's-qa', name: 'Verification (QA)', type: 'qa' };
const READY: StatusLite = { id: 's-ready', name: 'Ready for Delivery', type: 'ready' };
const CANCELLED_CLIENT: StatusLite = { id: 's-cancel', name: 'Cancelled — Customer Declined', type: 'cancelled' };
const DELIVERED: StatusLite = { id: 's-delivered', name: 'Data Delivered', type: 'delivered' };

const ALL: StatusLite[] = [
  REGISTERED,
  RECEIVED,
  IN_DIAGNOSIS,
  RECOVERY,
  ON_HOLD,
  QA,
  READY,
  CANCELLED_CLIENT,
  DELIVERED,
];

function edge(to: StatusLite, over: Partial<AllowedTransition> = {}): AllowedTransition {
  return {
    to_status: to as unknown as CaseStatusRow,
    to_phase: to.type as AllowedTransition['to_phase'],
    requires: [],
    description: null,
    is_reopen: false,
    ...over,
  };
}

describe('buildCaseStatusOptions', () => {
  it('offers a same-phase sibling as a lateral move (the intra-phase fix)', () => {
    // From Registered (intake), the cross-phase edges go to diagnosis + cancelled.
    const opts = buildCaseStatusOptions({
      current: REGISTERED,
      allActiveStatuses: ALL,
      allowedTransitions: [edge(IN_DIAGNOSIS), edge(CANCELLED_CLIENT)],
    });
    const received = opts.find((o) => o.value === 'Device Received');
    expect(received).toBeDefined();
    expect(received?.group).toBe('lateral');
  });

  it('marks the current status as current and lists it first', () => {
    const opts = buildCaseStatusOptions({
      current: REGISTERED,
      allActiveStatuses: ALL,
      allowedTransitions: [edge(IN_DIAGNOSIS)],
    });
    expect(opts[0]).toEqual({ value: 'Registered', label: 'Registered', group: 'current' });
  });

  it('groups cross-phase destinations: forward as advance, cancelled as cancel', () => {
    const opts = buildCaseStatusOptions({
      current: REGISTERED,
      allActiveStatuses: ALL,
      allowedTransitions: [edge(IN_DIAGNOSIS), edge(CANCELLED_CLIENT)],
    });
    expect(opts.find((o) => o.value === 'In Diagnosis')?.group).toBe('advance');
    expect(opts.find((o) => o.value === 'Cancelled — Customer Declined')?.group).toBe('cancel');
  });

  it('offers both QA and Ready from recovery when QA is enabled (optional per case)', () => {
    const opts = buildCaseStatusOptions({
      current: RECOVERY,
      allActiveStatuses: ALL,
      allowedTransitions: [edge(QA), edge(READY), edge(CANCELLED_CLIENT)],
    });
    expect(opts.find((o) => o.value === 'Verification (QA)')?.group).toBe('advance');
    expect(opts.find((o) => o.value === 'Ready for Delivery')?.group).toBe('advance');
  });

  it('suppresses qa-phase options (advance and lateral) when qaEnabled is false', () => {
    const advance = buildCaseStatusOptions({
      current: RECOVERY,
      allActiveStatuses: ALL,
      allowedTransitions: [edge(QA), edge(READY)],
      qaEnabled: false,
    });
    expect(advance.find((o) => o.value === 'Verification (QA)')).toBeUndefined();
    expect(advance.find((o) => o.value === 'Ready for Delivery')?.group).toBe('advance');
    // Lateral suppression: a qa sibling never shows when the tenant has QA off.
    const lateral = buildCaseStatusOptions({
      current: QA,
      allActiveStatuses: [QA, { id: 's-qa2', name: 'Second QA Pass', type: 'qa' }],
      allowedTransitions: [],
      qaEnabled: false,
    });
    expect(lateral.find((o) => o.value === 'Second QA Pass')).toBeUndefined();
  });

  it('does not treat null-phase statuses as same-phase laterals', () => {
    // The DB `type` (phase) column is nullable; two statuses with a null phase are
    // NOT siblings, so the second must not be offered as a lateral move.
    const current: StatusLite = { id: 'a', name: 'A', type: null };
    const sibling: StatusLite = { id: 'b', name: 'B', type: null };
    const opts = buildCaseStatusOptions({
      current,
      allActiveStatuses: [current, sibling],
      allowedTransitions: [],
    });
    expect(opts.map((o) => o.value)).toEqual(['A']);
    expect(opts.find((o) => o.value === 'B')).toBeUndefined();
  });

  it('flags reopen edges as reopen', () => {
    const opts = buildCaseStatusOptions({
      current: DELIVERED,
      allActiveStatuses: ALL,
      allowedTransitions: [edge(RECOVERY, { is_reopen: true })],
    });
    expect(opts.find((o) => o.value === 'Recovery in Progress')?.group).toBe('reopen');
  });

  it('never offers an unreachable status (not current, not a sibling, not an allowed edge)', () => {
    const opts = buildCaseStatusOptions({
      current: REGISTERED,
      allActiveStatuses: ALL,
      allowedTransitions: [edge(IN_DIAGNOSIS)],
    });
    // Data Delivered is neither the current status, an intake sibling, nor an allowed edge.
    expect(opts.find((o) => o.value === 'Data Delivered')).toBeUndefined();
  });

  it('does not duplicate the current status if an edge points back at it', () => {
    const opts = buildCaseStatusOptions({
      current: REGISTERED,
      allActiveStatuses: ALL,
      allowedTransitions: [edge(REGISTERED), edge(IN_DIAGNOSIS)],
    });
    expect(opts.filter((o) => o.value === 'Registered')).toHaveLength(1);
  });

  it('is null-current safe (returns only the allowed edges)', () => {
    const opts = buildCaseStatusOptions({
      current: null,
      allActiveStatuses: ALL,
      allowedTransitions: [edge(IN_DIAGNOSIS)],
    });
    expect(opts.map((o) => o.value)).toEqual(['In Diagnosis']);
  });
});
