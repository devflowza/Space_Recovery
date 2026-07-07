// src/pages/settings/TaxRegistrationSettings.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const svc = vi.hoisted(() => ({
  getPrimaryLegalEntity: vi.fn(),
  getActiveTaxRegistration: vi.fn(),
  createTaxRegistration: vi.fn(),
  endTaxRegistration: vi.fn(),
  getDeclaredRegistrationStatus: vi.fn(),
  setDeclaredRegistrationStatus: vi.fn(),
  getBranchStateMismatches: vi.fn(),
}));
vi.mock('../../lib/taxRegistrationService', () => svc);
vi.mock('../../lib/geoCountryService', () => ({
  geoCountryService: {
    listCountrySubdivisions: vi.fn().mockResolvedValue([
      { id: 's-ka', code: 'IN-KA', name: 'Karnataka', subdivision_type: 'state', tax_authority_code: '29' },
    ]),
  },
}));
vi.mock('../../lib/regimes/in_gst/gstin', () => ({
  validateGSTIN: vi.fn().mockReturnValue({ ok: true, error: null }),
}));
vi.mock('../../contexts/TenantConfigContext', () => ({
  useTaxConfig: () => ({
    system: 'GST', label: 'GST', numberLabel: 'GSTIN',
    numberFormat: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$',
    numberPlaceholder: '22AAAAA0000A1Z5', defaultRate: 18, invoiceRequired: true,
  }),
}));
vi.mock('../../components/layout/SettingsPageHeader', () => ({
  SettingsPageHeader: () => null,
}));
vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

import { TaxRegistrationSettings } from './TaxRegistrationSettings';

const registration = {
  id: 'r1', legal_entity_id: 'le1', country_id: 'c-in', subdivision_id: 's-ka',
  tax_number: '29ABCDE1234F1Z5', scheme: 'standard', registered_from: '2026-04-01',
  registered_to: null, is_primary: true, tenant_id: 't1', created_at: '', updated_at: null, deleted_at: null,
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}><TaxRegistrationSettings /></QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  Object.values(svc).forEach((m) => m.mockReset());
  svc.getPrimaryLegalEntity.mockResolvedValue({ id: 'le1', country_id: 'c-in' });
  svc.getBranchStateMismatches.mockResolvedValue([]);
});

describe('TaxRegistrationSettings', () => {
  it('registered tenant: shows the GSTIN and the Registered state', async () => {
    svc.getActiveTaxRegistration.mockResolvedValue(registration);
    svc.getDeclaredRegistrationStatus.mockResolvedValue('registered');
    renderPage();
    expect(await screen.findByText('29ABCDE1234F1Z5')).toBeInTheDocument();
    expect(screen.getByText(/^registered$/i)).toBeInTheDocument();
  });

  it('declared-unregistered tenant: renders the LOUD warning', async () => {
    svc.getActiveTaxRegistration.mockResolvedValue(null);
    svc.getDeclaredRegistrationStatus.mockResolvedValue('unregistered');
    renderPage();
    // Loud unregistered banner body (phrase unique to the banner — the form
    // footer note also contains "without GST", so target the banner directly).
    expect(await screen.findByText(/plain invoices, no tax lines/i)).toBeInTheDocument();
    expect(screen.getByText(/not gst registered/i)).toBeInTheDocument();
  });

  it('undeclared tenant: renders the action-required state (D6 — never silent)', async () => {
    svc.getActiveTaxRegistration.mockResolvedValue(null);
    svc.getDeclaredRegistrationStatus.mockResolvedValue(undefined);
    renderPage();
    expect(await screen.findByText(/registration status is not set/i)).toBeInTheDocument();
  });

  it('branch-state mismatch: renders the warning banner naming the branch', async () => {
    svc.getActiveTaxRegistration.mockResolvedValue(registration);
    svc.getDeclaredRegistrationStatus.mockResolvedValue('registered');
    svc.getBranchStateMismatches.mockResolvedValue([
      { branchId: 'b2', branchName: 'Mumbai Intake Desk', branchSubdivisionId: 's-mh' },
    ]);
    renderPage();
    expect(await screen.findByText(/Mumbai Intake Desk/)).toBeInTheDocument();
    expect(screen.getByText(/multi-state gstin management is not yet available/i)).toBeInTheDocument();
  });
});
