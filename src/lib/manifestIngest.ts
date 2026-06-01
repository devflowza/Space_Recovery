// Recovered-file manifest ingestion (C4). Parses a tool-exported file tree
// (CSV or JSON from R-Studio / ddrescue / UFS Explorer / etc., or a manual
// listing) into normalized manifest items the lab can review and the customer
// accepts before delivery. Pure — no IO — so it is fully unit-tested.

export interface ManifestItem {
  path: string;
  name: string;
  item_type: 'file' | 'folder';
  size_bytes: number | null;
  modified_at: string | null;
  checksum: string | null;
}

export interface ManifestSummary {
  total_files: number;
  total_folders: number;
  total_bytes: number;
}

export interface ParsedManifest {
  items: ManifestItem[];
  summary: ManifestSummary;
}

export type ManifestFormat = 'csv' | 'json' | 'auto';

type Field = 'path' | 'name' | 'type' | 'size' | 'modified' | 'checksum';
type RawRecord = Partial<Record<Field, unknown>>;

// Header synonyms → canonical field. Compared lower-cased + trimmed.
const HEADER_ALIASES: Record<string, Field> = {
  path: 'path', full_path: 'path', 'full path': 'path', filepath: 'path', 'file path': 'path',
  name: 'name', filename: 'name', 'file name': 'name',
  type: 'type', item_type: 'type', kind: 'type',
  size: 'size', size_bytes: 'size', bytes: 'size', 'size (bytes)': 'size', filesize: 'size',
  modified: 'modified', modified_at: 'modified', 'date modified': 'modified', 'last modified': 'modified', mtime: 'modified',
  checksum: 'checksum', hash: 'checksum', md5: 'checksum', sha1: 'checksum', sha256: 'checksum',
};

function basename(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : path;
}

function normalizeType(value: unknown): 'file' | 'folder' {
  const v = String(value ?? '').trim().toLowerCase();
  return v === 'folder' || v === 'dir' || v === 'directory' || v === 'd' ? 'folder' : 'file';
}

function parseSize(value: unknown): number | null {
  if (value == null || String(value).trim() === '') return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function nonEmptyString(value: unknown): string | null {
  const v = value == null ? '' : String(value).trim();
  return v === '' ? null : v;
}

function toItem(raw: RawRecord): ManifestItem {
  const path = String(raw.path).trim();
  return {
    path,
    name: nonEmptyString(raw.name) ?? basename(path),
    item_type: normalizeType(raw.type),
    size_bytes: parseSize(raw.size),
    modified_at: nonEmptyString(raw.modified),
    checksum: nonEmptyString(raw.checksum),
  };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(input: string): RawRecord[] {
  const lines = input.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const fieldByIndex = splitCsvLine(lines[0]).map((h) => HEADER_ALIASES[h.trim().toLowerCase()]);
  if (!fieldByIndex.includes('path')) {
    throw new Error('CSV manifest must have a "path" column');
  }
  const records: RawRecord[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = splitCsvLine(lines[li]);
    const rec: RawRecord = {};
    cells.forEach((cell, idx) => {
      const field = fieldByIndex[idx];
      if (field) rec[field] = cell;
    });
    records.push(rec);
  }
  return records;
}

function parseJsonArray(input: string): RawRecord[] {
  const data = JSON.parse(input);
  if (!Array.isArray(data)) {
    throw new Error('JSON manifest must be an array of items');
  }
  return data.map((d: Record<string, unknown>) => ({
    path: d.path ?? d.full_path ?? d.filepath,
    name: d.name ?? d.filename,
    type: d.type ?? d.item_type ?? d.kind,
    size: d.size ?? d.size_bytes ?? d.bytes,
    modified: d.modified ?? d.modified_at ?? d.mtime,
    checksum: d.checksum ?? d.hash ?? d.sha256 ?? d.md5,
  }));
}

export function parseManifest(input: string, format: ManifestFormat = 'auto'): ParsedManifest {
  const trimmed = (input ?? '').trim();
  if (trimmed === '') {
    return { items: [], summary: { total_files: 0, total_folders: 0, total_bytes: 0 } };
  }

  let fmt = format;
  if (fmt === 'auto') {
    fmt = trimmed.startsWith('[') || trimmed.startsWith('{') ? 'json' : 'csv';
  }

  const raws = fmt === 'json' ? parseJsonArray(trimmed) : parseCsv(input);
  const items = raws
    .filter((r) => r.path != null && String(r.path).trim() !== '')
    .map(toItem);

  return {
    items,
    summary: {
      total_files: items.filter((i) => i.item_type === 'file').length,
      total_folders: items.filter((i) => i.item_type === 'folder').length,
      total_bytes: items.reduce((sum, i) => sum + (i.size_bytes ?? 0), 0),
    },
  };
}
