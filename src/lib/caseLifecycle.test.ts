import { describe, it, expect } from 'vitest';
import {
  resolveStatusTypes,
  bucketizeStatusCounts,
  statusNamesForBucket,
  formatCaseAge,
  ageSeverity,
  AGE_WARN_DAYS,
  AGE_CRIT_DAYS,
} from './caseLifecycle';

const MASTER = [
  { name: 'Registered', type: 'intake' },
  { name: 'Device Received', type: 'intake' },
  { name: 'In Diagnosis', type: 'diagnosis' },
  { name: 'Awaiting Customer Approval', type: 'awaiting_approval' },
  { name: 'Approved — In Queue', type: 'approved' },
  { name: 'Verification (QA)', type: 'qa' },
  { name: 'Ready for Delivery', type: 'ready' },
  { name: 'Data Delivered', type: 'delivered' },
  { name: 'Closed — Device Returned', type: 'closed' },
  { name: 'No Solution — Future Follow-up', type: 'no_solution' },
  { name: 'Cancelled — Customer Declined', type: 'cancelled' },
  { name: 'No Type Row', type: null },
];

describe('resolveStatusTypes', () => {
  it('maps master rows by name and skips null types', () => {
    const map = resolveStatusTypes(MASTER, undefined);
    expect(map.get('Device Received')).toBe('intake');
    expect(map.get('Data Delivered')).toBe('delivered');
    expect(map.get('Closed — Device Returned')).toBe('closed');
    expect(map.has('No Type Row')).toBe(false);
  });

  it('layers tenant overrides on top (override wins, new names added)', () => {
    const map = resolveStatusTypes(MASTER, {
      'Device Received': 'diagnosis',
      'Custom Imported Status': 'closed',
    });
    expect(map.get('Device Received')).toBe('diagnosis');
    expect(map.get('Custom Imported Status')).toBe('closed');
  });

  it('drops overrides whose value is not a valid status type', () => {
    const map = resolveStatusTypes(MASTER, {
      Garbage: 'not-a-type',
      // 'completed' was retired from the taxonomy — stale overrides are dropped.
      'Old Completed': 'completed',
    });
    expect(map.has('Garbage')).toBe(false);
    expect(map.has('Old Completed')).toBe(false);
  });
});

describe('bucketizeStatusCounts', () => {
  const typeMap = resolveStatusTypes(MASTER, {});
  // Post-standardization live shape (2026-07-04): 304 active of 2,012.
  const counts = [
    { status: 'Registered', total: 4 },
    { status: 'Device Received', total: 24 },
    { status: 'In Diagnosis', total: 32 },
    { status: 'Awaiting Customer Approval', total: 191 },
    { status: 'Approved — In Queue', total: 25 },
    { status: 'Verification (QA)', total: 4 },
    { status: 'Ready for Delivery', total: 24 },
    { status: 'Data Delivered', total: 482 },
    { status: 'Closed — Device Returned', total: 1099 },
    { status: 'No Solution — Future Follow-up', total: 15 },
    { status: 'Cancelled — Customer Declined', total: 127 },
    { status: 'Some Unknown', total: 7 },
    { status: null, total: 3 },
  ];

  it('sums disjoint pipeline buckets by lifecycle type', () => {
    const r = bucketizeStatusCounts(counts, typeMap);
    expect(r.buckets.new).toBe(28);
    expect(r.buckets.diagnosis).toBe(32);
    expect(r.buckets.approval).toBe(191);
    expect(r.buckets.recovery).toBe(25 + 4);
    expect(r.buckets.ready).toBe(24);
    expect(r.buckets.delivered).toBe(482);
    expect(r.buckets.closed).toBe(1099);
    expect(r.buckets.no_solution).toBe(15);
    expect(r.cancelled).toBe(127);
  });

  it('counts unmapped + null statuses as unmapped and keeps them active', () => {
    const r = bucketizeStatusCounts(counts, typeMap);
    expect(r.unmapped).toBe(10);
    expect(r.total).toBe(2037);
    // no_solution is terminal-for-now: excluded from active like delivered/closed/cancelled.
    expect(r.active).toBe(2037 - 482 - 1099 - 15 - 127);
  });
});

describe('statusNamesForBucket', () => {
  const typeMap = resolveStatusTypes(MASTER, { 'Imported Old Return': 'closed' });
  const counts = [
    { status: 'Device Received', total: 1 },
    { status: 'Closed — Device Returned', total: 2 },
    { status: 'Imported Old Return', total: 3 },
    { status: 'Data Delivered', total: 4 },
    { status: 'Unknown', total: 5 },
  ];

  it('returns only data-present names whose type belongs to the bucket', () => {
    expect(statusNamesForBucket('closed', counts, typeMap).sort()).toEqual([
      'Closed — Device Returned',
      'Imported Old Return',
    ]);
    expect(statusNamesForBucket('delivered', counts, typeMap)).toEqual(['Data Delivered']);
    expect(statusNamesForBucket('new', counts, typeMap)).toEqual(['Device Received']);
    expect(statusNamesForBucket('diagnosis', counts, typeMap)).toEqual([]);
  });
});

describe('formatCaseAge', () => {
  const now = new Date('2026-07-02T12:00:00Z');
  it('renders sub-hour, hours and days', () => {
    expect(formatCaseAge('2026-07-02T11:40:00Z', now)).toBe('<1h');
    expect(formatCaseAge('2026-07-02T07:00:00Z', now)).toBe('5h');
    expect(formatCaseAge('2026-07-01T06:00:00Z', now)).toBe('1d');
    expect(formatCaseAge('2026-06-20T12:00:00Z', now)).toBe('12d');
  });
});

describe('ageSeverity', () => {
  const now = new Date('2026-07-02T12:00:00Z');
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

  it('escalates open cases at the warn/crit thresholds', () => {
    expect(ageSeverity(daysAgo(AGE_WARN_DAYS - 1), now, 'intake')).toBe('ok');
    expect(ageSeverity(daysAgo(AGE_WARN_DAYS), now, 'recovery')).toBe('warn');
    expect(ageSeverity(daysAgo(AGE_CRIT_DAYS), now, 'diagnosis')).toBe('crit');
  });

  it('never flags terminal cases, and treats unknown type as open', () => {
    expect(ageSeverity(daysAgo(30), now, 'delivered')).toBe('ok');
    expect(ageSeverity(daysAgo(30), now, 'closed')).toBe('ok');
    expect(ageSeverity(daysAgo(30), now, 'cancelled')).toBe('ok');
    expect(ageSeverity(daysAgo(30), now, null)).toBe('crit');
  });
});
