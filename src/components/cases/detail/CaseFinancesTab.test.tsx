import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ role: 'owner' as string }));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'u1', tenant_id: 't1', role: h.role } }),
}));

vi.mock('@/lib/caseFinanceService', () => ({
  getCaseExpenses: vi.fn(() => Promise.resolve([])),
  getCasePayments: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/lib/format', () => ({ formatDate: (v: string) => v }));
vi.mock('@/lib/quotesService', () => ({ toQuoteEditInitialData: (x: unknown) => x }));
vi.mock('@/lib/invoiceService', () => ({ toInvoiceEditInitialData: (x: unknown) => x }));

import { CaseFinancesTab } from './CaseFinancesTab';

const summary = {
  caseId: 'case-1',
  totalQuoted: 1050,
  totalInvoiced: 2100,
  totalPaid: 1600,
  totalExpenses: 0,
  outstandingBalance: 500,
  profitMargin: 100,
  quotesCount: 1,
  invoicesCount: 1,
  paymentsCount: 1,
  expensesCount: 0,
};

const quotes = [
  { id: 'q1', quote_number: 'QUOT-0045', status: 'draft', title: 'Data Recovery', total_amount: 1050, valid_until: '2026-07-21', created_at: '2026-06-21' },
];
const invoices = [
  { id: 'i1', invoice_number: 'INVO-0032', invoice_type: 'tax_invoice', status: 'partial', total_amount: 2100, amount_paid: 1600, balance_due: 500, due_date: '2026-06-21', created_at: '2026-06-21' },
];

const fmt = (n: number) => `${n.toFixed(3)} OMR`;

function renderTab(props: Partial<React.ComponentProps<typeof CaseFinancesTab>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CaseFinancesTab
          caseId="case-1"
          quotes={quotes}
          invoices={invoices}
          caseFinancialSummary={summary}
          formatCurrency={fmt}
          onSetShowQuoteModal={vi.fn()}
          onSetShowInvoiceModal={vi.fn()}
          onSetEditingQuote={vi.fn()}
          onSetEditingInvoice={vi.fn()}
          onSetViewingQuote={vi.fn()}
          onSetViewingInvoice={vi.fn()}
          onHandleRecordPayment={vi.fn()}
          onHandleIssueInvoice={vi.fn()}
          onSetConvertingInvoice={vi.fn()}
          onSetShowConvertProformaModal={vi.fn()}
          quotesService={{ fetchQuoteById: vi.fn() }}
          invoiceService={{ fetchInvoiceById: vi.fn() }}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CaseFinancesTab (redesign)', () => {
  beforeEach(() => { h.role = 'owner'; });

  it('renders the billing header, KPI values and the lifecycle stage', () => {
    renderTab();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    // "Quoted"/"Outstanding" appear in both the stepper and the KPI tiles
    expect(screen.getAllByText('Quoted').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Outstanding').length).toBeGreaterThan(0);
    // outstanding value appears (KPI + balance-due block)
    expect(screen.getAllByText('500.000 OMR').length).toBeGreaterThan(0);
    // current lifecycle stage for a partially-paid case
    expect(screen.getByText('Collecting payment')).toBeInTheDocument();
  });

  it('surfaces a Record Payment action for an issued invoice with a balance', () => {
    renderTab();
    // one in the summary balance-due block + one on the invoice card
    expect(screen.getAllByRole('button', { name: /record payment/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('shows the payment collection progress', () => {
    renderTab();
    expect(screen.getByText('Payment collection')).toBeInTheDocument();
    expect(screen.getByText(/76% collected/)).toBeInTheDocument();
  });

  it('shows the expenses/margin line only for owners & admins', () => {
    renderTab();
    expect(screen.getByText(/100\.0% margin/)).toBeInTheDocument();
  });

  it('hides the expenses/margin line for non-admin roles', () => {
    h.role = 'technician';
    renderTab();
    expect(screen.queryByText(/% margin/)).not.toBeInTheDocument();
  });
});
