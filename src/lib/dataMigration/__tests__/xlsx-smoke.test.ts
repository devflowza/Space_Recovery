import { describe, it, expect } from 'vitest';

describe('xlsx package availability', () => {
  it('resolves the xlsx module and exposes utils and read', async () => {
    const XLSX = await import('xlsx');
    expect(typeof XLSX.read).toBe('function');
    expect(typeof XLSX.utils.sheet_to_json).toBe('function');
    expect(typeof XLSX.write).toBe('function');
  });
});
