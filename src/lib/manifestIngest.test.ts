import { describe, it, expect } from 'vitest';
import { parseManifest } from './manifestIngest';

describe('parseManifest — CSV', () => {
  it('parses a headered CSV with path,name,type,size,modified', () => {
    const csv = [
      'path,name,type,size,modified',
      '/recovered/docs,docs,folder,,2026-01-01',
      '/recovered/docs/a.pdf,a.pdf,file,2048,2026-01-02',
    ].join('\n');
    const r = parseManifest(csv, 'csv');
    expect(r.items).toHaveLength(2);
    expect(r.items[0].item_type).toBe('folder');
    expect(r.items[1]).toMatchObject({
      path: '/recovered/docs/a.pdf',
      name: 'a.pdf',
      item_type: 'file',
      size_bytes: 2048,
    });
    expect(r.summary).toEqual({ total_files: 1, total_folders: 1, total_bytes: 2048 });
  });

  it('derives name from the path and defaults type to file when those columns are absent', () => {
    const r = parseManifest('path,size\n/x/y/report.docx,500', 'csv');
    expect(r.items[0]).toMatchObject({ name: 'report.docx', item_type: 'file', size_bytes: 500 });
  });

  it('handles quoted fields containing commas', () => {
    const r = parseManifest('path,name,size\n"/a/b, c.txt","b, c.txt",10', 'csv');
    expect(r.items[0].path).toBe('/a/b, c.txt');
    expect(r.items[0].name).toBe('b, c.txt');
    expect(r.items[0].size_bytes).toBe(10);
  });

  it('recognises header aliases (filepath/bytes/sha256) case-insensitively', () => {
    const r = parseManifest('FilePath,Bytes,SHA256\n/a.bin,4096,abc123', 'csv');
    expect(r.items[0]).toMatchObject({ path: '/a.bin', size_bytes: 4096, checksum: 'abc123' });
  });

  it('treats blank/unparseable size as null and counts it as 0 bytes', () => {
    const r = parseManifest('path,size\n/a.txt,\n/b.txt,notanumber', 'csv');
    expect(r.items[0].size_bytes).toBeNull();
    expect(r.items[1].size_bytes).toBeNull();
    expect(r.summary.total_bytes).toBe(0);
  });

  it('skips blank lines', () => {
    const r = parseManifest('path,size\n/a.txt,1\n\n/b.txt,2\n', 'csv');
    expect(r.items).toHaveLength(2);
  });

  it('throws when no path column is present', () => {
    expect(() => parseManifest('name,size\nx,1', 'csv')).toThrow(/path/i);
  });
});

describe('parseManifest — JSON', () => {
  it('parses a JSON array of items', () => {
    const json = JSON.stringify([
      { path: '/a/f.txt', size: 12, type: 'file' },
      { path: '/a', type: 'folder' },
    ]);
    const r = parseManifest(json, 'json');
    expect(r.items).toHaveLength(2);
    expect(r.summary).toEqual({ total_files: 1, total_folders: 1, total_bytes: 12 });
  });

  it('throws on malformed JSON', () => {
    expect(() => parseManifest('{not json', 'json')).toThrow();
  });

  it('throws when JSON is not an array of objects', () => {
    expect(() => parseManifest('{"path":"/a"}', 'json')).toThrow(/array/i);
  });
});

describe('parseManifest — auto-detect + edge cases', () => {
  it('auto-detects JSON when content starts with [ or {', () => {
    const r = parseManifest('[{"path":"/a.txt","size":1}]');
    expect(r.items[0].path).toBe('/a.txt');
    expect(r.summary.total_bytes).toBe(1);
  });

  it('returns empty for blank input', () => {
    const r = parseManifest('   ');
    expect(r.items).toHaveLength(0);
    expect(r.summary).toEqual({ total_files: 0, total_folders: 0, total_bytes: 0 });
  });

  it('normalises folder synonyms (dir/directory) to folder', () => {
    const r = parseManifest('path,type\n/a,dir\n/b,directory', 'csv');
    expect(r.items.every((i) => i.item_type === 'folder')).toBe(true);
    expect(r.summary.total_folders).toBe(2);
  });
});
