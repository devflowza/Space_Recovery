import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeviceFormModal } from './DeviceFormModal';

// --- Mocks ------------------------------------------------------------------

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}));

vi.mock('../../lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'u1', tenant_id: 't1' } }),
}));

// Chainable Supabase stub: list queries resolve to [], maybeSingle() to null.
// The chain is thenable so awaited `.select().eq()...` works, and every method
// returns the chain so multi-filter calls don't break.
vi.mock('../../lib/supabaseClient', () => {
  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gt', 'is', 'order', 'limit', 'in']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
    return chain;
  };
  return {
    supabase: {
      from: vi.fn(() => makeChain()),
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  };
});

function renderModal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <DeviceFormModal isOpen onClose={vi.fn()} caseId="case-1" onSuccess={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('DeviceFormModal — add mode wiring', () => {
  it('mounts the structural controls and the dynamic per-family device form', async () => {
    renderModal();

    // Structural controls owned by the modal.
    expect(await screen.findByText('Add New Device to Case')).toBeInTheDocument();
    expect(screen.getByText('Device Role')).toBeInTheDocument();

    // The dynamic <DeviceDetailsForm> is wired in (Basic + Technical sections
    // render even before a device type is chosen).
    await waitFor(() => {
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });
    expect(screen.getByText('Technical Information')).toBeInTheDocument();

    // Save is gated until a device type is selected (device_type_id required for non-donor).
    expect(screen.getByRole('button', { name: /Add Device/i })).toBeDisabled();
  });
});
