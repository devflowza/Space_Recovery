// Ambient declarations for the two RTL text libraries used by the PDF engine's
// Arabic shaping pass (src/lib/pdf/rtlShaping.ts). Neither ships TypeScript types.

declare module 'arabic-reshaper' {
  /** Reshape logical-order Arabic into Unicode presentation forms (joined glyphs). */
  export function convertArabic(text: string): string;
  /** Inverse of convertArabic — presentation forms back to base Arabic letters. */
  export function convertArabicBack(text: string): string;
  const _default: {
    convertArabic: typeof convertArabic;
    convertArabicBack: typeof convertArabicBack;
  };
  export default _default;
}

declare module 'bidi-js' {
  export interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }
  export interface Bidi {
    getEmbeddingLevels(text: string, baseDirection?: 'ltr' | 'rtl' | 'auto'): EmbeddingLevels;
    getReorderedString(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): string;
    getReorderedIndices(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): number[];
    getReorderSegments(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): number[][];
  }
  export default function bidiFactory(): Bidi;
}
