import { describe, it, expect } from 'vitest';

describe('P0 legacy import/export teardown', () => {
  it('legacy importExportService is deleted', async () => {
    // @ts-expect-error intentionally importing a deleted module to assert it no longer resolves
    await expect(import('../../importExportService')).rejects.toThrow();
  });
  it('legacy bulkImportService is deleted', async () => {
    // @ts-expect-error intentionally importing a deleted module to assert it no longer resolves
    await expect(import('../../bulkImportService')).rejects.toThrow();
  });
  it('legacy ImportExport page is deleted', async () => {
    // @ts-expect-error intentionally importing a deleted module to assert it no longer resolves
    await expect(import('../../../pages/settings/ImportExport')).rejects.toThrow();
  });
  it('the new ImportExportCenter page resolves with a named export', async () => {
    const mod = await import('../../../pages/settings/ImportExportCenter');
    expect(mod.ImportExportCenter).toBeTypeOf('function');
  });
});
