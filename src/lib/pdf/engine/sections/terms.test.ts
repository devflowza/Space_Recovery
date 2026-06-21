// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderTerms } from './terms';
import type { EngineContext, EngineDocData } from '../types';
import type {
  DocumentTemplateConfig,
  LabelText,
  SectionConfig,
  TermsContentConfig,
} from '../../templateConfig';

function collectText(node: unknown, out: string[]): void {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach((c) => collectText(c, out));
  const o = node as Record<string, unknown>;
  if (typeof o.text === 'string') out.push(o.text);
  Object.values(o).forEach((v) => collectText(v, out));
}

/** Document data carrying a bank block (terms content now comes from the config). */
const BANK = {
  bank: {
    title: { en: 'Bank Account', ar: 'تفاصيل البنك' },
    rows: [{ label: { en: 'Account Name:', ar: 'اسم الحساب:' }, value: 'Future Space LLC' }],
  },
} as unknown as EngineDocData;

const NO_DATA = {} as EngineDocData;

const EN = { mode: 'en', primary: 'en' };
const BILINGUAL = { mode: 'bilingual_sidebyside', primary: 'en' };

function engine(opts: {
  termsContent?: TermsContentConfig;
  sections?: Pick<SectionConfig, 'key' | 'visible' | 'order'>[];
  language?: { mode: string; primary: string };
  labels?: Record<string, LabelText>;
}): EngineContext {
  return {
    config: {
      language: opts.language ?? EN,
      sections: opts.sections ?? [{ key: 'terms', visible: true, order: 7 }],
      labels: opts.labels ?? {},
      termsContent: opts.termsContent,
    } as unknown as DocumentTemplateConfig,
  } as EngineContext;
}

const TERMS_EN = 'Valid 30 days. 50% advance to begin.';
const TERMS_AR = 'صالح لمدة ٣٠ يومًا. دفعة مقدمة ٥٠٪ للبدء.';

describe('renderTerms — per-document-type Terms & Conditions', () => {
  it('renders the template Terms (English) from the config', () => {
    const out = renderTerms(engine({ termsContent: { terms: { en: TERMS_EN } } }), NO_DATA);
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.some((t) => t.includes(TERMS_EN))).toBe(true);
  });

  it('shows both English and Arabic terms on a bilingual document', () => {
    const out = renderTerms(
      engine({ termsContent: { terms: { en: TERMS_EN, ar: TERMS_AR } }, language: BILINGUAL }),
      NO_DATA,
    );
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.some((t) => t.includes(TERMS_EN))).toBe(true);
    expect(texts.some((t) => t.includes(TERMS_AR))).toBe(true);
  });

  it('omits the Arabic terms on an English-only document', () => {
    const out = renderTerms(
      engine({ termsContent: { terms: { en: TERMS_EN, ar: TERMS_AR } }, language: EN }),
      NO_DATA,
    );
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.some((t) => t.includes(TERMS_EN))).toBe(true);
    expect(texts.some((t) => t.includes(TERMS_AR))).toBe(false);
  });

  it('renders the Notes block when set', () => {
    const out = renderTerms(
      engine({ termsContent: { notes: { en: 'Diagnostics are non-destructive.' } } }),
      NO_DATA,
    );
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.some((t) => t.includes('Diagnostics are non-destructive.'))).toBe(true);
  });

  it('returns null when there is no terms content and no inline bank', () => {
    expect(renderTerms(engine({}), NO_DATA)).toBeNull();
  });
});

describe('renderTerms — centre-split box layout', () => {
  type Box = { table?: { widths?: unknown[]; body?: unknown[][] } };
  const firstBox = (out: unknown): Box => (out as { stack: Box[] }).stack[0];

  it('renders a single centre-split box on a bilingual document (English | Arabic)', () => {
    const out = renderTerms(
      engine({ termsContent: { terms: { en: TERMS_EN, ar: TERMS_AR } }, language: BILINGUAL }),
      NO_DATA,
    );
    const box = firstBox(out);
    expect(box.table?.widths).toHaveLength(2); // two columns = centre split
    const row = box.table?.body?.[0] ?? [];
    const enText: string[] = [];
    const arText: string[] = [];
    collectText(row[0], enText);
    collectText(row[1], arText);
    expect(enText.some((t) => t.includes(TERMS_EN))).toBe(true);
    expect(arText.some((t) => t.includes(TERMS_AR))).toBe(true);
    expect(arText.some((t) => t.includes(TERMS_EN))).toBe(false);
  });

  it('renders a single full-width box on an English-only document', () => {
    const out = renderTerms(
      engine({ termsContent: { terms: { en: TERMS_EN } }, language: EN }),
      NO_DATA,
    );
    expect(firstBox(out).table?.widths).toHaveLength(1);
  });
});

