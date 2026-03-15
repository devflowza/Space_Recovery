const FONT_FETCH_TIMEOUT = 8000;
const MIN_FONT_SIZE = 1024;

export interface FontFile {
  name: string;
  base64: string;
}

export interface FontLoadResult {
  success: boolean;
  fonts?: FontFile[];
  error?: string;
  source?: 'local' | 'cdn' | 'failed';
}

export type FontFamily = 'roboto' | 'tajawal' | 'arabic' | 'korean' | 'thai' | 'japanese' | 'chinese';

async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function validateTTFFont(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < MIN_FONT_SIZE) {
    console.warn('[Font Loader] Font file too small:', buffer.byteLength, 'bytes');
    return false;
  }

  const view = new DataView(buffer);
  const magic = view.getUint32(0, false);

  const validMagics = [
    0x00010000,
    0x74727565,
    0x4F54544F,
  ];

  const isValid = validMagics.includes(magic);

  if (!isValid) {
    console.warn('[Font Loader] Invalid TTF magic bytes:', magic.toString(16));
  }

  return isValid;
}

async function loadFontFromURL(url: string, fontName: string): Promise<FontFile | null> {
  try {
    console.log(`[Font Loader] Fetching font from: ${url}`);
    const response = await fetchWithTimeout(url, FONT_FETCH_TIMEOUT);

    if (!response.ok) {
      console.error(`[Font Loader] Failed to fetch ${fontName}: HTTP ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();

    if (!validateTTFFont(arrayBuffer)) {
      console.error(`[Font Loader] Invalid font file: ${fontName}`);
      return null;
    }

    const base64 = await arrayBufferToBase64(arrayBuffer);
    console.log(`[Font Loader] ✓ Loaded ${fontName} (${arrayBuffer.byteLength} bytes)`);

    return { name: fontName, base64 };
  } catch (error) {
    console.error(`[Font Loader] Error loading ${fontName}:`, error);
    return null;
  }
}

export async function loadRobotoFontsFromLocal(): Promise<FontLoadResult> {
  console.log('[Font Loader] Loading Roboto fonts from local files...');

  try {
    const [regularFont, boldFont, italicFont, boldItalicFont] = await Promise.all([
      loadFontFromURL('/fonts/Roboto-Regular.ttf', 'Roboto-Regular.ttf'),
      loadFontFromURL('/fonts/Roboto-Bold.ttf', 'Roboto-Bold.ttf'),
      loadFontFromURL('/fonts/Roboto-Italic.ttf', 'Roboto-Italic.ttf'),
      loadFontFromURL('/fonts/Roboto-BoldItalic.ttf', 'Roboto-BoldItalic.ttf'),
    ]);

    if (!regularFont || !boldFont || !italicFont || !boldItalicFont) {
      console.warn('[Font Loader] Failed to load local Roboto fonts');
      return { success: false, error: 'Failed to load local Roboto fonts', source: 'failed' };
    }

    return {
      success: true,
      fonts: [regularFont, boldFont, italicFont, boldItalicFont],
      source: 'local',
    };
  } catch (error) {
    console.error('[Font Loader] Error loading local Roboto fonts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'failed',
    };
  }
}

export async function loadTajawalFontsFromLocal(): Promise<FontLoadResult> {
  console.log('[Font Loader] Loading Tajawal fonts from local files...');

  try {
    const [regularFont, boldFont] = await Promise.all([
      loadFontFromURL('/fonts/Tajawal-Regular.ttf', 'Tajawal-Regular.ttf'),
      loadFontFromURL('/fonts/Tajawal-Bold.ttf', 'Tajawal-Bold.ttf'),
    ]);

    if (!regularFont || !boldFont) {
      console.warn('[Font Loader] Failed to load local Tajawal fonts');
      return { success: false, error: 'Failed to load local Tajawal fonts', source: 'failed' };
    }

    return {
      success: true,
      fonts: [regularFont, boldFont],
      source: 'local',
    };
  } catch (error) {
    console.error('[Font Loader] Error loading local Tajawal fonts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'failed',
    };
  }
}

export async function loadTajawalFontsFromCDN(): Promise<FontLoadResult> {
  console.log('[Font Loader] Loading Tajawal fonts from CDN...');

  const CDN_BASE = 'https://github.com/googlefonts/tajawal/raw/master/fonts/ttf';

  try {
    const [regularFont, boldFont] = await Promise.all([
      loadFontFromURL(
        `${CDN_BASE}/Tajawal-Regular.ttf`,
        'Tajawal-Regular.ttf'
      ),
      loadFontFromURL(
        `${CDN_BASE}/Tajawal-Bold.ttf`,
        'Tajawal-Bold.ttf'
      ),
    ]);

    if (!regularFont || !boldFont) {
      console.warn('[Font Loader] Failed to load Tajawal fonts from CDN');
      return { success: false, error: 'Failed to load CDN fonts', source: 'failed' };
    }

    return {
      success: true,
      fonts: [regularFont, boldFont],
      source: 'cdn',
    };
  } catch (error) {
    console.error('[Font Loader] Error loading Tajawal fonts from CDN:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'failed',
    };
  }
}

export async function loadTajawalFonts(): Promise<FontLoadResult> {
  let result = await loadTajawalFontsFromLocal();

  if (!result.success) {
    console.log('[Font Loader] Falling back to CDN...');
    result = await loadTajawalFontsFromCDN();
  }

  if (result.success) {
    console.log(`[Font Loader] ✓ Tajawal fonts loaded from ${result.source}`);
  } else {
    console.error('[Font Loader] ✗ All Tajawal font loading attempts failed');
  }

  return result;
}

export async function loadArabicFontsFromLocal(): Promise<FontLoadResult> {
  console.log('[Font Loader] Loading Arabic fonts from local files...');

  try {
    const [regularFont, boldFont] = await Promise.all([
      loadFontFromURL('/fonts/notosansarabic-regular.ttf', 'NotoSansArabic-Regular.ttf'),
      loadFontFromURL('/fonts/notosansarabic-bold.ttf', 'NotoSansArabic-Bold.ttf'),
    ]);

    if (!regularFont || !boldFont) {
      console.warn('[Font Loader] Failed to load local Arabic fonts');
      return { success: false, error: 'Failed to load local fonts', source: 'failed' };
    }

    return {
      success: true,
      fonts: [regularFont, boldFont],
      source: 'local',
    };
  } catch (error) {
    console.error('[Font Loader] Error loading local fonts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'failed',
    };
  }
}

export async function loadArabicFontsFromCDN(): Promise<FontLoadResult> {
  console.log('[Font Loader] Loading Arabic fonts from CDN...');

  const CDN_BASE = 'https://fonts.gstatic.com/s/notosansarabic/v18';

  try {
    const [regularFont, boldFont] = await Promise.all([
      loadFontFromURL(
        `${CDN_BASE}/Noto_Sans_Arabic-Regular.ttf`,
        'NotoSansArabic-Regular.ttf'
      ),
      loadFontFromURL(
        `${CDN_BASE}/Noto_Sans_Arabic-Bold.ttf`,
        'NotoSansArabic-Bold.ttf'
      ),
    ]);

    if (!regularFont || !boldFont) {
      console.warn('[Font Loader] Failed to load Arabic fonts from CDN');
      return { success: false, error: 'Failed to load CDN fonts', source: 'failed' };
    }

    return {
      success: true,
      fonts: [regularFont, boldFont],
      source: 'cdn',
    };
  } catch (error) {
    console.error('[Font Loader] Error loading CDN fonts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'failed',
    };
  }
}

export async function loadArabicFonts(): Promise<FontLoadResult> {
  let result = await loadArabicFontsFromLocal();

  if (!result.success) {
    console.log('[Font Loader] Falling back to CDN...');
    result = await loadArabicFontsFromCDN();
  }

  if (result.success) {
    console.log(`[Font Loader] ✓ Arabic fonts loaded from ${result.source}`);
  } else {
    console.error('[Font Loader] ✗ All font loading attempts failed');
  }

  return result;
}

export async function loadKoreanFontsFromCDN(): Promise<FontLoadResult> {
  console.log('[Font Loader] Loading Korean fonts from CDN...');

  const CDN_BASE = 'https://fonts.gstatic.com/s/notosanskr/v36';

  try {
    const [regularFont, boldFont] = await Promise.all([
      loadFontFromURL(
        `${CDN_BASE}/Noto_Sans_KR-Regular.ttf`,
        'NotoSansKR-Regular.ttf'
      ),
      loadFontFromURL(
        `${CDN_BASE}/Noto_Sans_KR-Bold.ttf`,
        'NotoSansKR-Bold.ttf'
      ),
    ]);

    if (!regularFont || !boldFont) {
      console.warn('[Font Loader] Failed to load Korean fonts from CDN');
      return { success: false, error: 'Failed to load CDN fonts', source: 'failed' };
    }

    return {
      success: true,
      fonts: [regularFont, boldFont],
      source: 'cdn',
    };
  } catch (error) {
    console.error('[Font Loader] Error loading Korean fonts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'failed',
    };
  }
}

export async function loadThaiFontsFromCDN(): Promise<FontLoadResult> {
  console.log('[Font Loader] Loading Thai fonts from CDN...');

  const CDN_BASE = 'https://fonts.gstatic.com/s/notosansthai/v25';

  try {
    const [regularFont, boldFont] = await Promise.all([
      loadFontFromURL(
        `${CDN_BASE}/Noto_Sans_Thai-Regular.ttf`,
        'NotoSansThai-Regular.ttf'
      ),
      loadFontFromURL(
        `${CDN_BASE}/Noto_Sans_Thai-Bold.ttf`,
        'NotoSansThai-Bold.ttf'
      ),
    ]);

    if (!regularFont || !boldFont) {
      console.warn('[Font Loader] Failed to load Thai fonts from CDN');
      return { success: false, error: 'Failed to load CDN fonts', source: 'failed' };
    }

    return {
      success: true,
      fonts: [regularFont, boldFont],
      source: 'cdn',
    };
  } catch (error) {
    console.error('[Font Loader] Error loading Thai fonts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'failed',
    };
  }
}

export async function loadJapaneseFontsFromCDN(): Promise<FontLoadResult> {
  console.log('[Font Loader] Loading Japanese fonts from CDN...');

  const CDN_BASE = 'https://fonts.gstatic.com/s/notosansjp/v52';

  try {
    const [regularFont, boldFont] = await Promise.all([
      loadFontFromURL(
        `${CDN_BASE}/Noto_Sans_JP-Regular.ttf`,
        'NotoSansJP-Regular.ttf'
      ),
      loadFontFromURL(
        `${CDN_BASE}/Noto_Sans_JP-Bold.ttf`,
        'NotoSansJP-Bold.ttf'
      ),
    ]);

    if (!regularFont || !boldFont) {
      console.warn('[Font Loader] Failed to load Japanese fonts from CDN');
      return { success: false, error: 'Failed to load CDN fonts', source: 'failed' };
    }

    return {
      success: true,
      fonts: [regularFont, boldFont],
      source: 'cdn',
    };
  } catch (error) {
    console.error('[Font Loader] Error loading Japanese fonts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'failed',
    };
  }
}

export async function loadChineseFontsFromCDN(): Promise<FontLoadResult> {
  console.log('[Font Loader] Loading Chinese fonts from CDN...');

  const CDN_BASE = 'https://fonts.gstatic.com/s/notosanssc/v36';

  try {
    const [regularFont, boldFont] = await Promise.all([
      loadFontFromURL(
        `${CDN_BASE}/Noto_Sans_SC-Regular.ttf`,
        'NotoSansSC-Regular.ttf'
      ),
      loadFontFromURL(
        `${CDN_BASE}/Noto_Sans_SC-Bold.ttf`,
        'NotoSansSC-Bold.ttf'
      ),
    ]);

    if (!regularFont || !boldFont) {
      console.warn('[Font Loader] Failed to load Chinese fonts from CDN');
      return { success: false, error: 'Failed to load CDN fonts', source: 'failed' };
    }

    return {
      success: true,
      fonts: [regularFont, boldFont],
      source: 'cdn',
    };
  } catch (error) {
    console.error('[Font Loader] Error loading Chinese fonts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'failed',
    };
  }
}

export async function loadFontsByFamily(family: FontFamily): Promise<FontLoadResult> {
  switch (family) {
    case 'roboto':
      return loadRobotoFontsFromLocal();
    case 'tajawal':
      return loadTajawalFonts();
    case 'arabic':
      return loadArabicFonts();
    case 'korean':
      return loadKoreanFontsFromCDN();
    case 'thai':
      return loadThaiFontsFromCDN();
    case 'japanese':
      return loadJapaneseFontsFromCDN();
    case 'chinese':
      return loadChineseFontsFromCDN();
    default:
      return { success: false, error: `Unknown font family: ${family}`, source: 'failed' };
  }
}
