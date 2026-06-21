/**
 * Bank section — a COMPACT bank-account box.
 *
 * Field labels (Account Name, Account No., Bank, IBAN, SWIFT …) render
 * English-only: these are functional identifiers and a translated label only
 * adds clutter. The box HEADER stays bilingual on bilingual documents (English
 * left / Arabic right), matching the other info-boxes.
 *
 * `buildBankBox` is the shared builder, used both as the standalone, movable
 * `bank` section (this renderer) and inline within the terms section.
 */

import type { Content } from 'pdfmake/interfaces';
import { PDF_COLORS } from '../../styles';
import { safeString } from '../../utils';
import { isBilingualMode, en, ar } from '../labels';
import type { BankBlock, EngineContext, EngineDocData, SectionRenderer } from '../types';

/** The configured display style for the bank details (default `'boxed'`). The
 *  toggle lives on the movable `bank` section so the inline and standalone
 *  renders stay in sync. */
function bankDisplayStyle(engine: EngineContext): 'boxed' | 'inline' {
  const bankSection = engine.config.sections.find((s) => s.key === 'bank');
  return bankSection?.bankStyle === 'inline' ? 'inline' : 'boxed';
}

/**
 * A single compact line: `Bank Account: <name> | Account No: <n> | Bank: <b> …`.
 * The box title leads (so the account name needs no redundant "Account Name:"
 * label); every other present field keeps its label. Absent fields are omitted.
 */
function buildBankInline(bank: BankBlock): Content {
  const title = en(bank.title, 'Bank Account');
  const segments = bank.rows.map((r) => {
    const label = en(r.label);
    const value = safeString(r.value);
    return /account\s*name/i.test(label) ? value : `${label} ${value}`;
  });
  return {
    text: `${title}: ${segments.join('  |  ')}`,
    fontSize: 7,
    color: PDF_COLORS.text,
    margin: [0, 0, 0, 0],
  } as Content;
}

/** A compact bank-account box: bilingual header, English-only field labels. */
export function buildBankBox(bank: BankBlock, engine: EngineContext): Content {
  if (bankDisplayStyle(engine) === 'inline') return buildBankInline(bank);

  const { language } = engine.config;
  const bilingual = isBilingualMode(language);

  const headerColumns: object[] = [
    { text: en(bank.title, 'Bank Account'), fontSize: 8, bold: true, color: PDF_COLORS.text, width: 'auto' },
    { text: '', width: '*' },
  ];
  if (bilingual) {
    headerColumns.push({
      text: ar(bank.title) ?? 'تفاصيل البنك',
      fontSize: 8, bold: true, color: PDF_COLORS.text, alignment: 'right', width: 'auto',
    });
  }

  return {
    table: {
      widths: ['*'],
      body: [
        [{ columns: headerColumns, columnGap: 6, fillColor: PDF_COLORS.background, margin: [6, 3, 6, 3] }],
        [{
          stack: bank.rows.map((r) => ({
            text: `${en(r.label)} ${safeString(r.value)}`,
            fontSize: 7,
            color: PDF_COLORS.text,
            margin: [0, 0.5, 0, 0.5],
          })),
          margin: [6, 3, 6, 4],
        }],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => PDF_COLORS.border,
      vLineColor: () => PDF_COLORS.border,
    },
  } as Content;
}

export const renderBank: SectionRenderer = (
  engine: EngineContext,
  data: EngineDocData,
): Content | null => {
  const bank = data.bank;
  if (!bank || bank.rows.length === 0) return null;
  return { stack: [buildBankBox(bank, engine)], margin: [0, 8, 0, 0] as [number, number, number, number] };
};