describe('renderTerms — movable bank section coordination', () => {
  it('renders the bank box inline when the standalone bank section is hidden (default layout)', () => {
    const out = renderTerms(
      engine({
        termsContent: { terms: { en: TERMS_EN } },
        sections: [
          { key: 'terms', visible: true, order: 7 },
          { key: 'bank', visible: false, order: 8 },
        ],
      }),
      BANK,
    );
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.some((t) => t.includes('Future Space LLC'))).toBe(true);
  });

  it('omits the inline bank box when the standalone bank section is visible (no double-render)', () => {
    const out = renderTerms(
      engine({
        termsContent: { terms: { en: TERMS_EN } },
        sections: [
          { key: 'terms', visible: true, order: 7 },
          { key: 'bank', visible: true, order: 8 },
        ],
      }),
      BANK,
    );
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.some((t) => t.includes('Future Space LLC'))).toBe(false);
    // Terms still render — only the bank moved out.
    expect(texts.some((t) => t.includes(TERMS_EN))).toBe(true);
  });

  it('renders the inline bank box with English-only field labels (no translated labels)', () => {
    const out = renderTerms(
      engine({
        termsContent: { terms: { en: TERMS_EN } },
        language: BILINGUAL,
        sections: [
          { key: 'terms', visible: true, order: 7 },
          { key: 'bank', visible: false, order: 8 },
        ],
      }),
      BANK,
    );
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.some((t) => t.includes('Account Name:'))).toBe(true); // English field label
    expect(texts.some((t) => t.includes('اسم الحساب:'))).toBe(false); // translated field label omitted
    expect(texts.some((t) => t.includes('Future Space LLC'))).toBe(true); // value present
  });
});

describe('renderTerms — per-record terms (from the edited quote/invoice)', () => {
  const RECORD_TERMS = 'No data, no fee. Quote valid 30 days. 50% deposit to begin.';

  function withRecordTerms(blocks: Array<{ title: LabelText; body: string; format?: 'html' | 'text' }>): EngineDocData {
    return { terms: { title: { en: 'Terms & Conditions', ar: 'الشروط والأحكام' }, blocks } } as unknown as EngineDocData;
  }

  it('renders the per-record plain-text terms even when the template has no termsContent', () => {
    const out = renderTerms(
      engine({}),
      withRecordTerms([{ title: { en: 'Terms & Conditions', ar: 'الشروط والأحكام' }, body: RECORD_TERMS }]),
    );
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.some((t) => t.includes(RECORD_TERMS))).toBe(true);
  });

  it('lets the per-record terms take precedence over the template termsContent', () => {
    const out = renderTerms(
      engine({ termsContent: { terms: { en: 'TEMPLATE TERMS' } } }),
      withRecordTerms([{ title: { en: 'Terms & Conditions' }, body: 'RECORD TERMS' }]),
    );
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.some((t) => t.includes('RECORD TERMS'))).toBe(true);
    expect(texts.some((t) => t.includes('TEMPLATE TERMS'))).toBe(false);
  });

  it('renders both the per-record Payment Terms and Notes blocks', () => {
    const out = renderTerms(
      engine({}),
      withRecordTerms([
        { title: { en: 'Payment Terms' }, body: 'Net 30 from invoice date.' },
        { title: { en: 'Notes' }, body: 'Handle the donor drive with care.' },
      ]),
    );
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.some((t) => t.includes('Payment Terms'))).toBe(true);
    expect(texts.some((t) => t.includes('Net 30 from invoice date.'))).toBe(true);
    expect(texts.some((t) => t.includes('Notes'))).toBe(true);
    expect(texts.some((t) => t.includes('Handle the donor drive with care.'))).toBe(true);
  });

  it('renders a per-record HTML terms body as structured content (rich invoice editor)', () => {
    const out = renderTerms(
      engine({}),
      withRecordTerms([
        { title: { en: 'Payment Terms' }, body: '<div><p>Pay <strong>50%</strong> upfront</p></div>', format: 'html' },
      ]),
    );
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.some((t) => t.includes('Pay '))).toBe(true);
    expect(texts.some((t) => t.includes('50%'))).toBe(true);
    expect(texts.some((t) => t.includes('upfront'))).toBe(true);
  });

  it('shows per-record terms (English) alongside the template Arabic terms on a bilingual document', () => {
    const out = renderTerms(
      engine({ termsContent: { terms: { en: 'IGNORED EN', ar: TERMS_AR } }, language: BILINGUAL }),
      withRecordTerms([{ title: { en: 'Terms & Conditions', ar: 'الشروط والأحكام' }, body: 'RECORD EN TERMS' }]),
    );
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.some((t) => t.includes('RECORD EN TERMS'))).toBe(true);
    expect(texts.some((t) => t.includes(TERMS_AR))).toBe(true);
    expect(texts.some((t) => t.includes('IGNORED EN'))).toBe(false);
  });

  it('returns null when there is neither per-record nor template terms and no bank', () => {
    expect(renderTerms(engine({}), withRecordTerms([]))).toBeNull();
  });
});

