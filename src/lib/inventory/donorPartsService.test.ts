// src/lib/inventory/donorPartsService.test.ts
// Unit tests for getDonorPartsForItems grouping logic.
// The Supabase client is mocked so no network call is made.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- mock supabase ----
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
  resolveTenantId: vi.fn().mockResolvedValue('tenant-1'),
}));

import { supabase } from '../supabaseClient';
import { getDonorPartsForItems } from './donorPartsService';
import type { DonorPartRow } from './donorPartsService';

const makePart = (overrides: Partial<DonorPartRow>): DonorPartRow => ({
  id: 'part-1',
  item_id: 'item-1',
  part_type: 'heads',
  quantity: 1,
  condition_id: null,
  notes: null,
  tenant_id: 'tenant-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  created_by: null,
  updated_by: null,
  deleted_at: null,
  ...overrides,
});

const buildChain = (rows: DonorPartRow[]) => ({
  select: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: rows, error: null }),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getDonorPartsForItems', () => {
  it('returns an empty Map when called with an empty array', async () => {
    const result = await getDonorPartsForItems([]);
    expect(result.size).toBe(0);
    // should NOT query supabase at all
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('groups parts by item_id correctly', async () => {
    const rows: DonorPartRow[] = [
      makePart({ id: 'p1', item_id: 'item-A', part_type: 'heads', quantity: 1 }),
      makePart({ id: 'p2', item_id: 'item-A', part_type: 'pcb', quantity: 1 }),
      makePart({ id: 'p3', item_id: 'item-B', part_type: 'controller', quantity: 2 }),
    ];

    vi.mocked(supabase.from).mockReturnValue(buildChain(rows) as ReturnType<typeof supabase.from>);

    const result = await getDonorPartsForItems(['item-A', 'item-B']);

    expect(result.size).toBe(2);

    const partsA = result.get('item-A')!;
    expect(partsA).toHaveLength(2);
    expect(partsA.map(p => p.part_type)).toEqual(['heads', 'pcb']);

    const partsB = result.get('item-B')!;
    expect(partsB).toHaveLength(1);
    expect(partsB[0].part_type).toBe('controller');
    expect(partsB[0].quantity).toBe(2);
  });

  it('returns empty arrays (missing key) for items with no parts', async () => {
    const rows: DonorPartRow[] = [
      makePart({ id: 'p1', item_id: 'item-A', part_type: 'heads', quantity: 1 }),
    ];

    vi.mocked(supabase.from).mockReturnValue(buildChain(rows) as ReturnType<typeof supabase.from>);

    const result = await getDonorPartsForItems(['item-A', 'item-B']);

    expect(result.has('item-A')).toBe(true);
    // item-B has no parts — key should not be in the map
    expect(result.has('item-B')).toBe(false);
    // consumer uses ?? [] to handle missing key — this is the documented contract
  });

  it('throws and propagates supabase errors', async () => {
    const errorChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error('db error') }),
    };

    vi.mocked(supabase.from).mockReturnValue(errorChain as ReturnType<typeof supabase.from>);

    await expect(getDonorPartsForItems(['item-A'])).rejects.toThrow('db error');
  });
});
