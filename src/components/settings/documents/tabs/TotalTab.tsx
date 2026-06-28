import React from 'react';
import { FieldGroup, ToggleRow, ColorField, SegmentedControl } from '../controls';
import { Input } from '../../../ui/Input';
import type { StudioApi } from '../TemplateStudio';
import type { TotalsLineKey } from '../../../../lib/pdf/templateConfig';

const humanize = (k: string): string =>
  k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

/** The lines a tenant can re-word (with the default wording as placeholder). */
const LABEL_KEYS: { key: TotalsLineKey; placeholder: string }[] = [
  { key: 'subtotal', placeholder: 'Subtotal:' },
  { key: 'discount', placeholder: 'Discount:' },
  { key: 'netAmount', placeholder: 'Net Amount:' },
  { key: 'tax', placeholder: 'VAT 5%:' },
  { key: 'total', placeholder: 'Total:' },
  { key: 'amountPaid', placeholder: 'Amount Paid:' },
  { key: 'balanceDue', placeholder: 'Balance Due:' },
];

const ROW_COLORS: { row: 'total' | 'balanceDue' | 'tax'; label: string; neutralBg: string; neutralText: string }[] = [
  { row: 'total', label: 'Total row', neutralBg: '#f8fafc', neutralText: '#162660' },
  { row: 'balanceDue', label: 'Balance Due row', neutralBg: '#ffffff', neutralText: '#1e293b' },
  { row: 'tax', label: 'Tax / VAT row', neutralBg: '#ffffff', neutralText: '#1e293b' },
];

export const TotalTab: React.FC<{ api: StudioApi }> = ({ api }) => {
  const totals = api.resolved.sections.find((s) => s.key === 'totals');
  const lines = totals?.lines;
  const t = api.resolved.totals ?? {};

  return (
    <div className="space-y-7">
      <FieldGroup title="Totals lines" description="Choose which summary lines appear under the table.">
        {!lines ? (
          <p className="text-sm text-slate-500">This document has no totals block.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(lines).map(([lineKey, on]) => (
              <ToggleRow
                key={lineKey}
                label={humanize(lineKey)}
                checked={on}
                onChange={(v) => api.setTotalsLine(lineKey, v)}
              />
            ))}
          </div>
        )}
        <p className="text-xs text-slate-500">
          "Amount in words" renders the grand total spelled out (English, plus Arabic in bilingual modes).
        </p>
      </FieldGroup>

      {lines && (
        <>
          <FieldGroup title="Style" description="How the totals block is presented — applies to every language combination.">
            <SegmentedControl
              label="Table style"
              value={t.style ?? 'plain'}
              onChange={(v) => api.setTotals({ style: v })}
              options={[
                { value: 'plain', label: 'Plain' },
                { value: 'bordered', label: 'Bordered' },
                { value: 'striped', label: 'Striped' },
              ]}
            />
            <ToggleRow
              label="Highlight the grand-total row"
              description="Tint the Total row so it stands out as the headline figure."
              checked={t.highlightTotal !== false}
              onChange={(v) => api.setTotals({ highlightTotal: v })}
            />
          </FieldGroup>

          <FieldGroup title="Label overrides" description="Rename any totals line. Leave blank to use the default wording (the secondary-language label keeps its default).">
            <div className="space-y-3">
              {LABEL_KEYS.map(({ key, placeholder }) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">{humanize(key)}</label>
                  <Input
                    value={t.labels?.[key] ?? ''}
                    placeholder={placeholder}
                    onChange={(e) => api.setTotalsLabel(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup title="Row colours" description="Optional background + text colour for the key rows. Leave blank to stay neutral.">
            <div className="space-y-4">
              {ROW_COLORS.map(({ row, label, neutralBg, neutralText }) => (
                <div key={row} className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">{label}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorField
                      label="Background"
                      value={t.rowColors?.[row]?.background}
                      neutral={neutralBg}
                      onChange={(hex) => api.setTotalsRowColor(row, { background: hex })}
                    />
                    <ColorField
                      label="Text"
                      value={t.rowColors?.[row]?.text}
                      neutral={neutralText}
                      against={t.rowColors?.[row]?.background ?? neutralBg}
                      onChange={(hex) => api.setTotalsRowColor(row, { text: hex })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </FieldGroup>
        </>
      )}
    </div>
  );
};
