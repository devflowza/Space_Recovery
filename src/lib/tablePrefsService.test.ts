// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_LIST_PAGE_SIZE,
  LIST_PAGE_SIZE_OPTIONS,
  normalizeListPageSize,
  readListPageSizeHint,
  writeListPageSizeHint,
} from './tablePrefsService';

describe('normalizeListPageSize', () => {
  it('accepts every allowed option', () => {
    for (const size of LIST_PAGE_SIZE_OPTIONS) {
      expect(normalizeListPageSize(size)).toBe(size);
    }
  });

  it('accepts numeric strings (localStorage round-trip)', () => {
    expect(normalizeListPageSize('25')).toBe(25);
    expect(normalizeListPageSize('100')).toBe(100);
  });

  it('rejects values outside the allowed set', () => {
    expect(normalizeListPageSize(7)).toBeUndefined();
    expect(normalizeListPageSize(0)).toBeUndefined();
    expect(normalizeListPageSize(-25)).toBeUndefined();
    expect(normalizeListPageSize(1000)).toBeUndefined();
  });

  it('rejects non-numeric garbage from corrupt metadata', () => {
    expect(normalizeListPageSize(null)).toBeUndefined();
    expect(normalizeListPageSize(undefined)).toBeUndefined();
    expect(normalizeListPageSize('abc')).toBeUndefined();
    expect(normalizeListPageSize({})).toBeUndefined();
    expect(normalizeListPageSize(NaN)).toBeUndefined();
  });

  it('default is itself an allowed option', () => {
    expect(LIST_PAGE_SIZE_OPTIONS).toContain(DEFAULT_LIST_PAGE_SIZE);
  });
});

describe('list page size hint', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips through localStorage', () => {
    writeListPageSizeHint(25);
    expect(readListPageSizeHint()).toBe(25);
  });

  it('returns undefined when no hint stored', () => {
    expect(readListPageSizeHint()).toBeUndefined();
  });

  it('ignores a corrupt stored hint', () => {
    localStorage.setItem('xsuite_list_page_size', 'not-a-number');
    expect(readListPageSizeHint()).toBeUndefined();
  });
});
