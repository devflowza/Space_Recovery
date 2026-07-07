// src/pages/auth/onboarding/steps/JurisdictionStep.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../../../lib/geoCountryService', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    geoCountryService: {
      ...(mod.geoCountryService as Record<string, unknown>),
      listCountrySubdivisions: vi.fn().mockResolvedValue([
        { id: 's-ka', code: 'IN-KA', name: 'Karnataka', subdivision_type: 'state', tax_authority_code: '29' },
        { id: 's-mh', code: 'IN-MH', name: 'Maharashtra', subdivision_type: 'state', tax_authority_code: '27' },
      ]),
    },
  };
});
// Checksum validity is S3's concern — stub it OK so this test isolates the
// L2 state-prefix cross-check.
vi.mock('../../../../lib/regimes/in_gst/gstin', () => ({
  validateGSTIN: vi.fn().mockReturnValue({ ok: true, error: null }),
}));

import { JurisdictionStep } from './JurisdictionStep';

const country = {
  id: 'c-in', code: 'IN', name: 'India', currency_code: 'INR', currency_symbol: '₹',
  is_active: true, language_code: 'en', tax_system: 'GST', tax_label: 'GST',
  tax_number_label: 'GSTIN',
  tax_number_format: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$',
  fiscal_year_start: '04-01', timezone: 'Asia/Kolkata',
};

const baseForm = {
  companyName: '', slug: '', countryId: 'c-in', baseCurrencyCode: 'INR', fullName: '', email: '',
  password: '', confirmPassword: '', emailVerified: false, uiLanguage: '', legalEntityType: 'llc',
  taxNumber: '27ABCDE1234F1Z5', subdivisionId: 's-ka', fiscalYearStart: '4',
  timezone: 'Asia/Kolkata', services: [], estimatedCases: '', planId: '',
};

describe('JurisdictionStep with GST subdivisions', () => {
  it('renders the state selector and flags a GSTIN/state prefix mismatch', async () => {
    render(<JurisdictionStep formData={baseForm} country={country} updateField={vi.fn()} />);
    expect(await screen.findByLabelText(/state \/ union territory/i)).toBeInTheDocument();
    // GSTIN prefix 27 (Maharashtra) vs selected Karnataka (29) → mismatch message
    expect(await screen.findByText(/does not match the selected state/i)).toBeInTheDocument();
  });

  it('shows no mismatch when the prefix matches the selected state', async () => {
    render(
      <JurisdictionStep
        formData={{ ...baseForm, taxNumber: '29ABCDE1234F1Z5' }}
        country={country}
        updateField={vi.fn()}
      />,
    );
    expect(await screen.findByLabelText(/state \/ union territory/i)).toBeInTheDocument();
    expect(screen.queryByText(/does not match the selected state/i)).toBeNull();
  });
});
