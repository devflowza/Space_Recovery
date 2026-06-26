// src/components/cases/device-form/DeviceDiagnosticForm.tsx
import { DeviceFieldRenderer } from './DeviceFieldRenderer';
import { DIAGNOSTIC_FIELDS } from '../../../lib/devices/deviceFieldConfig';
import type { CatalogOption } from '../../../lib/devices/deviceCatalogQueries';

interface Props {
  state: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  options: Record<string, CatalogOption[]>;
  errors?: Record<string, string>;
}

export function DeviceDiagnosticForm({ state, onChange, options, errors = {} }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
      {DIAGNOSTIC_FIELDS.map(def => (
        <div
          key={def.key}
          className={
            def.colSpan === 3 ? 'lg:col-span-3' :
            def.colSpan === 2 ? 'lg:col-span-2' :
            undefined
          }
        >
          <DeviceFieldRenderer
            def={def}
            value={state[def.key]}
            onChange={onChange}
            options={def.optionsSource ? (options[def.optionsSource] ?? []) : []}
            error={errors[def.key]}
          />
        </div>
      ))}
    </div>
  );
}