describe('renderTerms — entity decoding & duplicate-heading suppression', () => {
  function withRecordTerms(blocks: Array<{ title: LabelText; body: string; format?: 'html' | 'text' }>): EngineDocData {
    return { terms: { title: { en: 'Terms & Conditions', ar: 'الشروط والأحكام' }, blocks } } as unknown as EngineDocData;
  }

  it('decodes HTML entities in plain-text per-record terms (&amp; → &)', () => {
    const out = renderTerms(
      engine({}),
      withRecordTerms([
        { title: { en: 'Terms & Conditions' }, body: 'Accepted Payments: Cash, Card, Cheque &amp; Bank Transfer.' },
      ]),
    );
    const texts: string[] = [];
    collectText(out, texts);
    const joined = texts.join('\n');
    expect(joined).toContain('Cheque & Bank Transfer');
    expect(joined).not.toContain('&amp;');
  });

  it('decodes numeric and named entities (&#39; &nbsp; &lt;) in plain-text terms', () => {
    const out = renderTerms(
      engine({}),
      withRecordTerms([
        { title: { en: 'Notes' }, body: 'It&#39;s 50%&nbsp;advance &lt; balance.' },
      ]),
    );
    const texts: string[] = [];
    collectText(out, texts);
    const joined = texts.join('\n');
    expect(joined).toContain("It's 50%");
    expect(joined).toContain('< balance.');
    expect(joined).not.toContain('&#39;');
    expect(joined).not.toContain('&nbsp;');
  });

  it('drops a leading heading line that duplicates the section title (plain text)', () => {
    const out = renderTerms(
      engine({}),
      withRecordTerms([
        { title: { en: 'Terms & Conditions' }, body: 'Terms & Conditions\nNo data, no fee. 50% deposit to begin.' },
      ]),
    );
    const texts: string[] = [];
    collectText(out, texts);
    // The section prints the heading itself, so it must appear exactly once.
    expect(texts.filter((t) => t.includes('Terms & Conditions')).length).toBe(1);
    expect(texts.join('\n')).toContain('No data, no fee. 50% deposit to begin.');
  });

  it('keeps a leading line that is NOT the section title (real content, e.g. "No Data – No Fee")', () => {
    const out = renderTerms(
      engine({}),
      withRecordTerms([
        { title: { en: 'Terms & Conditions' }, body: 'No Data – No Fee: You only pay if recovery is successful.\nPayment: 50% advance.' },
      ]),
    );
    const texts: string[] = [];
    collectText(out, texts);
    const joined = texts.join('\n');
    expect(joined).toContain('No Data – No Fee: You only pay if recovery is successful.');
    // The section heading still renders exactly once (the content is not a heading).
    expect(texts.filter((t) => t === 'Terms & Conditions').length).toBe(1);
  });

  it('drops a leading heading ELEMENT that duplicates the section title (rich HTML invoice terms)', () => {
    const out = renderTerms(
      engine({}),
      withRecordTerms([
        {
          title: { en: 'Payment Terms' },
          body: '<div class="payment-terms"><h3>Payment Terms</h3><p>Net 30 from invoice date.</p></div>',
          format: 'html',
        },
      ]),
    );
    const texts: string[] = [];
    collectText(out, texts);
    expect(texts.filter((t) => t.includes('Payment Terms')).length).toBe(1);
    expect(texts.join('\n')).toContain('Net 30 from invoice date.');
  });

  it('keeps a rich HTML heading that does NOT match the section title', () => {
    const out = renderTerms(
      engine({}),
      withRecordTerms([
        {
          title: { en: 'Terms & Conditions' },
          body: '<h3>No Data – No Fee</h3><p>You only pay if recovery is successful.</p>',
          format: 'html',
        },
      ]),
    );
    const texts: string[] = [];
    collectText(out, texts);
    const joined = texts.join('\n');
    expect(joined).toContain('No Data – No Fee');
    expect(joined).toContain('You only pay if recovery is successful.');
  });
});
