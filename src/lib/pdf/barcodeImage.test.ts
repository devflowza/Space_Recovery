// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for generateCode128DataUrl.
 *
 * bwip-js requires a real <canvas> element (HTMLCanvasElement.getContext),
 * which jsdom does not implement. We mock the entire 'bwip-js' module so
 * the test focuses on:
 *   1. Returning null for empty / nullish values (no DOM or bwip needed).
 *   2. Returning a data: URL on a valid value (mocked canvas path).
 */

const FAKE_DATA_URL = 'data:image/png;base64,FAKE==';

vi.mock('bwip-js', () => ({
  default: {
    toCanvas: vi.fn((_canvas: HTMLCanvasElement) => {
      // Simulate bwip-js writing to the canvas by attaching a stub toDataURL
      Object.defineProperty(_canvas, 'toDataURL', {
        value: () => FAKE_DATA_URL,
        configurable: true,
      });
    }),
  },
}));

describe('generateCode128DataUrl', () => {
  const createElement = document.createElement.bind(document);

  beforeEach(() => {
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const canvas = createElement('canvas') as HTMLCanvasElement;
        return canvas;
      }
      return createElement(tag);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null for empty string', async () => {
    const { generateCode128DataUrl } = await import('./barcodeImage');
    expect(await generateCode128DataUrl('')).toBeNull();
  });

  it('returns null for null', async () => {
    const { generateCode128DataUrl } = await import('./barcodeImage');
    expect(await generateCode128DataUrl(null)).toBeNull();
  });

  it('returns null for undefined', async () => {
    const { generateCode128DataUrl } = await import('./barcodeImage');
    expect(await generateCode128DataUrl(undefined)).toBeNull();
  });

  it('returns a data: URL for a non-empty value', async () => {
    const { generateCode128DataUrl } = await import('./barcodeImage');
    const result = await generateCode128DataUrl('BIG-0001');
    expect(result).toMatch(/^data:/);
  });
});
