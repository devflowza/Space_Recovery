type ClassValue = string | number | boolean | undefined | null | ClassValue[];

function toVal(mix: ClassValue): string {
  if (typeof mix === 'string' || typeof mix === 'number') return String(mix);
  if (!mix) return '';
  if (Array.isArray(mix)) return mix.map(toVal).filter(Boolean).join(' ');
  return '';
}

export function cn(...inputs: ClassValue[]): string {
  const raw = inputs.map(toVal).filter(Boolean).join(' ');
  const parts = raw.split(/\s+/);
  const seen = new Map<string, string>();

  for (const part of parts) {
    if (!part) continue;
    const dashIdx = part.lastIndexOf('-');
    const prefix = dashIdx > 0 ? part.slice(0, dashIdx) : part;
    seen.set(prefix, part);
  }

  return Array.from(seen.values()).join(' ');
}
