import { describe, it, expect } from 'vitest';
import { SETTINGS_CATEGORIES, TABLE_LABELS } from './settingsCategories';

describe('Device & Media settings — interface catalog consolidation', () => {
  const deviceMedia = SETTINGS_CATEGORIES.find((c) => c.id === 'device-media')!;

  it('exposes catalog_interfaces and not catalog_device_interfaces', () => {
    expect(deviceMedia.tables).toContain('catalog_interfaces');
    expect(deviceMedia.tables).not.toContain('catalog_device_interfaces');
  });

  it('labels catalog_interfaces as "Interfaces" and has no catalog_device_interfaces label', () => {
    expect(TABLE_LABELS.catalog_interfaces).toBe('Interfaces');
    expect((TABLE_LABELS as Record<string, string>).catalog_device_interfaces).toBeUndefined();
  });
});
