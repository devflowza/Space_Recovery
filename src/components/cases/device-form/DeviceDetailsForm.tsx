// src/components/cases/device-form/DeviceDetailsForm.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HardDrive, Cpu, Stethoscope } from 'lucide-react';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { DeviceFieldRenderer } from './DeviceFieldRenderer';
import { BASIC_FIELDS, getDeviceFamilyConfig, type DeviceFieldDef } from '../../../lib/devices/deviceFieldConfig';
import { resolveDeviceFamily } from '../../../lib/devices/deviceFamily';
import type { CatalogOption } from '../../../lib/devices/deviceCatalogQueries';

interface Props {
  state: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  options: Record<string, CatalogOption[]>;
  errors?: Record<string, string>;
}

export function DeviceDetailsForm({ state, onChange, options, errors = {} }: Props) {
  const { t } = useTranslation();
  const [diagOpen, setDiagOpen] = useState(false);
  const typeName = options.device_types?.find(o => o.id === state.device_type_id)?.name ?? '';
  const family = resolveDeviceFamily(typeName);
  const cfg = getDeviceFamilyConfig(family);

  const grid = (fields: DeviceFieldDef[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map(def => (
        <div key={def.key} className={def.colSpan === 2 ? 'md:col-span-2' : undefined}>
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

  return (
    <div className="space-y-4">
      <CollapsibleSection
        title={t('devices.section.basic', { defaultValue: 'Basic Information' })}
        icon={HardDrive}
        color="rgb(var(--color-primary))"
        defaultOpen
        fieldCount={BASIC_FIELDS.length}
      >
        {grid(BASIC_FIELDS)}
      </CollapsibleSection>

      <CollapsibleSection
        title={t('devices.section.technical', { defaultValue: 'Technical Information' })}
        icon={Cpu}
        color="rgb(var(--color-info))"
        defaultOpen
        fieldCount={cfg.technical.length}
      >
        {cfg.technical.length ? grid(cfg.technical)
          : <p className="text-sm text-slate-500">{t('devices.section.noTechnical', { defaultValue: 'No technical fields for this device type.' })}</p>}
      </CollapsibleSection>

      {cfg.components.length > 0 && (
        <CollapsibleSection
          title={t('devices.section.diagnostics', { defaultValue: 'Component Diagnostics' })}
          icon={Stethoscope}
          color="rgb(var(--color-warning))"
          isOpen={diagOpen}
          onToggle={() => setDiagOpen(v => !v)}
          fieldCount={cfg.components.length}
        >
          {diagOpen ? grid(cfg.components) : null}
        </CollapsibleSection>
      )}
    </div>
  );
}
