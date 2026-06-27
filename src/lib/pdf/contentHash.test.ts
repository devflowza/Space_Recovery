import { describe, it, expect } from 'vitest';
import { sha256Hex, buildDocumentPdfPath } from './contentHash';

describe('contentHash — document provability helpers', () => {
  it('sha256Hex matches the known digest for "abc"', async () => {
    const blob = new Blob(['abc'], { type: 'text/plain' });
    expect(await sha256Hex(blob)).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('sha256Hex matches the known digest for empty bytes', async () => {
    expect(await sha256Hex(new Blob([]))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('sha256Hex is reproducible for identical bytes (snapshot reproducibility)', async () => {
    const a = await sha256Hex(new Blob(['report-bytes']));
    const b = await sha256Hex(new Blob(['report-bytes']));
    expect(a).toBe(b);
  });

  it('sha256Hex differs when a single byte changes (tamper evidence)', async () => {
    const a = await sha256Hex(new Blob(['report-bytes']));
    const b = await sha256Hex(new Blob(['report-byte5']));
    expect(a).not.toBe(b);
  });

  it('buildDocumentPdfPath is content-addressed (tenant/type/id/hash.pdf)', () => {
    expect(buildDocumentPdfPath('t1', 'report', 'i1', 'deadbeef')).toBe(
      't1/report/i1/deadbeef.pdf',
    );
  });
});
