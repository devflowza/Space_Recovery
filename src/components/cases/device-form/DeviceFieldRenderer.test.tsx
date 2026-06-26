import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeviceFieldRenderer } from './DeviceFieldRenderer';
import type { DeviceFieldDef } from '../../../lib/devices/deviceFieldConfig';

const textDef: DeviceFieldDef = {
  key: 'pcb_number', labelKey: 'devices.field.pcb_number', labelFallback: 'PCB Number',
  control: 'text', storage: { table: 'case_devices', kind: 'column', column: 'pcb_number' },
};
const selectDef: DeviceFieldDef = {
  key: 'brand_id', labelKey: 'devices.field.brand_id', labelFallback: 'Brand',
  control: 'select', storage: { table: 'case_devices', kind: 'column', column: 'brand_id' }, optionsSource: 'brands',
};

const staticDef: DeviceFieldDef = {
  key: 'diagnostic_status', labelKey: 'devices.field.diagnostic_status', labelFallback: 'Diagnostic Status',
  control: 'select', storage: { table: 'device_diagnostics', kind: 'json', jsonKey: 'diagnostic_status' },
  staticOptions: [{ id: 'Pending', name: 'Pending' }, { id: 'Completed', name: 'Completed' }],
};

describe('DeviceFieldRenderer', () => {
  it('renders a text input with the fallback label and emits onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DeviceFieldRenderer def={textDef} value="" onChange={onChange} options={[]} />);
    const input = screen.getByLabelText(/PCB Number/i);
    await user.type(input, 'X');
    expect(onChange).toHaveBeenCalledWith('pcb_number', 'X');
  });

  it('renders a combobox for select fields', () => {
    render(<DeviceFieldRenderer def={selectDef} value="" onChange={vi.fn()}
      options={[{ id: '1', name: 'Seagate' }]} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('uses staticOptions for a select with no catalog options', () => {
    render(<DeviceFieldRenderer def={staticDef} value="" onChange={() => {}} options={[]} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
