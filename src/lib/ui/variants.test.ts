import { describe, it, expect } from 'vitest';
import { STATUS_TONE, STATUS_TONE_MUTED } from './variants';

describe('status tone maps', () => {
  it('maps each tone to semantic foreground token pairs', () => {
    expect(STATUS_TONE.success).toBe('bg-success text-success-foreground');
    expect(STATUS_TONE.danger).toBe('bg-danger text-danger-foreground');
    expect(STATUS_TONE.info).toBe('bg-info text-info-foreground');
  });

  it('exposes muted variants for status tones', () => {
    expect(STATUS_TONE_MUTED.warning).toBe('bg-warning-muted text-warning');
  });

  it('contains no banned raw palette colors or hex', () => {
    const all = [...Object.values(STATUS_TONE), ...Object.values(STATUS_TONE_MUTED)].join(' ');
    expect(all).not.toMatch(/purple|indigo|violet|cyan|#[0-9a-fA-F]{3,6}/);
  });
});
