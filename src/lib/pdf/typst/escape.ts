/**
 * Escape characters Typst treats as markup so arbitrary data (names, values,
 * labels) renders literally. We escape only the chars that are special ANYWHERE
 * in Typst content mode — `\\ # $ [ ] * _ \` < > @` — and leave `- . : , % /`
 * etc. untouched so dates, IBANs, percentages and currency render naturally.
 * Arabic/Thai/Korean and digits pass through unchanged.
 */
const SPECIAL = /[\\#$[\]*_`<>@]/g;

export function escapeTypst(s: string | null | undefined): string {
  return (s ?? '').replace(SPECIAL, (c) => `\\${c}`);
}
