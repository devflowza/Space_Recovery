import { describe, it, expect } from 'vitest';
import { logoAsset } from './assets';

describe('logoAsset', () => {
  it('converts a raster PNG data URL to a png asset with bytes', () => {
    const a = logoAsset('data:image/png;base64,iVBORw0KGgo=');
    expect(a).not.toBeNull();
    expect(a!.path).toBe('/logo.png');
    expect(a!.bytes.length).toBeGreaterThan(0);
  });

  it('converts a JPEG data URL to a jpg asset', () => {
    expect(logoAsset('data:image/jpeg;base64,/9j/4AAQ')!.path).toBe('/logo.jpg');
  });

  it('converts an svg BrandingImage to an svg asset', () => {
    const a = logoAsset({ kind: 'svg', markup: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    expect(a!.path).toBe('/logo.svg');
    expect(new TextDecoder().decode(a!.bytes)).toContain('<svg');
  });

  it('returns null for none / empty / Typst-unsupported formats', () => {
    expect(logoAsset(null)).toBeNull();
    expect(logoAsset({ kind: 'none', reason: 'empty' })).toBeNull();
    expect(logoAsset('data:image/webp;base64,AAAA')).toBeNull();
  });
});
