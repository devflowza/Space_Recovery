import { describe, it, expect } from 'vitest';
import { shapeRtlString, shapeDocDefinitionArabic } from './rtlShaping';

// Arabic presentation forms (the shaped output of arabic-reshaper).
const PRESENTATION_FORMS = /[ﭐ-﷿ﹰ-﻿]/;

describe('shapeRtlString', () => {
  it('leaves non-Arabic text untouched (English, numbers, currency)', () => {
    expect(shapeRtlString('Customer Information', 'rtl')).toBe('Customer Information');
    expect(shapeRtlString('1,234.500 OMR', 'rtl')).toBe('1,234.500 OMR');
    expect(shapeRtlString('', 'rtl')).toBe('');
  });

  it('reshapes + reorders multi-word Arabic (the مangled-header bug)', () => {
    const logical = 'معلومات العميل'; // "Customer Information"
    const out = shapeRtlString(logical, 'rtl');
    expect(out).not.toBe(logical); // it changed (reshaped + reordered)
    expect(PRESENTATION_FORMS.test(out)).toBe(true); // joined glyph forms emitted
    // BiDi reorders to visual order → the first logical word no longer leads.
    expect(out.indexOf(' ')).toBeGreaterThan(0); // the inter-word space is preserved
  });

  it('keeps Latin + numbers in place within a mixed string', () => {
    const out = shapeRtlString('VAT 5%: ضريبة', 'ltr');
    expect(out).toContain('VAT'); // Latin run survives
    expect(out).toContain('5'); // digit survives
    expect(PRESENTATION_FORMS.test(out)).toBe(true); // Arabic reshaped
  });
});

describe('shapeDocDefinitionArabic', () => {
  it('shapes every text node in a nested pdfmake definition, leaving English alone', () => {
    const def = {
      content: [
        { columns: [{ text: 'Customer Information' }, { text: 'معلومات العميل' }] },
        {
          table: {
            body: [[{ text: 'الإجمالي' }, { text: '1,470.000 OMR' }]],
          },
        },
      ],
    };
    shapeDocDefinitionArabic(def, 'rtl');
    const cols = (def.content[0] as { columns: Array<{ text: string }> }).columns;
    expect(cols[0].text).toBe('Customer Information'); // English untouched
    expect(cols[1].text).not.toBe('معلومات العميل'); // Arabic shaped
    expect(PRESENTATION_FORMS.test(cols[1].text)).toBe(true);
    const row = (def.content[1] as { table: { body: Array<Array<{ text: string }>> } }).table.body[0];
    expect(PRESENTATION_FORMS.test(row[0].text)).toBe(true); // Arabic cell shaped
    expect(row[1].text).toBe('1,470.000 OMR'); // numeric value untouched
  });

  it('shapes Arabic inside an inline runs array (font-pinned bilingual labels)', () => {
    const def = {
      text: [
        { text: 'Total', font: 'Roboto' },
        { text: ' | ', font: 'Roboto' },
        { text: 'الإجمالي', font: 'Tajawal' },
      ],
    };
    shapeDocDefinitionArabic(def, 'rtl');
    const runs = def.text as Array<{ text: string; font: string }>;
    expect(runs[0].text).toBe('Total');
    expect(runs[2].font).toBe('Tajawal'); // font pin preserved
    expect(PRESENTATION_FORMS.test(runs[2].text)).toBe(true); // Arabic run shaped
  });
});
