/**
 * Info-box sections — the "parties" block (issuer / recipient) and the "meta"
 * block (document number, dates, job id, …).
 *
 * Generalized from the `infoBoxesSection` in `documents/InvoiceDocument.ts`
 * (lines ~124-167). Renders through `createBilingualInfoBox`, and — this is the
 * known null-Arabic-title fix — passes the REAL Arabic title from the config
 * label (`LabelText.ar`) when the language mode is bilingual, instead of the
 * `null` the hand-written builders hardcoded.
 */

import type { Content } from 'pdfmake/interfaces';
import { PDF_COLORS, createBilingualInfoBox } from '../../styles';
import { safeString } from '../../utils';
import { getGeneralIconSvg } from '../../../deviceIconMapper';
import type {
  EngineContext,
  EngineDocData,
  LabelText,
  PartyBlock,
  SectionRenderer,
} from '../types';
import { isBilingualMode, en, ar, resolveLabel } from '../labels';
import { engineLayoutDirection } from '../rtl';

function infoRow(
  label: LabelText,
  value: string,
  language: EngineContext['config']['language'],
  labelWidth: number,
): object {
  return {
    columns: [
      { text: resolveLabel(label, language), fontSize: 8, color: PDF_COLORS.textLight, width: labelWidth },
      { text: safeString(value), fontSize: 9, color: PDF_COLORS.text, width: '*' },
    ],
    margin: [0, 0, 0, 2],
  };
}

function partyBox(
  party: PartyBlock,
  engine: EngineContext,
  iconSvg: string,
): Content {
  const { language } = engine.config;
  const bilingual = isBilingualMode(language);
  const labelWidth = bilingual ? 150 : 90;

  const rows: object[] = [];
  if (party.name) {
    rows.push(infoRow({ en: 'Name:', ar: 'الاسم:' }, party.name, language, labelWidth));
  }
  for (const r of party.rows) {
    rows.push(infoRow(r.label, r.value, language, labelWidth));
  }

  // Pass the real Arabic title when bilingual; null collapses the AR column.
  return createBilingualInfoBox(
    en(party.title),
    bilingual ? ar(party.title) : null,
    rows,
    iconSvg,
  ) as Content;
}

/** Build the party info boxes (recipient first, then issuer). May be empty. */
function buildPartyBoxes(engine: EngineContext, data: EngineDocData): Content[] {
  const userIcon = getGeneralIconSvg('user');
  const fileIcon = getGeneralIconSvg('fileText');
  const boxes: Content[] = [];
  if (data.parties.to) boxes.push(partyBox(data.parties.to, engine, userIcon));
  if (data.parties.from) boxes.push(partyBox(data.parties.from, engine, fileIcon));
  return boxes;
}

/** Build the meta (document-details) info box, or null when there is nothing to show. */
function buildMetaBox(engine: EngineContext, data: EngineDocData): Content | null {
  if (!data.meta || data.meta.length === 0) return null;

  const { language } = engine.config;
  const bilingual = isBilingualMode(language);
  const labelWidth = bilingual ? 150 : 90;
  const fileIcon = getGeneralIconSvg('fileText');

  const rows: object[] = data.meta.map((m) => infoRow(m.label, m.value, language, labelWidth));

  // Title taken from a config label if the tenant set one ("meta"/"details"),
  // else a sensible bilingual default.
  const metaTitle: LabelText =
    engine.config.labels.meta ?? engine.config.labels.details ?? { en: 'Details', ar: 'التفاصيل' };

  return createBilingualInfoBox(
    en(metaTitle),
    bilingual ? ar(metaTitle) : null,
    rows,
    fileIcon,
  ) as Content;
}

/**
 * Parties section: issuer (`from`) and/or recipient (`to`) side by side. When
 * only one is present it spans full width; when both, they split 50/50.
 */
export const renderParties: SectionRenderer = (
  engine: EngineContext,
  data: EngineDocData,
): Content | null => {
  const boxes = buildPartyBoxes(engine, data);

  if (boxes.length === 0) return null;
  if (boxes.length === 1) {
    return { stack: [boxes[0]], margin: [0, 0, 0, 8] };
  }

  return {
    columns: [
      { width: '50%', stack: [boxes[0]] },
      { width: 8, text: '' },
      { width: '50%', stack: [boxes[1]] },
    ],
    margin: [0, 0, 0, 8],
  };
};

/**
 * Meta section: document-level key/value rows (doc number, dates, job id, …)
 * rendered as a single bilingual info box. Returns null when there is nothing
 * to show.
 */
export const renderMeta: SectionRenderer = (
  engine: EngineContext,
  data: EngineDocData,
): Content | null => {
  const box = buildMetaBox(engine, data);
  return box ? { stack: [box], margin: [0, 0, 0, 8] } : null;
};

/**
 * Combined parties + meta layout: the (single) customer/party box on one side
 * and the document-details box on the other, in two balanced columns — the
 * standard invoice/quote letterhead that fills the empty space beside a lone
 * customer block. Used by `renderTemplate` when `config.layout.partiesMetaSideBySide`
 * is on. Under RTL the columns mirror (customer on the right). Degrades to a
 * single full-width box when only one of the two is present.
 */
export function renderPartiesMeta(
  engine: EngineContext,
  data: EngineDocData,
): Content | null {
  const partyBoxes = buildPartyBoxes(engine, data);
  const metaBox = buildMetaBox(engine, data);

  const partyContent: Content | null =
    partyBoxes.length === 0 ? null : partyBoxes.length === 1 ? partyBoxes[0] : { stack: partyBoxes };

  if (!partyContent && !metaBox) return null;
  if (!partyContent) return { stack: [metaBox as Content], margin: [0, 0, 0, 8] };
  if (!metaBox) return { stack: [partyContent], margin: [0, 0, 0, 8] };

  const partyCol = { width: '50%', stack: [partyContent] };
  const metaCol = { width: '50%', stack: [metaBox] };
  const gap = { width: 8, text: '' };
  const rtl = engineLayoutDirection(engine.config.language) === 'rtl';

  return {
    columns: rtl ? [metaCol, gap, partyCol] : [partyCol, gap, metaCol],
    margin: [0, 0, 0, 8],
  };
}
