/**
 * Open-card helpers — the premium "open" info-card finish (presentation group,
 * `infoCardStyle: 'open'`): a white card with a hairline border, an unfilled
 * header row (icon + English title left, secondary title right) separated from
 * the body by an inset hairline, and roomier label/value rows.
 *
 * This is the engine-side counterpart to `createBilingualInfoBox` (the legacy
 * `'band'` finish, which stays untouched in `styles.ts` because the legacy
 * builders also consume it). Sections branch here only when the resolved
 * presentation asks for the open finish, so parity output never changes.
 */

import type { Content, TableCell } from 'pdfmake/interfaces';
import { PDF_COLORS } from '../../styles';
import { safeString } from '../../utils';
import type { LanguageConfig } from '../../templateConfig';
import type { LabelText } from '../types';
import { resolveLabel } from '../labels';

/** Hairline used for the card border and the header/body divider. */
const CARD_LINE = 0.75;
const DIVIDER_LINE = 0.5;

/** The open-card table layout: hairline outer border + inset-feel divider. */
export function openCardLayout(): object {
  return {
    hLineWidth: (i: number) => (i === 1 ? DIVIDER_LINE : CARD_LINE),
    vLineWidth: () => CARD_LINE,
    hLineColor: () => PDF_COLORS.border,
    vLineColor: () => PDF_COLORS.border,
  };
}

/** The unfilled header columns: icon + EN title left, secondary title right. */
export function openCardHeaderColumns(
  titleEn: string,
  titleSecondary: string | null,
  iconSvg?: string,
): object {
  return {
    columns: [
      iconSvg ? { svg: iconSvg, width: 11, height: 11, margin: [0, 0.5, 0, 0] } : { text: '', width: 0 },
      // EN takes the leftover width (so it never wraps prematurely); the
      // secondary sizes to its content and sits on the trailing edge.
      { text: titleEn, bold: true, fontSize: 9.5, color: PDF_COLORS.text, width: '*' },
      titleSecondary
        ? { text: titleSecondary, bold: true, fontSize: 9.5, color: PDF_COLORS.text, alignment: 'right', width: 'auto' }
        : { text: '', width: 0 },
    ],
    columnGap: 5,
  };
}

/**
 * A complete open info card: header row, divider (via the layout's inner
 * hairline), and a stack of content rows.
 */
export function openInfoBox(
  titleEn: string,
  titleSecondary: string | null,
  content: object[],
  iconSvg?: string,
): Content {
  const headerCell = {
    ...openCardHeaderColumns(titleEn, titleSecondary, iconSvg),
    margin: [8, 7, 8, 5],
  };
  const contentCell = { stack: content, margin: [8, 6, 8, 7] };
  return {
    table: {
      widths: ['*'],
      body: [[headerCell], [contentCell]] as unknown as TableCell[][],
    },
    layout: openCardLayout(),
  } as Content;
}

/** A roomier label/value row for the open card body. */
export function openInfoRow(
  label: LabelText,
  value: string,
  language: LanguageConfig,
  labelWidth: number,
): object {
  return {
    columns: [
      { text: resolveLabel(label, language), fontSize: 9, color: PDF_COLORS.textLight, width: labelWidth },
      { text: safeString(value), fontSize: 9, color: PDF_COLORS.text, width: '*' },
    ],
    margin: [0, 1.2, 0, 1.2],
  };
}
