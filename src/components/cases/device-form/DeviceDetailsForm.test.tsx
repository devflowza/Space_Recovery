// src/components/cases/device-form/DeviceDetailsForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeviceDetailsForm } from './DeviceDetailsForm';
import type { CatalogOption } from '../../../lib/devices/deviceCatalogQueries';

const SSD_ID = 'ssd-type-id';
const HDD_ID = 'hdd-type-id';
const options = {
  device_types: [{ id: SSD_ID, name: 'NVMe SSD' }, { id: HDD_ID, name: '3.5" HDD' }] as CatalogOption[],
  brands: [], capacities: [], conditions: [], accessories: [], encryption: [],
  interfaces: [], made_in: [], head_counts: [], platter_counts: [], component_statuses: [],
} as Record<string, CatalogOption[]>;

describe('DeviceDetailsForm', () => {
  it('shows SSD Controller and hides HDD-only Physical Head Map for an SSD type', () => {
    render(<DeviceDetailsForm state={{ device_type_id: SSD_ID }} onChange={vi.fn()} options={options} />);
    expect(screen.getByText('Controller')).toBeInTheDocument();
    expect(screen.queryByText('Physical Head Map')).not.toBeInTheDocument();
  });

  it('shows HDD-only Physical Head Map for an HDD type', () => {
    render(<DeviceDetailsForm state={{ device_type_id: HDD_ID }} onChange={vi.fn()} options={options} />);
    expect(screen.getByText('Physical Head Map')).toBeInTheDocument();
  });

  it('always shows the Basic section fields', () => {
    render(<DeviceDetailsForm state={{ device_type_id: '' }} onChange={vi.fn()} options={options} />);
    expect(screen.getByText(/Serial Number/i)).toBeInTheDocument();
  });
});
