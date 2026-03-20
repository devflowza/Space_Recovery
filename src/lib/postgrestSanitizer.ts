const POSTGREST_CONTROL_CHARS = /[,.()"'\\]/g;

export function sanitizeFilterValue(value: string): string {
  return value.replace(POSTGREST_CONTROL_CHARS, '');
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
