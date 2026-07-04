import { describe, it, expect, vi, beforeEach } from 'vitest';

const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('./supabaseClient', () => ({ supabase: { rpc, from } }));
vi.mock('./logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { duplicateCase, getNextCaseNumber } from './caseService';

function mockCasesInsert(newCase: Record<string, unknown>) {
  const chain: Record<string, unknown> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: newCase, error: null }));
  return chain;
}

const devicesStub = () => ({ insert: vi.fn(() => Promise.resolve({ error: null })) });

// getIntakeStatusForCreation() resolves the active intake statuses; the
// creation paths stamp the LAST one (Device Received) onto the new case.
function mockIntakeStatuses() {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() =>
    Promise.resolve({
      data: [
        { id: 'st-registered', name: 'Registered' },
        { id: 'st-received', name: 'Device Received' },
      ],
      error: null,
    }),
  );
  return chain;
}

function routeTables(casesChain: Record<string, unknown>) {
  return (table: string) => {
    if (table === 'cases') return casesChain;
    if (table === 'master_case_statuses') return mockIntakeStatuses();
    return devicesStub();
  };
}

describe('duplicateCase — case number sourcing', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it('reserves the next number from the canonical `case` scope (not the legacy `cases` wrapper)', async () => {
    rpc.mockResolvedValue({ data: 'C-0020', error: null });
    const casesChain = mockCasesInsert({ id: 'new-1', case_number: 'C-0020' });
    from.mockImplementation(routeTables(casesChain));

    const result = await duplicateCase(
      { customer_id: 'c1', priority: 'high', title: 'X' },
      [],
      { id: 'u1', tenantId: 't1' },
    );

    expect(rpc).toHaveBeenCalledWith('get_next_number', { p_scope: 'case' });
    expect(rpc).not.toHaveBeenCalledWith('get_next_case_number');
    expect(casesChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        case_number: 'C-0020',
        tenant_id: 't1',
        status: 'Device Received',
        status_id: 'st-received',
      }),
    );
    expect(result.case_number).toBe('C-0020');
  });

  it('reuses a pre-reserved case number when one is passed (no extra RPC)', async () => {
    const casesChain = mockCasesInsert({ id: 'new-2', case_number: 'C-0099' });
    from.mockImplementation(routeTables(casesChain));

    await duplicateCase({ customer_id: 'c1' }, [], { id: 'u1', tenantId: 't1' }, 'C-0099');

    expect(rpc).not.toHaveBeenCalled();
    expect(casesChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ case_number: 'C-0099' }),
    );
  });

  it('getNextCaseNumber() reads from get_next_number(case)', async () => {
    rpc.mockResolvedValue({ data: 'C-0021', error: null });
    await expect(getNextCaseNumber()).resolves.toBe('C-0021');
    expect(rpc).toHaveBeenCalledWith('get_next_number', { p_scope: 'case' });
  });
});
