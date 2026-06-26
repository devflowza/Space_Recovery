// src/components/cases/device-form/DeviceDiagnosticForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeviceDiagnosticForm } from './DeviceDiagnosticForm';

const opts = { service_problems: [{ id: 'No power', name: 'No power' }] } as Record<string, { id: string; name: string }[]>;

describe('DeviceDiagnosticForm', () => {
  it('renders the diagnostic fields incl. Device Problem combobox and full-width Diagnostic Notes', () => {
    render(<DeviceDiagnosticForm state={{}} onChange={vi.fn()} options={opts} />);
    expect(screen.getByText('Device Problem')).toBeInTheDocument();
    expect(screen.getByText('Diagnostic Status')).toBeInTheDocument();
    expect(screen.getByText('Diagnostic Notes')).toBeInTheDocument();
  });

  it('does not render a device password field', () => {
    render(<DeviceDiagnosticForm state={{}} onChange={vi.fn()} options={opts} />);
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument();
  });
});
