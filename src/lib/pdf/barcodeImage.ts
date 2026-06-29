/**
 * Code128 barcode image generation for pdfmake labels (browser path).
 *
 * pdfmake's native QR/barcode support doesn't render reliably in the browser
 * build this app ships (same constraint as qrImage.ts). This module renders a
 * Code128 barcode via bwip-js into an off-screen <canvas> and exports a PNG
 * data URL that pdfmake can embed as an { image } node.
 *
 * Generation is async (and DOM-dependent), so callers must resolve the image
 * BEFORE the synchronous pdfmake engine renders, passing it in as a
 * pre-generated base64 string (same pattern as qrImage.ts).
 *
 * bwip-js v4 browser build resolves to dist/bwip-js.mjs via the package
 * "browser" exports condition, which is what Vite picks up for client code.
 */

interface BarcodeOptions {
  /** bwip-js rendering scale — higher = more pixels, crisper when scaled down. Default 2. */
  scale?: number;
  /** Bar height in mm (bwip-js default units). Default 8. */
  height?: number;
}

/** A PNG data URL for the barcode value, or null when the value is empty,
 *  the DOM is unavailable, or encoding fails. */
export async function generateCode128DataUrl(
  value: string | null | undefined,
  opts?: BarcodeOptions,
): Promise<string | null> {
  if (!value) return null;
  if (typeof document === 'undefined') return null;

  try {
    const bwipjs = (await import('bwip-js')).default;

    const canvas = document.createElement('canvas');
    bwipjs.toCanvas(canvas, {
      bcid: 'code128',
      text: value,
      scale: opts?.scale ?? 2,
      height: opts?.height ?? 8,
      includetext: false,
    });

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
