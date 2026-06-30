import { describe, it, expect, vi, beforeEach } from 'vitest';

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: { from } }));

import { loadCatalogMaps } from './catalogResolver';

function tableReturning(rows: Array<{ id: string; name: string }>) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: rows, error: null })),
    })),
  };
}

beforeEach(() => {
  from.mockReset();
  from.mockImplementation((table: string) => {
    const map: Record<string, Array<{ id: string; name: string }>> = {
      catalog_device_types: [{ id: 't1', name: 'HDD' }, { id: 't2', name: 'SSD' }],
      catalog_device_brands: [{ id: 'b1', name: 'Seagate' }],
      catalog_device_capacities: [{ id: 'c1', name: '1TB' }],
      catalog_device_interfaces: [{ id: 'i1', name: 'SATA' }],
      catalog_device_conditions: [{ id: 'd1', name: 'Working' }],
    };
    return tableReturning(map[table] ?? []);
  });
});

describe('loadCatalogMaps', () => {
  it('returns lowercased-name → uuid maps for all five catalogs', async () => {
    const maps = await loadCatalogMaps();
    expect(maps.deviceTypes.get('hdd')).toBe('t1');
    expect(maps.deviceTypes.get('ssd')).toBe('t2');
    expect(maps.brands.get('seagate')).toBe('b1');
    expect(maps.capacities.get('1tb')).toBe('c1');
    expect(maps.interfaces.get('sata')).toBe('i1');
    expect(maps.conditions.get('working')).toBe('d1');
  });

  it('filters to active rows via is_active eq true', async () => {
    await loadCatalogMaps();
    expect(from).toHaveBeenCalledWith('catalog_device_types');
    expect(from).toHaveBeenCalledWith('catalog_device_conditions');
  });
});
