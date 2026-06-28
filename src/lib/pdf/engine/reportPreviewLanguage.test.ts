import { describe, it, expect } from 'vitest';
import { buildPreviewEngineData } from './sampleData';
import { resolveTemplateConfig, BUILT_IN_TEMPLATE_CONFIGS, type LanguageConfig } from '../templateConfig';

/**
 * Regression: the report SAMPLE preview must honour ANY of the 13 secondary
 * languages — not just Arabic. The preview's ctx used to map every non-Arabic
 * secondary to `null`, so an "English + Italian" (or French, …) report rendered
 * English-only. previewCtxFromConfig now routes through ctxFromLanguageConfig.
 */
function reportPreviewJSON(secondary: string | null): string {
  const config = resolveTemplateConfig(BUILT_IN_TEMPLATE_CONFIGS.report, undefined, {
    language: (secondary
      ? { mode: 'bilingual_sidebyside', primary: 'en', secondary }
      : { mode: 'en', primary: 'en' }) as LanguageConfig,
  });
  return JSON.stringify(buildPreviewEngineData('report', config));
}

describe('report sample preview — secondary language', () => {
  it('renders a non-Arabic secondary (Italian), not English-only', () => {
    const s = reportPreviewJSON('it');
    expect(s).toContain('Dispositivo'); // "Device"
    expect(s).toContain('Telefono'); // "Phone"
  });

  it('renders another non-Arabic secondary (French)', () => {
    expect(reportPreviewJSON('fr')).toContain('Téléphone'); // "Phone"
  });

  it('still renders Arabic', () => {
    expect(reportPreviewJSON('ar')).toMatch(/[؀-ۿ]/);
  });

  it('English-only emits no secondary translation', () => {
    expect(reportPreviewJSON(null)).not.toContain('Dispositivo');
  });
});
