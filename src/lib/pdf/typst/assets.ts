/**
 * Convert a resolved logo ({@link BrandingImage}) into a Typst virtual-file
 * asset (path + bytes) the engine maps into the compiler via
 * `$typst.mapShadow(path, bytes)` so the markup can `#image("<path>")` it.
 * Typst infers the image format from the path extension, so the extension must
 * match the bytes. Unsupported raster formats (e.g. webp) return null — we skip
 * the logo rather than emit markup that fails to compile.
 */
import { classifyLogo, type BrandingImage } from '../brandingImage';

export interface TypstAsset {
  path: string;
  bytes: Uint8Array;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function logoAsset(input: string | BrandingImage | null | undefined): TypstAsset | null {
  const img = classifyLogo(input);
  if (img.kind === 'none') return null;
  if (img.kind === 'svg') {
    return { path: '/logo.svg', bytes: new TextEncoder().encode(img.markup) };
  }
  const m = /^data:(image\/[a-z+]+);base64,(.*)$/i.exec(img.dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const ext = mime.includes('png')
    ? 'png'
    : mime.includes('jpeg') || mime.includes('jpg')
      ? 'jpg'
      : mime.includes('gif')
        ? 'gif'
        : null;
  if (!ext) return null; // Typst can't decode it (e.g. webp) — skip the logo.
  return { path: `/logo.${ext}`, bytes: base64ToBytes(m[2]) };
}

/**
 * Convert a generated QR image (a base64 PNG data URL, as produced by
 * `resolveQrImage`) into a Typst asset. Returns null when absent or not a PNG
 * data URL so the QR section is simply skipped rather than failing to compile.
 */
export function qrAsset(dataUrl: string | null | undefined): TypstAsset | null {
  if (!dataUrl) return null;
  const m = /^data:image\/png;base64,(.*)$/i.exec(dataUrl);
  if (!m) return null;
  return { path: '/qr.png', bytes: base64ToBytes(m[1]) };
}
