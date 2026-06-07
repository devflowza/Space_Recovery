# Payment Workflow & Financial Document Experience — Design Spec

**Date:** 2026-06-07
**Status:** Draft for approval
**Decisions (locked):** Restricted-edit-after-lock · DB-derived `payment_status` · Phased (invoices first)

This spec covers the seven requested deliverables. Phase 1 = Invoices (View, PDF, Portal).
Phase 2 = roll the pattern to Quotes, Expenses, Purchase Orders, Receipts, future Credit Notes.

---

## 1. Root Cause Analysis (Issue 2 — Edit visibility)

Edit visibility is gated on a denormalized, free-text `invoices.status` string instead of
authoritative financial facts:

```
canEdit = ['draft','sent'].includes(status)   // InvoiceDetailPage:192, InvoicesListPage:692
```

Failure factors (all evidence-backed):

1. **Multiple writers, divergent vocabularies.** Canonical DB RPCs (`record_payment`,
   `create_receipt_with_allocations`, `void_payment`) emit `paid|partial|sent`; legacy
   `bankingService.allocatePaymentToInvoices` emits `partially-paid`; `invoiceService`
   legacy path emits `partial`. `invoiceStatus.ts` documents the split (`TODO(finance)`).
   A cron `process_time_based_events()` is an additional suspected writer (to audit).
2. **No DB CHECK constraint / no single source of truth** for `status`; it has been
   manually settable in some forms (Quotes today).
3. **Consumers disagree:** `canRecordPayment = ['sent','partial','overdue']`, so an invoice
   tagged `partially-paid` can be neither edited nor paid — a dead end.
4. **Proven drift:** `INVO-0008` is `status='paid'` with `balance_due = 21.00 / 262.50` —
   impossible under the RPCs (`paid` ⇒ balance ≤ 0). Status no longer reflects amounts.
5. **Two orthogonal concepts conflated in one field:** *lifecycle* (draft→sent→
   cancelled/void/converted) vs *settlement* (unpaid→partial→paid; overdue/refunded), and a
   permission is derived directly from the mashed-up string.

**Conclusion:** Editability keys off a drift-prone string with several inconsistent writers,
so the Edit button reflects a stale label, not the true financial state — hidden at
`partial`, yet able to reappear when stored status diverges from the balance. Fix the class
by deriving settlement + editability from facts, not strings.

---

## 2. Proposed Business Rules

**Two independent axes:**

- **Lifecycle status** (`invoices.status`): `draft → sent → cancelled | void | converted`.
  Human/workflow concept. No longer carries paid/partial.
- **Payment status** (`invoices.payment_status`, DB-derived): `unpaid | partial | paid`.
  Single source of truth, computed from amounts; cannot drift.
- **Overdue** is a *presentation overlay*, derived at read time
  (`payment_status <> 'paid' AND due_date < today`) — never stored (depends on `now()`).
- **Refunded/voided** is represented by `status='void'` + payments in `refunded` state.

**Editability (restricted-edit-after-lock):**

```
isFinanciallyLocked = (payment_status <> 'unpaid')      // any money received
                   OR (status NOT IN ('draft'))         // already issued/sent/etc.
                   OR (status IN ('cancelled','void','converted'))

canEditFull       = status = 'draft' AND payment_status = 'unpaid'   // line items, amounts, tax, discount, dates, type
canEditRestricted = isFinanciallyLocked AND status NOT IN ('cancelled','void','converted')
  → editable: notes, client_reference, due_date, terms/payment_terms, bank_account_id
  → blocked : line_items, quantities, unit_price, tax_rate, discount, invoice_type, invoice_date, currency
noEdit            = status IN ('cancelled','void','converted')   // corrections via credit note / void+reissue
```

Enforced at **two layers** (defense-in-depth): the modal disables blocked fields *and* the
service whitelist refuses blocked fields when locked.

**Action gating (replace string checks with fact checks):**

| Action | New rule |
|---|---|
| Edit (full) | `status='draft' AND payment_status='unpaid'` |
| Edit (restricted) | locked AND not cancelled/void/converted |
| Record Payment | `invoice_type='tax_invoice' AND payment_status<>'paid' AND status NOT IN ('draft','cancelled','void')` |
| Delete | `status='draft' AND payment_status='unpaid'` |
| Send | `status='draft'` |
| Cancel/Void | not already paid/void (void requires reversing payments first) |

---

## 3. Standardized Payment Workflow

- **Settlement is derived, never set by hand.** `payment_status` is a generated column from
  `amount_paid` / `total_amount`. Recording/voiding payments only mutates amounts (via the
  RPCs); settlement follows automatically.
- **Single write path for amounts:** the `record_payment` / `create_receipt_with_allocations`
  / `void_payment` RPCs remain the only mutators of `amount_paid`/`balance_due`. Legacy TS
  writers (`bankingService.allocatePaymentToInvoices`, `invoiceService.recordInvoicePayment`)
  are removed or routed through the RPCs to kill the `partially-paid` divergence.
