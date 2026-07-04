// GCC 3-box return composer (OM/AE/SA/BH/KW/QA shape). Pure: no I/O, no Date
// timezone round-trips — all period math is YYYY-MM-DD string arithmetic on the
// tenant-local forDate (tenantToday output), which is what makes the east-of-UTC
// double-declaration class of bug (VATReturnModal.tsx:52) structurally impossible.
import { CountryConfigError } from '../../country/resolveCountryConfig';
import { roundMoney } from '../../financialMath';
import type { ReturnBoxLine, ReturnComposer } from '../types';

const pad2 = (n: number): string => String(n).padStart(2, '0');

export function taxPeriodsBetween(startYm: string, endYm: string): string[] {
  const [sy, sm] = startYm.split('-').map(Number);
  const [ey, em] = endYm.split('-').map(Number);
  const out: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${pad2(m)}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function lastDayOfMonth(y: number, m: number): number {
  // Date.UTC(y, m, 0) is the last day of month m (1-based) — no timezone involved.
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export const gccReturnComposer: ReturnComposer = {
  key: 'gcc_return',
  version: '1.0.0',

  periodBounds(filingFrequency, periodAnchor, forDate, timezone) {
    void timezone; // forDate is already tenant-local (tenantToday); no further shifting.
    if (periodAnchor.slice(3, 5) !== '01') {
      throw new CountryConfigError(
        `gcc_return requires a month-aligned period anchor (MM-01); got ${periodAnchor}`,
      );
    }
    const anchorMonth = Number(periodAnchor.slice(0, 2));
    const fy = Number(forDate.slice(0, 4));
    const fm = Number(forDate.slice(5, 7));
    const monthsPerPeriod = filingFrequency === 'monthly' ? 1 : filingFrequency === 'quarterly' ? 3 : 12;

    const anchorYear = fm < anchorMonth ? fy - 1 : fy;
    const elapsed = (fy - anchorYear) * 12 + (fm - anchorMonth);
    const startOffset = Math.floor(elapsed / monthsPerPeriod) * monthsPerPeriod;

    let sm = anchorMonth + startOffset;
    let sy = anchorYear + Math.floor((sm - 1) / 12);
    sm = ((sm - 1) % 12) + 1;

    let em = sm + monthsPerPeriod - 1;
    let ey = sy + Math.floor((em - 1) / 12);
    em = ((em - 1) % 12) + 1;

    return {
      periodStart: `${sy}-${pad2(sm)}-01`,
      periodEnd: `${ey}-${pad2(em)}-${pad2(lastDayOfMonth(ey, em))}`,
      taxPeriods: taxPeriodsBetween(`${sy}-${pad2(sm)}`, `${ey}-${pad2(em)}`),
    };
  },

  compose(input) {
    if (input.baseCurrency !== input.jurisdictionCurrency) {
      throw new CountryConfigError(
        `gcc_return: tenant base currency ${input.baseCurrency} does not match the jurisdiction filing currency ${input.jurisdictionCurrency} — a return cannot be filed from a mismatched base ledger`,
      );
    }
    let output = 0;
    let inputVat = 0;
    for (const r of input.ledgerRows) {
      const base = Number(r.vat_amount_base ?? 0);
      if (r.record_type === 'sale') output += base;
      else if (r.record_type === 'purchase') inputVat += base;
    }
    output = roundMoney(output, 4);
    inputVat = roundMoney(inputVat, 4);
    const boxes: ReturnBoxLine[] = [
      { boxCode: 'BOX_1_OUTPUT', boxLabel: 'Output VAT on sales', amountBase: output, sequence: 1 },
      { boxCode: 'BOX_2_INPUT', boxLabel: 'Recoverable input VAT on purchases', amountBase: inputVat, sequence: 2 },
      { boxCode: 'BOX_3_NET', boxLabel: 'Net VAT payable / (refundable)', amountBase: roundMoney(output - inputVat, 4), sequence: 3 },
    ];
    return {
      boxes,
      meta: { composer: 'gcc_return', recordCount: input.ledgerRows.length, taxPeriods: input.taxPeriods },
    };
  },
};
