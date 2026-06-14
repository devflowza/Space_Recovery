/**
 * Signature section — one or more signature lines laid out in a row. Reuses
 * `createSignatureBlock` from `styles.ts`. Labels come from
 * {@link EngineDocData.signatures}, resolved through the language mode.
 *
 * The section is opt-in (hidden by default on financial docs), so when a tenant
 * makes it visible we must always render at least one line — even for documents
 * whose adapter does not populate {@link EngineDocData.signatures} (e.g. the
 * invoice / quote adapters). A single "Authorized Signature" line is the default.
 */

import type { Content } from 'pdfmake/interfaces';
import { createSignatureBlock } from '../../styles';
import { resolveLabel } from '../labels';
import type { EngineContext, EngineDocData, LabelText, SectionRenderer } from '../types';

/** Default signature line when the document supplies none but the block is shown. */
const DEFAULT_SIGNATURES: LabelText[] = [{ en: 'Authorized Signature', ar: 'التوقيع المعتمد' }];

export const renderSignature: SectionRenderer = (
  engine: EngineContext,
  data: EngineDocData,
): Content | null => {
  const sigs = data.signatures && data.signatures.length > 0 ? data.signatures : DEFAULT_SIGNATURES;

  const { language } = engine.config;
  const blocks: object[] = sigs.map(
    (label) => createSignatureBlock(resolveLabel(label, language)) as object,
  );

  // Spread the blocks across the row with star spacers between them.
  const columns: object[] = [];
  blocks.forEach((b, i) => {
    columns.push(b);
    if (i < blocks.length - 1) columns.push({ text: '', width: '*' });
  });

  return { columns, margin: [0, 24, 0, 8] } as Content;
};
