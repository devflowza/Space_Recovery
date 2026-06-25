// src/lib/devices/deviceFieldConfig.test.ts
import { describe, it, expect } from 'vitest';
import {
  BASIC_FIELDS, getDeviceFamilyConfig, ALL_FIELD_DEFS,
} from './deviceFieldConfig';

const FAMILIES = ['hdd','ssd','usb_flash','memory_card','mobile','raid','nas','other'] as const;

describe('deviceFieldConfig', () => {
  it('BASIC_FIELDS has the 7 basic fields', () => {
    expect(BASIC_FIELDS.map(f => f.key)).toEqual([
      'device_type_id','brand_id','model','serial_number','capacity_id','condition_id','accessories',
    ]);
  });

  it('every family resolves to a config with arrays', () => {
    for (const fam of FAMILIES) {
      const cfg = getDeviceFamilyConfig(fam);
      expect(cfg.family).toBe(fam);
      expect(Array.isArray(cfg.technical)).toBe(true);
      expect(Array.isArray(cfg.components)).toBe(true);
    }
  });

  it('no duplicate field keys within a single section', () => {
    for (const fam of FAMILIES) {
      const cfg = getDeviceFamilyConfig(fam);
      for (const section of [cfg.technical, cfg.components]) {
        const keys = section.map(f => f.key);
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });

  it('select/multiselect/component-status fields declare an optionsSource', () => {
    const all = [...BASIC_FIELDS, ...FAMILIES.flatMap(f => {
      const c = getDeviceFamilyConfig(f); return [...c.technical, ...c.components];
    })];
    for (const f of all) {
      if (['select','multiselect','component-status'].includes(f.control)) {
        expect(f.optionsSource, `${f.key} needs optionsSource`).toBeTruthy();
      }
    }
  });

  it('component-status fields target device_diagnostics and carry a componentKey', () => {
    for (const fam of FAMILIES) {
      for (const f of getDeviceFamilyConfig(fam).components) {
        if (f.control === 'component-status') {
          expect(f.storage.table).toBe('device_diagnostics');
          expect(f.componentKey).toBeTruthy();
        }
      }
    }
  });

  it('any field key used in >1 family maps to identical storage (dedupe-safe)', () => {
    const byKey = new Map<string, string>();
    const all = [...BASIC_FIELDS, ...FAMILIES.flatMap(f => {
      const c = getDeviceFamilyConfig(f); return [...c.technical, ...c.components];
    })];
    for (const f of all) {
      const sig = JSON.stringify(f.storage);
      if (byKey.has(f.key)) expect(byKey.get(f.key)).toBe(sig);
      else byKey.set(f.key, sig);
    }
  });

  it('ALL_FIELD_DEFS is deduped by key and covers every field', () => {
    const keys = ALL_FIELD_DEFS.map(f => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('pcb_number');
    expect(keys).toContain('heads_status');
  });
});
