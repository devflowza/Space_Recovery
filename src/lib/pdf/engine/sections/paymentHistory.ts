/**
 * Payment-history section — a statement-style table of recorded payments:
 * date / document / method / reference / recorded-by / amount / running-balance.
 *
 * Generalized from `documents/InvoiceDocument.ts`'s `paymentHistorySection`
 * (lines ~321-368). The ADAPTER owns the decision to populate this (non-proforma
 * invoices with recorded payments) and pre-formats every cell — currency, dates,
 * fallbacks. This renderer only lays out the header + body, so it returns `null`
 * whenever there are no rows (proforma, or no payments yet).
 */

import type { Content, TableCell } from 'pdfmake/interfaces';
import { PDF_COLORS } from '../../styles';
import { resolveLabel } from '../labels';
import type { EngineContext, EngineDocData, SectionRenderer } from '../types';

export const renderPaymentHistory: SectionRenderer = (
  engine: EngineContext,
  data: EngineDocData,
): Content | null => {
  const history = data.paymentHistory;
  if (!history || history.rows.length === 0) return null;

  const { language } = engine.config;
  const { columns } = history;

  const headerRow: TableCell[] = [
    { text: resolveLabel(columns.date, language), fontSize: 8, bold: true, color: PDF_COLORS.textLight },
    { text: resolveLabel(columns.document, language), fontSize: 8, bold: true, color: PDF_COLORS.textLight },
    { text: resolveLabel(columns.method, language), fontSize: 8, bold: true, color: PDF_COLORS.textLight },
    { text: resolveLabel(columns.reference, language), fontSize: 8, bold: true, color: PDF_COLORS.textLight },
    { text: resolveLabel(columns.recordedBy, language), fontSize: 8, bold: true, color: PDF_COLORS.textLight },
    { text: resolveLabel(columns.amount, language), fontSize: 8, bold: true, color: PDF_COLORS.textLight, alignment: 'right' },
    { text: resolveLabel(columns.balance, language), fontSize: 8, bold: true, color: PDF_COLORS.textLight, alignment: 'right' },
  ];

  const body: TableCell[][] = [headerRow];
  for (const r of history.rows) {
    body.push([
      { text: r.date, fontSize: 8, color: PDF_COLORS.text },
      { text: r.document, fontSize: 8, color: PDF_COLORS.text },
      { text: r.method, fontSize: 8, color: PDF_COLORS.text },
      { text: r.reference, fontSize: 8, color: PDF_COLORS.text },
      { text: r.recordedBy, fontSize: 8, color: PDF_COLORS.text },
      { text: r.amount, fontSize: 8, color: PDF_COLORS.success, alignment: 'right' },
      { text: r.runningBalance, fontSize: 8, bold: true, color: PDF_COLORS.text, alignment: 'right' },
    ]);
  }

  return {
    margin: [0, 10, 0, 0],
    stack: [
      {
        text: resolveLabel(history.title, language),
        fontSize: 10,
        bold: true,
        color: PDF_COLORS.text,
        margin: [0, 0, 0, 4],
      },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', '*', 'auto', 'auto', 'auto'],
          body,
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? PDF_COLORS.background : null),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => PDF_COLORS.border,
        },
      },
    ],
  };
};
