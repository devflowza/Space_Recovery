/**
 * Browser Typst renderer: compile a Typst markup string to a PDF Blob via the
 * `typst.ts` WASM compiler. Lazy — the ~10 MB WASM and the fonts are fetched only
 * on first call (i.e. only when the Typst engine flag is on), so the default app
 * pays nothing. Mirrors the contract of `createPdfWithFonts(...).getBlob()`: the
 * caller gets a `Blob` it can object-URL into an iframe, hash, upload, or email —
 * the whole provability/delivery stack is unchanged.
 */
import { $typst, preloadRemoteFonts } from '@myriaddreamin/typst.ts';
import compilerWasmUrl from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';

/**
 * The brand + script fonts served from `public/fonts` (at `/fonts/*`). Tajawal +
 * Noto Sans Arabic cover Arabic; Noto Sans Thai covers Thai; Roboto covers
 * Latin/Cyrillic. Noto Sans KR (Korean) is added in a later phase (large asset).
 */
const FONT_URLS = [
  '/fonts/Tajawal-Regular.ttf',
  '/fonts/Tajawal-Bold.ttf',
  '/fonts/notosansarabic-regular.ttf',
  '/fonts/notosansarabic-bold.ttf',
  '/fonts/NotoSansThai.ttf',
  '/fonts/Roboto-Regular.ttf',
  '/fonts/Roboto-Bold.ttf',
];

let initialized = false;

/** Configure the compiler (WASM module + preloaded fonts) once, before first use. */
function ensureInit(): void {
  if (initialized) return;
  $typst.setCompilerInitOptions({
    getModule: () => compilerWasmUrl,
    beforeBuild: [preloadRemoteFonts(FONT_URLS)],
  });
  initialized = true;
}

/** Compile Typst markup to a PDF Blob (lazy WASM init on first call). */
export async function renderTypstPdf(markup: string): Promise<Blob> {
  ensureInit();
  const bytes = await $typst.pdf({ mainContent: markup });
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
