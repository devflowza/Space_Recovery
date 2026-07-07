// HSN (goods, 4/6/8 digits) and SAC (services, 6 digits, 99-prefix — same digit
// rule) FORMAT validation, and the Rec-20 → GSTN UQC mapping read from
// master_unit_codes. Digit-count-by-turnover policy (4 vs 6 mandatory digits) is
// enforced by the requirement rows + CA guidance, not here.

export function validateHsnSac(code: string): { ok: boolean; error: string | null } {
  const value = code.trim();
  if (/^\d{4}$/.test(value) || /^\d{6}$/.test(value) || /^\d{8}$/.test(value)) {
    return { ok: true, error: null };
  }
  return { ok: false, error: 'HSN/SAC must be 4, 6 or 8 digits' };
}

export function uqcForUnitCode(
  unitCode: string,
  units: Array<{ code: string; uqc_code: string | null }>,
): string {
  const match = units.find((u) => u.code === unitCode);
  return match?.uqc_code ?? 'OTH';
}
