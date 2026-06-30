// Ambient declaration for bwip-js. The package ships types only via conditional
// `exports` (browser/node/...) with no top-level `types` field, so the project's
// module resolution can't pick them up for a bare `import('bwip-js')`. We only use
// the browser `toCanvas` path (src/lib/pdf/barcodeImage.ts), so declare that here.
declare module 'bwip-js' {
  export interface BwipToCanvasOptions {
    /** Barcode type, e.g. 'code128'. */
    bcid: string;
    /** The value to encode. */
    text: string;
    scale?: number;
    scaleX?: number;
    scaleY?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
    textxalign?: string;
    backgroundcolor?: string;
    paddingwidth?: number;
    paddingheight?: number;
    [key: string]: unknown;
  }

  interface BwipJs {
    /** Render a barcode into the given canvas (or canvas id) and return it. */
    toCanvas(canvas: HTMLCanvasElement | string, opts: BwipToCanvasOptions): HTMLCanvasElement;
  }

  const bwipjs: BwipJs;
  export default bwipjs;
}
