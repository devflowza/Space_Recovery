import { useEffect, useId, useState, type ComponentType, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Cpu, Eye, EyeOff, Info, KeyRound, Package, Shield, Stethoscope, X } from 'lucide-react';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { DeviceRoleBadge } from '../../ui/DeviceRoleBadge';
import { AuditInfo } from '../../ui/AuditInfo';
import { supabase } from '../../../lib/supabaseClient';
import { cn } from '../../../lib/utils';
import { getDeviceIconComponent } from '@/lib/deviceIconMapper';
import { resolveDeviceFamily } from '../../../lib/devices/deviceFamily';
import { getDeviceFamilyConfig, type DeviceFieldDef } from '../../../lib/devices/deviceFieldConfig';
import { useDeviceFormCatalogs } from '../../../lib/devices/deviceCatalogQueries';
import type { CaseDeviceWithEmbeds } from './CaseDevicesTab';

interface DeviceDetailsModalProps {
  device: CaseDeviceWithEmbeds | null;
  /** Zero-based index within the device's group — rendered as "Device N". */
  deviceIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

// Per-role header tint — mirrors DeviceRoleBadge's tone mapping so the modal's
// hero band reads as the same role the card badge shows.
const ROLE_TINT: Record<string, string> = {
  patient: 'bg-info-muted',
  backup: 'bg-success-muted',
  donor: 'bg-warning-muted',
};

const EMPTY = '—';

function Field({ label, mono, children }: { label: string; mono?: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={cn('break-words text-sm text-slate-900', mono && 'font-mono text-xs')}>{children}</dd>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', tone)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

const GRID = 'grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2';

export function DeviceDetailsModal({ device, deviceIndex, isOpen, onClose }: DeviceDetailsModalProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const { options: catalogs } = useDeviceFormCatalogs();

  // Reset the password reveal whenever the modal is dismissed so a re-open never
  // leaks the previously-revealed secret.
  useEffect(() => {
    if (!isOpen) setShowPassword(false);
  }, [isOpen]);

  // The card embed omits technical columns (technical_details, pcb_number, …), so
  // fetch the full row to populate the Technical Details section. Identity fields
  // come from the already-resolved embed and render instantly.
  const { data: fullRow } = useQuery({
    queryKey: ['case_device_full', device?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_devices')
        .select('*')
        .eq('id', device!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Record<string, unknown> | null;
    },
    enabled: isOpen && !!device?.id,
    staleTime: 60_000,
  });

  if (!device) return null;

  const DeviceIcon = getDeviceIconComponent(device.device_type?.name);
  const family = resolveDeviceFamily(device.device_type?.name);
  // Encryption + interface are surfaced in the Identity grid, so drop them from
  // the family technical list to avoid showing either value twice.
  const technicalDefs = getDeviceFamilyConfig(family).technical.filter(
    (d) => d.key !== 'encryption_id' && d.key !== 'interface_id',
  );

  const resolveCatalog = (source: DeviceFieldDef['optionsSource'], raw: unknown): string =>
    (source && (catalogs[source] ?? []).find((o) => o.id === String(raw))?.name) || String(raw);

  const techValue = (def: DeviceFieldDef): string | null => {
    let raw: unknown;
    if (def.storage.kind === 'column') raw = fullRow?.[def.storage.column];
    else if (def.storage.kind === 'json') {
      const td = (fullRow?.technical_details ?? {}) as Record<string, unknown>;
      raw = td[def.storage.jsonKey];
    }
    if (raw == null || raw === '') return null;
    return def.optionsSource ? resolveCatalog(def.optionsSource, raw) : String(raw);
  };

  const technicalRows = technicalDefs
    .map((def) => ({ def, value: techValue(def) }))
    .filter((row): row is { def: DeviceFieldDef; value: string } => row.value !== null);

  const interfaceName =
    fullRow?.interface_id != null
      ? resolveCatalog('interfaces', fullRow.interface_id)
      : null;

  const accessoryNames = (device.accessories ?? []).map(
    (a) => (catalogs.accessories ?? []).find((o) => o.id === a)?.name ?? a,
  );

  const roleKey = device.device_role?.name?.toLowerCase() ?? '';
  const headerTint = ROLE_TINT[roleKey] ?? 'bg-surface-muted';

  const hasDiagnosis = !!(device.symptoms || device.notes || device.role_notes);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_12px_40px_rgba(15,23,42,0.18)]"
    >
      {/* Hero header — role-tinted band with the device icon tile */}
      <div className={cn('relative shrink-0 border-b border-border px-6 pb-5 pt-6', headerTint)}>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close', { defaultValue: 'Close' })}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-surface/70 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-start gap-4 pr-8">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm">
            <DeviceIcon className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className="text-lg font-bold tracking-tight text-slate-900">
                {t('devices.detail.deviceN', {
                  defaultValue: 'Device {{n}}: {{type}}',
                  n: deviceIndex + 1,
                  type: device.device_type?.name || t('devices.unknownType', { defaultValue: 'Unknown Device Type' }),
                })}
              </h2>
              {device.device_role && <DeviceRoleBadge role={device.device_role.name} size="sm" />}
              {device.is_primary && (
                <Badge variant="custom" color="rgb(var(--color-primary))" size="sm">
                  {t('devices.primary', { defaultValue: 'Primary' })}
                </Badge>
              )}
            </div>
            {(device.brand?.name || device.model) && (
              <p className="mt-0.5 truncate text-sm text-slate-600">
                {[device.brand?.name, device.model].filter(Boolean).join(' ')}
              </p>
            )}
            {device.serial_number && (
              <p className="mt-0.5 font-mono text-xs text-slate-500">S/N: {device.serial_number}</p>
            )}
          </div>
        </div>
      </div>

      {/* Scrolling body */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-surface-muted p-4">
        <Section icon={Info} title={t('devices.section.identity', { defaultValue: 'Identity & Specifications' })} tone="bg-info-muted text-info">
          <dl className={GRID}>
            <Field label={t('devices.field.device_type_id', { defaultValue: 'Device Type' })}>
              {device.device_type?.name || EMPTY}
            </Field>
            <Field label={t('devices.field.brand_id', { defaultValue: 'Brand' })}>{device.brand?.name || EMPTY}</Field>
            <Field label={t('devices.field.model', { defaultValue: 'Model' })}>{device.model || EMPTY}</Field>
            <Field label={t('devices.field.serial_number', { defaultValue: 'Serial Number' })} mono>
              {device.serial_number || EMPTY}
            </Field>
            <Field label={t('devices.field.capacity_id', { defaultValue: 'Capacity / Storage' })}>
              {device.capacity?.name || EMPTY}
            </Field>
            <Field label={t('devices.field.condition_id', { defaultValue: 'Condition' })}>
              {device.condition?.name || EMPTY}
            </Field>
            <Field label={t('devices.field.interface_id', { defaultValue: 'Interface' })}>{interfaceName || EMPTY}</Field>
            <Field label={t('devices.field.encryption_id', { defaultValue: 'Encryption' })}>
              {device.encryption_type?.name ? (
                <span className="inline-flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-danger" />
                  {device.encryption_type.name}
                </span>
              ) : (
                EMPTY
              )}
            </Field>
          </dl>
        </Section>

        {technicalRows.length > 0 && (
          <Section icon={Cpu} title={t('devices.section.technical', { defaultValue: 'Technical Information' })} tone="bg-warning-muted text-warning">
            <dl className={GRID}>
              {technicalRows.map(({ def, value }) => (
                <Field key={def.key} label={t(def.labelKey, { defaultValue: def.labelFallback })}>
                  {value}
                </Field>
              ))}
            </dl>
          </Section>
        )}

        {hasDiagnosis && (
          <Section icon={Stethoscope} title={t('devices.section.diagnosis', { defaultValue: 'Diagnosis & Requirements' })} tone="bg-accent text-accent-foreground">
            <div className="space-y-3">
              {device.symptoms && (
                <Field label={t('devices.field.device_problem', { defaultValue: 'Device Problem' })}>
                  <span className="leading-relaxed">{device.symptoms}</span>
                </Field>
              )}
              {device.notes && (
                <Field label={t('devices.field.recovery_requirements', { defaultValue: 'Recovery Requirements' })}>
                  <span className="leading-relaxed">{device.notes}</span>
                </Field>
              )}
              {device.role_notes && (
                <Field label={t('devices.field.role_notes', { defaultValue: 'Role Notes' })}>
                  <span className="leading-relaxed">{device.role_notes}</span>
                </Field>
              )}
            </div>
          </Section>
        )}

        {accessoryNames.length > 0 && (
          <Section icon={Package} title={t('devices.section.accessories', { defaultValue: 'Accessories' })} tone="bg-success-muted text-success">
            <div className="flex flex-wrap gap-2">
              {accessoryNames.map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className="inline-flex items-center rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-slate-700"
                >
                  {name}
                </span>
              ))}
            </div>
          </Section>
        )}

        {device.password && (
          <Section icon={KeyRound} title={t('devices.section.security', { defaultValue: 'Security' })} tone="bg-danger-muted text-danger">
            <dt className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t('devices.field.password', { defaultValue: 'Device Password' })}
            </dt>
            <div className="flex items-center gap-2">
              <form className="contents" onSubmit={(e) => e.preventDefault()}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={device.password}
                  readOnly
                  autoComplete="off"
                  aria-label={t('devices.field.password', { defaultValue: 'Device Password' })}
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs text-slate-900"
                />
              </form>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPassword((v) => !v)}
                className="!p-1.5"
                aria-label={
                  showPassword
                    ? t('common.hide', { defaultValue: 'Hide' })
                    : t('common.show', { defaultValue: 'Show' })
                }
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </Section>
        )}
      </div>

      {/* Footer — audit metadata + dismiss */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-6 py-3">
        <AuditInfo
          createdAt={device.created_at}
          createdByName={device.created_by_profile?.full_name ?? null}
          createdLabel={t('devices.detail.added', { defaultValue: 'Added' })}
        />
        <Button variant="secondary" size="md" onClick={onClose} className="h-10 rounded-[10px] px-5">
          {t('common.close', { defaultValue: 'Close' })}
        </Button>
      </div>
    </Dialog>
  );
}
