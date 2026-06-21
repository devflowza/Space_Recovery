// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderBank } from './bank';
import type { EngineContext, EngineDocData } from '../types';

function collectText(node: unknown, out: string[]): void {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach((c) => collectText(c, out));
  const o = node as Record<string, unknown>;
  if (typeof o.text === 'string') out.push(o.text);
  Object.values(o).forEach((v) => collectText(v, out));
}

const BANK_DATA = {
  bank: {
    title: { en: 'Bank Account', ar: 'تفاصيل البنك' },
    rows: [
      { label: { en: 'Account Name:', ar: 'اسم الحساب:' }, value: 'Future Space LLC' },
      { label: { en: 'Account No:', ar: 'رقم الحساب:' }, value: '123456789' },
      { label: { en: 'Bank:', ar: 'البنك:' }, value: 'Sohar International' },
      { label: { en: 'IBAN:', ar: 'الآيبان:' }, value: 'OM12 0000 1234' },
    ],
  },
} as unknown as EngineDocData;

function engine(bankStyle?: 'boxed' | 'inline'): EngineContext {
  return {
    config: {
      language: { mode: 'en', primary: 'en' },
      sections: [{ key: 'bank', visible: true, order: 8, ...(bankStyle ? { bankStyle } : {}) }],
    },
  } as unknown as EngineContext;
}

describe('renderBank — display style', () => {
  it('renders a boxed bank block by default (each field labelled on its own line)', () => {
    const out = renderBank(engine(), BANK_DATA);
    const texts: string[] = [];
    collectText(out, texts);
    // Boxed shows the "Account Name:" field label.
    expect(texts.some((t) => t.includes('Account Name:'))).toBe(true);
    expect(texts.some((t) => t.includes('Future Space LLC'))).toBe(true);
  });

  it('renders a single-line bank block when bankStyle is "inline"', () => {
    const out = renderBank(engine('inline'), BANK_DATA);
    const texts: string[] = [];
    collectText(out, texts);
    const joined = texts.join(' ');
    // One pipe-separated line; the account name leads (no "Account Name:" label).
    expect(joined).toContain('Bank Account: Future Space LLC');
    expect(joined).toContain('Account No: 123456789');
    expect(joined).toContain('Bank: Sohar International');
    expect(joined).toContain('IBAN: OM12 0000 1234');
    expect(joined).toContain('|');
    expect(texts.some((t) => t.includes('Account Name:'))).toBe(false);
  });

  it('omits absent fields from the inline line', () => {
    const sparse = {
      bank: {
        title: { en: 'Bank Account' },
        rows: [
          { label: { en: 'Account Name:' }, value: 'Future Space LLC' },
          { label: { en: 'IBAN:' }, value: 'OM99' },
        ],
      },
    } as unknown as EngineDocData;
    const out = renderBank(engine('inline'), sparse);
    const texts: string[] = [];
    collectText(out, texts);
    const joined = texts.join(' ');
    expect(joined).toContain('Bank Account: Future Space LLC');
    expect(joined).toContain('IBAN: OM99');
    expect(joined).not.toContain('Account No:');
    expect(joined).not.toContain('Bank:');
  });
});
