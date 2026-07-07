/**
 * Legal-terms section — a consent / Terms-&-Conditions acknowledgement box for
 * intake (office_receipt / customer_copy) and checkout (checkout_form)
 * documents. The customer authorizes the lab to proceed, or acknowledges
 * checkout/T&C.
 *
 * Generalized from the acknowledgement boxes hand-written in
 * `documents/OfficeReceiptDocument.ts` (terms section, lines ~267-277),
 * `documents/CustomerCopyDocument.ts` (lines ~265-326), and
 * `documents/CheckoutFormDocument.ts` (lines ~278-334). It reuses the shared
 * `createTermsBox` helper, which already renders a bilingual EN/AR two-column
 * box (and an optional policy link) and right-aligns the Arabic column. Both the
 * title and the body are {@link LabelText}, so the Arabic strings come straight
 * from the adapter — never the hardcoded `null` the legacy single-language path
 * passed.
 *
 * Distinct from the financial `terms` section: that one drives the Payment-Terms
 * / Notes + bank two-column layout; this one is a single consent box keyed off
 * {@link EngineDocData.legalTerms}.
 */

import type { Column, Content } from 'pdfmake/interfaces';
import { PDF_COLORS, createTermsBox } from '../../styles';
import { resolvePresentation, resolveColors } from '../branding';
import { isBilingualMode, en, ar } from '../labels';
import type { EngineContext, EngineDocData, SectionRenderer } from '../types';

/** One open-terms column: bold heading + airy muted prose (+ policy link). */
function openTermsColumn(
  title: string,
  body: string,
  policyUrl: string | null,
  linkColor: string,
  rightAligned: boolean,
): Column {
  const alignment = rightAligned ? ('right' as const) : ('left' as const);
  const stack: Content[] = [
    { text: title, bold: true, fontSize: 10.5, color: PDF_COLORS.text, alignment, margin: [0, 0, 0, 5] },
    { text: body, fontSize: 8, color: PDF_COLORS.textLight, alignment, lineHeight: 1.45 },
  ];
  if (policyUrl) {
    stack.push({ text: policyUrl, fontSize: 8, color: linkColor, link: policyUrl, alignment, margin: [0, 4, 0, 0] });
  }
  return { stack, width: '*' };
}

export const renderLegalTerms: SectionRenderer = (
  engine: EngineContext,
  data: EngineDocData,
): Content | null => {
  const legal = data.legalTerms;
  if (!legal || !en(legal.body)) return null;

  const { language } = engine.config;
  const bilingual = isBilingualMode(language);
  const secondaryTitle = bilingual ? ar(legal.title, language) : null;
  const secondaryBody = bilingual ? ar(legal.body, language) : null;

  // Premium open finish: free-flowing two-column prose (EN left, secondary
  // right-aligned on the right) with no surrounding box — the reference look.
  if (resolvePresentation(engine.config).termsStyle === 'open') {
    const linkColor = resolveColors(engine.config).accent;
    const enColumn = openTermsColumn(
      en(legal.title, 'Terms & Conditions'),
      en(legal.body),
      legal.policyUrl ?? null,
      linkColor,
      false,
    );
    if (!secondaryBody) {
      return { stack: [enColumn], margin: [0, 6, 0, 6] } as Content;
    }
    const secondaryColumn = openTermsColumn(
      secondaryTitle ?? '',
      secondaryBody,
      legal.policyUrl ?? null,
      linkColor,
      true,
    );
    return {
      columns: [enColumn, { width: 22, text: '' }, secondaryColumn],
      margin: [0, 6, 0, 6],
    } as Content;
  }

  return createTermsBox(
    en(legal.title, 'Terms & Conditions'),
    secondaryTitle,
    en(legal.body),
    secondaryBody,
    legal.policyUrl ?? null,
  ) as Content;
};
