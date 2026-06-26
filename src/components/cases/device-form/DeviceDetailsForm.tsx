// src/components/cases/device-form/DeviceDetailsForm.tsx
import type { ReactNode } from 'react';
import { DeviceFieldRenderer } from './DeviceFieldRenderer';
import { BASIC_FIELDS, getDeviceFamilyConfig } from '../../../lib/devices/deviceFieldConfig';
import { resolveDeviceFamily } from '../../../lib/devices/deviceFamily';
import type { CatalogOption } from '../../../lib/devices/deviceCatalogQueries';

interface Props {
  state: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  options: Record<string, CatalogOption[]>;
  errors?: Record<string, string>;
  extraFooter?: ReactNode;
}

export function DeviceDetailsForm({ state, onChange, options, errors, extraFooter }: Props) {
  const typeName = options.device_types?.find(o => o.id === state.device_type_id)?.name ?? '';
  const family = resolveDeviceFamily(typeName);
  const cfg = getDeviceFamilyConfig(family);
  const fields = [...BASIC_FIELDS, ...cfg.technical];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
        {fields.map(def => (
          <div key={def.key} className={def.colSpan === 2 ? 'lg:col-span-2' : undefined}>
            <DeviceFieldRenderer
              def={def}
              value={state[def.key]}
              onChange={onChange}
              options={def.optionsSource ? (options[def.optionsSource] ?? []) : []}
              error={errors?.[def.key]}
            />
          </div>
        ))}
      </div>
      {extraFooter}
    </div>
  );
}
