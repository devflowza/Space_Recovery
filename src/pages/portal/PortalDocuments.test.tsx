import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../contexts/PortalAuthContext', () => ({ usePortalAuth: () => ({ customer: { id: 'cust1', customer_name: 'Jane' } }) }));
const svc = vi.hoisted(() => ({ fetchPortalDocuments: vi.fn(), getPortalDocumentPdfUrl: vi.fn(), portalSignOffDocument: vi.fn() }));
vi.mock('../../lib/portalDocumentService', () => svc);
vi.mock('../../components/cases/SignatureCaptureModal', () => ({
  SignatureCaptureModal: ({ open, onCapture }: { open: boolean; onCapture: (s: unknown) => void }) =>
    open ? <button onClick={() => onCapture({ method: 'click_to_accept' })}>mock-sign</button> : null,
}));

import { PortalDocuments } from './PortalDocuments';
const wrap = (ui: React.ReactElement) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>;

beforeEach(() => {
  vi.clearAllMocks();
  svc.fetchPortalDocuments.mockResolvedValue([
    { id: 'd1', title: 'Evaluation Report', document_number: 'REP-EVAL-0007', report_subtype: 'evaluation', status: 'delivered', pdf_storage_bucket: 'case-report-pdfs', pdf_storage_path: 't/r/d1/a.pdf', created_at: '2026-06-02T00:00:00Z' },
  ]);
  svc.getPortalDocumentPdfUrl.mockResolvedValue('https://signed/a.pdf');
  svc.portalSignOffDocument.mockResolvedValue('sig-1');
});

it('lists delivered documents and signs one off', async () => {
  render(wrap(<PortalDocuments />));
  await waitFor(() => expect(screen.getByText('Evaluation Report')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /sign off/i }));
  fireEvent.click(await screen.findByText('mock-sign'));
  await waitFor(() => expect(svc.portalSignOffDocument).toHaveBeenCalledWith('d1', expect.objectContaining({ method: 'click_to_accept' })));
});

it('shows an empty state when there are no documents', async () => {
  svc.fetchPortalDocuments.mockResolvedValue([]);
  render(wrap(<PortalDocuments />));
  await waitFor(() => expect(screen.getByText(/no documents/i)).toBeInTheDocument());
});
