import { describe, it, expect } from 'vitest';
import { DOCUMENT_TRANSLATIONS, type LanguageCode } from '../../documentTranslations';

describe('i18n key parity vs Arabic reference', () => {
  it('every language has the full Arabic key set', () => {
    const ar = new Set(Object.keys(DOCUMENT_TRANSLATIONS.ar));
    const report: Record<string, { count: number; missing: string[] }> = {};
    for (const code of Object.keys(DOCUMENT_TRANSLATIONS) as LanguageCode[]) {
      if (code === 'ar') continue; // 'ar' is the reference set; DOCUMENT_TRANSLATIONS has no 'en' key
      const have = new Set(Object.keys(DOCUMENT_TRANSLATIONS[code]));
      const missing = [...ar].filter((k) => !have.has(k));
      report[code] = { count: missing.length, missing: missing.slice(0, 8) };
    }
    // eslint-disable-next-line no-console
    console.log('AR key count:', ar.size);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
    const broken = Object.entries(report).filter(([, v]) => v.count > 0);
    expect(broken.map(([c, v]) => `${c}:${v.count}`)).toEqual([]);
  });
});
