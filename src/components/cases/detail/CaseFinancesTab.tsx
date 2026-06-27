import React from 'react';
import {
  FileText, DollarSign, Plus, Eye, CreditCard, RefreshCw, Lock, ExternalLink,
  TrendingUp, TrendingDown, Minus, Receipt, Wallet, Send, SquarePen as Edit,
  Check, Clock, AlertTriangle, Calendar, CheckCircle2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { getCaseExpenses, getCasePayments, type CaseExpense, type CasePayment, type CaseFinancialSummary } from '@/lib/caseFinanceService';
import { formatDate } from '@/lib/format';
import { toQuoteEditInitialData } from '@/lib/quotesService';
import { toInvoiceEditInitialData } from '@/lib/invoiceService';
import { useNavigate } from 'react-router-dom';

// Row shapes match the live DB schema (quotes / invoices tables) plus the
// currency_symbol/position/decimal_places fields injected by
// quotesService.getQuotesByCaseId() / invoiceService.getInvoicesByCaseId().
// Some legacy fields the UI references (title, converted_to_invoice_id,
// proforma_invoice_id) do not exist on the live invoices table — they are
// kept as optional so the existing guards short-circuit cleanly.
interface CaseQuoteRow {
  id: string;
  quote_number: string | null;
  status: string | null;
  title?: string | null;
  total_amount: number | null;
  valid_until: string | null;
  created_at: string;
  currency_symbol?: string;
  currency_position?: string;
  decimal_places?: number;
}

interface CaseInvoiceRow {
  id: string;
  invoice_number: string | null;
  invoice_type: string | null;
  status: string | null;
  total_amount: number | null;
  amount_paid: number | null;
  balance_due: number | null;
  due_date: string | null;
  created_at: string;
  converted_to_invoice_id?: string | null;
  proforma_invoice_id?: string | null;
  currency_symbol?: string;
  currency_position?: string;
  decimal_places?: number;
}

interface QuoteServiceLike {
  fetchQuoteById: (id: string) => Promise<unknown>;
}

interface InvoiceServiceLike {
  fetchInvoiceById: (id: string) => Promise<unknown>;
}

interface CaseFinancesTabProps {
  caseId: string;
  quotes: CaseQuoteRow[];
  invoices: CaseInvoiceRow[];
  caseFinancialSummary: CaseFinancialSummary | null | undefined;
  formatCurrency: (amount: number) => string;
  onSetShowQuoteModal: (v: boolean) => void;
  onSetShowInvoiceModal: (v: boolean) => void;
  onSetEditingQuote: (q: unknown) => void;
  onSetEditingInvoice: (inv: unknown) => void;
  onSetViewingQuote: (q: unknown) => void;
  onSetViewingInvoice: (inv: unknown) => void;
  onHandleRecordPayment: (invoice: CaseInvoiceRow) => void;
  onHandleIssueInvoice: (invoice: CaseInvoiceRow) => void;
  onSetConvertingInvoice: (inv: CaseInvoiceRow) => void;
  onSetShowConvertProformaModal: (v: boolean) => void;
  quotesService: QuoteServiceLike;
  invoiceService: InvoiceServiceLike;
}

const INFO_BTN = { backgroundColor: 'rgb(var(--color-info))', color: 'rgb(var(--color-info-foreground))' } as const;

// Status → muted pill classes. Semantic tokens only (no raw hex) so pills track
// the active theme and stay AA-legible (muted bg + solid same-hue ink).
function quotePill(status: string | null): { cls: string; label: string } {
  switch (status) {
    case 'accepted': return { cls: 'bg-success-muted text-success', label: 'Accepted' };
    case 'sent': return { cls: 'bg-info-muted text-info', label: 'Sent' };
    case 'rejected': return { cls: 'bg-danger-muted text-danger', label: 'Rejected' };
    case 'draft': return { cls: 'bg-slate-100 text-slate-600', label: 'Draft' };
    default: return { cls: 'bg-warning-muted text-warning', label: status ?? 'Unknown' };
  }
}

function invoicePill(status: string | null): { cls: string; label: string } {
  switch (status) {
    case 'paid': return { cls: 'bg-success-muted text-success', label: 'Paid' };
    case 'sent': return { cls: 'bg-info-muted text-info', label: 'Sent' };
    case 'partial': return { cls: 'bg-warning-muted text-warning', label: 'Partially paid' };
    case 'overdue': return { cls: 'bg-danger-muted text-danger', label: 'Overdue' };
    case 'converted': return { cls: 'bg-accent text-accent-foreground', label: 'Converted' };
    case 'void': return { cls: 'bg-slate-100 text-slate-500', label: 'Void' };
    case 'draft': return { cls: 'bg-slate-100 text-slate-600', label: 'Draft' };
    default: return { cls: 'bg-warning-muted text-warning', label: status ?? 'Unknown' };
  }
}

function validityChip(validUntil: string | null): { cls: string; label: string } | null {
  if (!validUntil) return null;
  const days = Math.ceil((new Date(validUntil).getTime() - Date.now()) / 86_400_000);
  if (Number.isNaN(days)) return null;
  if (days < 0) return { cls: 'bg-danger-muted text-danger', label: 'Expired' };
  if (days === 0) return { cls: 'bg-warning-muted text-warning', label: 'Expires today' };
  return { cls: 'bg-info-muted text-info', label: `${days} day${days === 1 ? '' : 's'} left` };
}

export const CaseFinancesTab: React.FC<CaseFinancesTabProps> = ({
  caseId,
  quotes,
  invoices,
  caseFinancialSummary,
  formatCurrency,
  onSetShowQuoteModal,
  onSetShowInvoiceModal,
  onSetEditingQuote,
  onSetEditingInvoice,
  onSetViewingQuote,
  onSetViewingInvoice,
  onHandleRecordPayment,
  onHandleIssueInvoice,
  onSetConvertingInvoice,
  onSetShowConvertProformaModal,
  quotesService,
  invoiceService,
}) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isOwnerAdmin = ['owner', 'admin'].includes(profile?.role ?? '');

  const { data: expenses = [] } = useQuery<CaseExpense[]>({
    queryKey: ['case_expenses', caseId],
    queryFn: () => getCaseExpenses(caseId),
    enabled: !!caseId,
  });

  const { data: payments = [] } = useQuery<CasePayment[]>({
    queryKey: ['case_payments', caseId],
    queryFn: () => getCasePayments(caseId),
    enabled: !!caseId,
  });

  const summary = caseFinancialSummary;
  const margin = summary?.profitMargin ?? 0;
  const marginColor = margin > 20 ? 'text-success' : margin >= 0 ? 'text-warning' : 'text-danger';
  const MarginIcon = margin > 20 ? TrendingUp : margin >= 0 ? Minus : TrendingDown;

  const invoiced = summary?.totalInvoiced ?? 0;
  const paid = summary?.totalPaid ?? 0;
  const outstanding = summary?.outstandingBalance ?? 0;
  const collectPct = invoiced > 0 ? Math.min(100, Math.round((paid / invoiced) * 100)) : 0;

  // Billing lifecycle stage: Quoted → Invoiced → Collecting → Settled.
  const settled = invoices.length > 0 && invoiced > 0 && outstanding <= 0 && paid > 0;
  const collecting = invoices.length > 0 && paid > 0 && outstanding > 0;
  const stage = settled ? 3 : collecting ? 2 : invoices.length > 0 ? 1 : quotes.length > 0 ? 0 : -1;
  const steps = ['Quoted', 'Invoiced', 'Collecting payment', 'Settled'];

  // The invoice the summary-level "Record Payment" CTA targets — first issued tax
  // invoice that still carries a balance.
  const payableInvoice = invoices.find(
    (inv) => inv.invoice_type === 'tax_invoice'
      && inv.status !== 'draft' && inv.status !== 'paid' && inv.status !== 'void'
      && (inv.balance_due ?? 0) > 0,
  );

  const openNewQuote = () => { onSetEditingQuote(null); onSetShowQuoteModal(true); };
  const openNewInvoice = () => { onSetEditingInvoice(null); onSetShowInvoiceModal(true); };

  const viewQuote = async (id: string) => onSetViewingQuote(await quotesService.fetchQuoteById(id));
  const editQuote = async (id: string) => {
    const full = await quotesService.fetchQuoteById(id);
    onSetEditingQuote(full ? toQuoteEditInitialData(full as Record<string, unknown>) : null);
    onSetShowQuoteModal(true);
  };
  const viewInvoice = async (id: string) => onSetViewingInvoice(await invoiceService.fetchInvoiceById(id));
  const editInvoice = async (id: string) => {
    const full = await invoiceService.fetchInvoiceById(id);
    onSetEditingInvoice(full ? toInvoiceEditInitialData(full as Record<string, unknown>) : null);
    onSetShowInvoiceModal(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Billing</h2>
              <p className="mt-0.5 text-sm text-slate-500">Quote → Invoice → Payment lifecycle for this case</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={openNewQuote} variant="success" size="sm">
                <DollarSign className="mr-1.5 h-4 w-4" />
                New Quote
              </Button>
              <Button onClick={openNewInvoice} size="sm">
                <FileText className="mr-1.5 h-4 w-4" />
                New Invoice
              </Button>
            </div>
          </div>

          {summary && (
            <>
              {/* Billing lifecycle stepper */}
              {stage >= 0 && (
                <div className="mb-6 flex items-center">
                  {steps.map((label, i) => {
                    const done = i < stage || (i === stage && settled);
                    const current = i === stage && !settled;
                    return (
                      <React.Fragment key={label}>
                        <div
                          className={cn(
                            'flex items-center gap-2 text-xs font-semibold',
                            done ? 'text-success' : current ? 'text-warning' : 'text-slate-400',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-6 w-6 items-center justify-center rounded-full border',
                              done && 'border-success bg-success text-white',
                              current && 'border-warning bg-warning text-white ring-4 ring-warning-muted',
                              !done && !current && 'border-slate-200 bg-slate-100 text-slate-400',
                            )}
                          >
                            {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} />
                              : current ? <Clock className="h-3.5 w-3.5" />
                              : <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
                          </span>
                          <span className="hidden sm:inline">{label}</span>
                        </div>
                        {i < steps.length - 1 && (
                          <div className={cn('mx-2.5 h-0.5 min-w-[20px] flex-1 rounded', i < stage ? 'bg-success' : 'bg-slate-200')} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* KPI tiles */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-border bg-surface p-4">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <FileText className="h-4 w-4 text-slate-400" /> Quoted
                  </p>
                  <p className="mt-2 text-xl font-extrabold tabular-nums text-slate-900">{formatCurrency(summary.totalQuoted)}</p>
                  <p className="mt-1 text-xs text-slate-500">{summary.quotesCount} quote{summary.quotesCount === 1 ? '' : 's'}</p>
                </div>
                <div className="rounded-xl border border-info/20 bg-info-muted p-4">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-info">
                    <FileText className="h-4 w-4" /> Invoiced
                  </p>
                  <p className="mt-2 text-xl font-extrabold tabular-nums text-info">{formatCurrency(invoiced)}</p>
                  <p className="mt-1 text-xs text-info/80">{summary.invoicesCount} invoice{summary.invoicesCount === 1 ? '' : 's'}</p>
                </div>
                <div className="rounded-xl border border-success/25 bg-success-muted p-4">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-success">
                    <CheckCircle2 className="h-4 w-4" /> Received
                  </p>
                  <p className="mt-2 text-xl font-extrabold tabular-nums text-success">{formatCurrency(paid)}</p>
                  <p className="mt-1 text-xs text-success/80">{invoiced > 0 ? `${collectPct}% of invoiced` : '—'}</p>
                </div>
                <div className={cn(
                  'rounded-xl p-4',
                  outstanding > 0
                    ? 'border border-warning bg-warning-muted ring-1 ring-warning'
                    : 'border border-success/25 bg-success-muted',
                )}>
                  <p className={cn('flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide', outstanding > 0 ? 'text-warning' : 'text-success')}>
                    {outstanding > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} Outstanding
                  </p>
                  <p className={cn('mt-2 text-xl font-extrabold tabular-nums', outstanding > 0 ? 'text-warning' : 'text-success')}>{formatCurrency(outstanding)}</p>
                  <p className={cn('mt-1 text-xs', outstanding > 0 ? 'text-warning/80' : 'text-success/80')}>
                    {outstanding > 0 ? 'Due before data release' : 'Fully collected'}
                  </p>
                </div>
              </div>

              {/* Expenses / margin — owner & admin only */}
              {isOwnerAdmin && (
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-warning" /> Expenses
                    <b className="tabular-nums text-slate-700">{formatCurrency(summary.totalExpenses)}</b>
                  </span>
                  <span className={cn('inline-flex items-center gap-1.5 font-medium', marginColor)}>
                    <MarginIcon className="h-3.5 w-3.5" /> {margin.toFixed(1)}% margin
                  </span>
                  <span className="text-slate-400">· visible to owners & admins</span>
                </div>
              )}

              {/* Collection progress + Record Payment */}
              {invoiced > 0 && (
                <div className="mt-5 flex flex-col gap-5 border-t border-dashed border-border pt-5 md:flex-row md:items-center">
                  <div className="flex-1">
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-sm font-semibold text-slate-700">Payment collection</span>
                      <span className="text-sm font-bold tabular-nums text-success">{collectPct}% collected</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-warning-muted">
                      <div className="h-full rounded-full bg-success" style={{ width: `${collectPct}%` }} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                      <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: 'rgb(var(--color-success))' }} />Received <b className="tabular-nums text-slate-900">{formatCurrency(paid)}</b></span>
                      <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: 'rgb(var(--color-warning))' }} />Outstanding <b className="tabular-nums text-slate-900">{formatCurrency(outstanding)}</b></span>
                      <span>of <b className="tabular-nums text-slate-900">{formatCurrency(invoiced)}</b> invoiced</span>
                    </div>
                  </div>
                  {payableInvoice && outstanding > 0 && (
                    <div className="text-right md:border-l md:border-border md:pl-5">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-warning">Balance due</div>
                      <div className="my-1.5 text-xl font-extrabold tabular-nums text-warning">{formatCurrency(outstanding)}</div>
                      <Button variant="success" size="sm" onClick={() => onHandleRecordPayment(payableInvoice)}>
                        <CreditCard className="mr-1.5 h-4 w-4" /> Record Payment
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Quotes */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <FileText className="h-5 w-5 text-success" /> Quotes
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{quotes.length}</span>
                </h3>
                <button onClick={openNewQuote} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-slate-50 text-slate-600 hover:bg-slate-100" title="New quote" aria-label="New quote">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {quotes.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-success/30 bg-success-muted/40 py-12 text-center text-slate-500">
                  <DollarSign className="mx-auto mb-3 h-12 w-12 text-success/40" />
                  <p className="font-medium text-slate-600">No quotes generated yet.</p>
                  <p className="mt-1 text-sm text-slate-500">Create a quote using the button above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes.map((quote) => {
                    const pill = quotePill(quote.status);
                    const chip = validityChip(quote.valid_until);
                    const stripe = quote.status === 'accepted' ? 'bg-success'
                      : quote.status === 'sent' ? 'bg-info'
                      : quote.status === 'rejected' ? 'bg-danger'
                      : 'bg-slate-300';
                    return (
                      <div key={quote.id} className="relative overflow-hidden rounded-xl border border-border bg-surface p-4 pl-5 transition-all hover:shadow-md">
                        <span className={cn('absolute left-0 top-0 bottom-0 w-1', stripe)} aria-hidden />
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900">{quote.quote_number || 'Draft'}</div>
                            <div className="mt-1.5">
                              <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', pill.cls)}>{pill.label}</span>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-lg font-extrabold tabular-nums text-slate-900">{formatCurrency(quote.total_amount ?? 0)}</div>
                          </div>
                        </div>
                        {quote.title && <p className="mt-2 text-sm text-slate-600">{quote.title}</p>}
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Created {formatDate(quote.created_at)}</span>
                          {quote.valid_until && <span>· Valid until {formatDate(quote.valid_until)}</span>}
                          {chip && <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', chip.cls)}>{chip.label}</span>}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                          <Button variant="secondary" size="sm" onClick={() => viewQuote(quote.id)}><Eye className="mr-1.5 h-4 w-4" /> View</Button>
                          <Button variant="secondary" size="sm" onClick={() => editQuote(quote.id)}><Edit className="mr-1.5 h-4 w-4" /> Edit</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Invoices */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <FileText className="h-5 w-5 text-primary" /> Invoices
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{invoices.length}</span>
                </h3>
                <button onClick={openNewInvoice} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-slate-50 text-slate-600 hover:bg-slate-100" title="New invoice" aria-label="New invoice">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {invoices.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-info/30 bg-info-muted/40 py-12 text-center text-slate-500">
                  <FileText className="mx-auto mb-3 h-12 w-12 text-info/40" />
                  <p className="font-medium text-slate-600">No invoices created yet.</p>
                  <p className="mt-1 text-sm text-slate-500">Create an invoice using the button above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => {
                    const pill = invoicePill(invoice.status);
                    const isTax = invoice.invoice_type === 'tax_invoice';
                    const isProforma = invoice.invoice_type === 'proforma';
                    const total = invoice.total_amount ?? 0;
                    const amtPaid = invoice.amount_paid ?? 0;
                    const balance = invoice.balance_due ?? 0;
                    const pct = total > 0 ? Math.min(100, Math.round((amtPaid / total) * 100)) : 0;
                    const canIssue = isTax && invoice.status === 'draft';
                    const canPay = isTax && invoice.status !== 'draft' && invoice.status !== 'paid' && invoice.status !== 'void' && balance > 0;
                    const canConvert = isProforma && invoice.status !== 'converted';
                    const showProgress = isTax && total > 0 && invoice.status !== 'void';
                    const stripe = invoice.status === 'converted' ? 'bg-accent-foreground/40'
                      : invoice.status === 'void' ? 'bg-slate-300'
                      : balance <= 0 && amtPaid > 0 ? 'bg-success'
                      : invoice.status === 'overdue' ? 'bg-danger'
                      : invoice.status === 'draft' ? 'bg-slate-300'
                      : 'bg-warning';
                    return (
                      <div key={invoice.id} className="relative overflow-hidden rounded-xl border border-border bg-surface p-4 pl-5 transition-all hover:shadow-md">
                        <span className={cn('absolute left-0 top-0 bottom-0 w-1', stripe)} aria-hidden />
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900">{invoice.invoice_number || 'Draft'}</div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              {isProforma ? (
                                <Badge variant="accent" size="sm">Proforma</Badge>
                              ) : (
                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">Tax Invoice</span>
                              )}
                              <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', pill.cls)}>{pill.label}</span>
                              {invoice.status === 'converted' && invoice.converted_to_invoice_id && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${invoice.converted_to_invoice_id}`); }}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                                  title="View converted tax invoice"
                                >
                                  <ExternalLink className="h-3 w-3" /> View Tax Invoice
                                </button>
                              )}
                              {invoice.proforma_invoice_id && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${invoice.proforma_invoice_id}`); }}
                                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                                  title="View original proforma"
                                >
                                  From Proforma
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-lg font-extrabold tabular-nums text-slate-900">{formatCurrency(total)}</div>
                            <div className="text-xs text-slate-500">total</div>
                          </div>
                        </div>

                        {showProgress && (
                          <div className="mt-3">
                            <div className="h-2 overflow-hidden rounded-full bg-warning-muted">
                              <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs">
                              <span className="font-semibold text-success">{amtPaid > 0 ? `✓ Paid ${formatCurrency(amtPaid)}` : 'No payment yet'}</span>
                              {balance > 0
                                ? <span className="font-bold text-warning">Balance {formatCurrency(balance)}</span>
                                : (amtPaid > 0 && <span className="font-bold text-success">Paid in full</span>)}
                            </div>
                          </div>
                        )}

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Created {formatDate(invoice.created_at)}</span>
                          {invoice.due_date && <span>· Due {formatDate(invoice.due_date)}</span>}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                          {canPay && (
                            <Button variant="success" size="sm" onClick={() => onHandleRecordPayment(invoice)}>
                              <CreditCard className="mr-1.5 h-4 w-4" /> Record Payment
                            </Button>
                          )}
                          {canIssue && (
                            <Button variant="secondary" size="sm" style={INFO_BTN} onClick={() => onHandleIssueInvoice(invoice)} title="Issue invoice — enables payment recording">
                              <Send className="mr-1.5 h-4 w-4" /> Issue Invoice
                            </Button>
                          )}
                          {canConvert && (
                            <Button size="sm" onClick={() => { onSetConvertingInvoice(invoice); onSetShowConvertProformaModal(true); }}>
                              <RefreshCw className="mr-1.5 h-4 w-4" /> Convert to Tax Invoice
                            </Button>
                          )}
                          <Button variant="secondary" size="sm" onClick={() => viewInvoice(invoice.id)}><Eye className="mr-1.5 h-4 w-4" /> View</Button>
                          {invoice.status !== 'converted' && (
                            <Button variant="secondary" size="sm" onClick={() => editInvoice(invoice.id)}><Edit className="mr-1.5 h-4 w-4" /> Edit</Button>
                          )}
                          {isProforma && invoice.status === 'converted' && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400" title="Read-only (converted)">
                              <Lock className="h-4 w-4" /> Converted
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Payments History */}
      {payments.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
              <Wallet className="h-5 w-5 text-success" /> Payment History
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{payments.length}</span>
            </h3>
            <div className="space-y-2.5">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between rounded-xl border border-success/20 bg-success-muted/60 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success-muted text-success">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{payment.payment_number}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(payment.payment_date)}
                        {payment.payment_method?.name && ` · ${payment.payment_method.name}`}
                        {payment.invoice?.invoice_number && ` · ${payment.invoice.invoice_number}`}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-extrabold tabular-nums text-success">{formatCurrency(payment.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Expenses */}
      {expenses.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
              <Receipt className="h-5 w-5 text-warning" /> Case Expenses
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{expenses.length}</span>
            </h3>
            <div className="space-y-2.5">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between rounded-xl border border-warning/20 bg-warning-muted/60 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warning-muted text-warning">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{expense.description || expense.expense_number}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(expense.expense_date)}
                        {expense.category?.name && ` · ${expense.category.name}`}
                        {expense.vendor && ` · ${expense.vendor}`}
                        {expense.submitter?.full_name && ` · By ${expense.submitter.full_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold tabular-nums text-warning">{formatCurrency(expense.amount ?? 0)}</p>
                    <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold',
                      expense.status === 'paid' ? 'bg-success-muted text-success'
                        : expense.status === 'approved' ? 'bg-info-muted text-info'
                        : 'bg-slate-100 text-slate-600')}>
                      {expense.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