- **Money conservation & audit** already enforced in the RPCs (allocations must sum to the
  payment; `financial_transactions` ledger entries; `void` writes a reversing entry). Keep.
- **Lifecycle** transitions stay explicit (Send, Cancel, Convert) and never depend on amounts.

---

## 4. Standardized Financial-Document Design (Payment History)

A single reusable model used by View, PDF, and Portal (and later other docs):

**Header band (always):** Invoice Total · Amount Paid · Outstanding Balance · Payment
Progress (% = amount_paid / total, with a bar). Status chip = lifecycle + payment_status
(+ "Overdue" overlay).

**Payment History table (when payments exist):** Date · Amount · Method · Reference ·
Transaction ID · Status · Recorded by · Notes. Sorted newest-first. Supports multiple/partial
payments; shows a running balance column.

**Empty state:** "No payments recorded yet" + outstanding balance.

Surfaces: **View** (InvoiceDetailPage), **PDF** (pdfmake `InvoiceDocument.ts`), **Portal**
(reuse/extend `PortalPayments` pattern at the document level). Print = the PDF/HTML path.
PDFs remain theme-neutral per `DESIGN.md`.

---

## 5. UI/UX Improvements (payment visibility)

- `PaymentSummaryBar` component (total / paid / balance / progress) — tokens per `DESIGN.md`,
  `lucide-react` icons only, status colors from semantic tokens (`success/warning/danger`).
- `PaymentHistoryTable` component (the field set above) — accessible table (`aria-sort`,
  `role`), tabular figures, responsive (stacks on mobile), empty/loading states.
- Locked-field affordance: blocked inputs render disabled with a small "Locked — issued/paid"
  hint and a one-line explanation + link to "Record payment"/"Create credit note".
- Reuse across View + Portal; PDF builder mirrors the same layout.

---

## 6. Implementation Plan

### Phase 1 — Invoices (this iteration)
1. **Migration** (`mcp__supabase__apply_migration`):
   - Add generated `payment_status` column:
     `paid` when `COALESCE(amount_paid,0) >= COALESCE(total_amount,0) AND total_amount > 0`;
     `partial` when `amount_paid > 0`; else `unpaid`.
   - Add `payments.transaction_id text` (nullable) for external txn refs.
   - Data repair: realign drifted `invoices.status` (e.g., INVO-0008) and migrate any
     `partially-paid` → `partial`; add `status` CHECK constraint
     (`draft|sent|paid|partial|overdue|cancelled|void|converted`) — keep paid/partial in the
     constraint during Phase 1 for back-comat, but stop *writing* them for editability logic.
   - Regenerate `src/types/database.types.ts`.
2. **Service/derivation:** `invoicePermissions.ts` — pure helpers `getInvoiceEditability(invoice)`
   and `getPaymentSummary(invoice)`; unit-tested. Update `getPaymentHistory` to join
   `payment_method` name + recorder (`created_by` → profile) + return `transaction_id`.
3. **Edit logic:** replace `['draft','sent'].includes(status)` at InvoiceDetailPage:192 and
   InvoicesListPage:692 with the editability helper; wire restricted-edit (disable blocked
   fields in `InvoiceFormModal`; enforce in `pickInvoicePersistFields` when locked).
4. **Payment History UI:** `PaymentSummaryBar` + `PaymentHistoryTable`; mount in
   InvoiceDetailPage; extend portal document view; add to pdfmake `InvoiceDocument.ts`.
5. **Tests:** editability matrix (draft/sent/partial/paid/overdue/cancelled/void/converted ×
   unpaid/partial/paid), restricted-field enforcement, payment-history render (multi/partial),
   drift-repair sanity. `tsc` 0, lint 0, full suite green, build OK.

### Phase 2 — roll-out (later)
Quotes (remove manual status `<select>`, derive where applicable), Expenses, Purchase Orders,
Receipts, and a future Credit Notes module; apply the same editability + history pattern; retire
remaining legacy status writers; consider splitting `status`/`payment_status` cleanly across all
consumers and tightening the CHECK constraint.

---

## 7. Audit (similar issues across modules)

| Module | Edit gate today | Status source | Risk | Phase |
|---|---|---|---|---|
| Invoices | `['draft','sent']` | RPCs (`partial`) + legacy TS (`partially-paid`) + cron; drift proven | 🔴 | 1 |
| Quotes | `['draft','sent']` | user-settable `<select>`, no derivation | 🔴 | 2 |
| Expenses | `draft\|pending` | explicit action transitions | 🟠 | 2 |
| Purchase Orders | `approved\|ordered\|received` (lookup) | external workflow | 🟠 | 2 |
| Credit Notes | — | module not implemented | — | 2 (new) |
| Payments/Receipts | n/a (immutable; void only) | RPCs (consistent) | 🟢 | — |

Cross-cutting fixes (Phase 2): unify the `partial`/`partially-paid` vocabulary everywhere;
make settlement derived for every document type that tracks money; ensure no permission is
gated on a raw status string anywhere.
