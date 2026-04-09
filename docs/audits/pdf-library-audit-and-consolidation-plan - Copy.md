# PDF Library Audit & Consolidation Plan — xSuite

**Date:** 2026-03-15
**Status:** Audit complete — awaiting migration approval
**Audit Item:** Production-readiness #36 — PDF library consolidation

## Context

xSuite uses 3 PDF libraries (not 4 — html2canvas is a supporting dependency, not a PDF engine). The production audit flagged this as item #36. We want to consolidate to 1 library that best supports the 14-language, RTL-critical bilingual document system already built into the platform. All PDF generation is client-side; the Edge Function only emails pre-generated PDFs.

---

## Step 1: Languages Discovered

**14 languages** (English default + 13 bilingual secondaries), defined in `src/lib/documentTranslations.ts`:

| Code | Language | Script | Dir | PDF Font | Complexity |
|------|----------|--------|-----|----------|------------|
| en | English | Latin | LTR | Roboto | Baseline |
| ar | **Arabic** | Arabic | **RTL** | Tajawal / NotoSansArabic | **High** — only RTL language, word-order reversal |
| ko | Korean | Hangul | LTR | NotoSansKR (CDN) | Medium — CJK script |
| th | Thai | Thai | LTR | NotoSansThai (CDN) | Medium — complex script |
| ru | Russian | Cyrillic | LTR | Roboto | Low — Roboto covers Cyrillic |
| uk | Ukrainian | Cyrillic | LTR | Roboto | Low |
| pl | Polish | Latin ext. | LTR | Roboto | Low — special chars only |
| fr | French | Latin ext. | LTR | Roboto | Low |
| de | German | Latin ext. | LTR | Roboto | Low |
| it | Italian | Latin | LTR | Roboto | Low |
| es | Spanish | Latin ext. | LTR | Roboto | Low |
| tr | Turkish | Latin ext. | LTR | Roboto | Low |
| pt | Portuguese | Latin ext. | LTR | Roboto | Low |
| cs | Czech | Latin ext. | LTR | Roboto | Low |

Additionally, Japanese (NotoSansJP) and Chinese Simplified (NotoSansSC) have CDN font support in `fontLoader.ts` but are **not** in the `SUPPORTED_LANGUAGES` array — they're pre-provisioned for future use.

**i18n UI**: Only English + Arabic (via i18next in `src/lib/i18n.ts`).
**PDF documents**: All 14 languages via bilingual mode (English + secondary on same doc).

**Font files**: 8 TTF files locally in `public/fonts/` (~1.1MB), plus 4 CDN-loaded Noto Sans variants.

---

## Step 2: The 3 PDF Libraries

### Library 1: pdfmake v0.2.20 — PRIMARY (~85% of PDF generation)

**Documents (8 types):**
- Office Receipt, Customer Copy, Checkout Form, Case Label, Quote, Invoice, Report, Stock Label

**Infrastructure (~6000+ lines):**

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/pdf/fonts.ts` | 316 | VFS font management, 7 font families |
| `src/lib/pdf/fontLoader.ts` | — | Local + CDN font loading with fallbacks |
| `src/lib/pdf/styles.ts` | 704 | Complete style dictionary |
| `src/lib/pdf/pdfService.ts` | 929 | Generation orchestrator |
| `src/lib/pdf/types.ts` | 333 | TypeScript interfaces |
| `src/lib/pdf/utils.ts` | — | Formatting utilities |
| `src/lib/pdf/dataFetcher.ts` | — | Supabase data loading |
| `src/lib/pdf/loggingService.ts` | 138 | `pdf_generation_logs` table |
| `src/lib/pdf/documents/` | ~3700 | 8 document templates |
| `src/lib/reportPDFService.ts` | 487 | Case report generation |

**Multi-language**: Full bilingual/RTL support for all 14 languages. Arabic text reversal, font switching, bilingual headers/sections.

### Library 2: jsPDF v3.0.3 — SECONDARY (3 use cases, English-only)

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/chainOfCustodyExport.ts` | Forensic chain of custody PDF | ~204 |
| `src/lib/pdfGenerationService.ts` | HTML-to-PDF via html2canvas | ~260 |
| `src/lib/professionalPDFHelpers.ts` | jsPDF helper functions | ~338 |

**Multi-language**: None. Uses only Helvetica (built-in). Arabic would render as boxes.

**Note**: The HTML-to-PDF path (`pdfGenerationService.ts`) is used for quotes, invoices, and payment receipts — but pdfmake already generates quotes and invoices natively. This is a legacy/duplicate path.

### Library 3: @react-pdf/renderer v4.3.1 — MINIMAL (1 use case)

| File | Purpose | Lines |
|------|---------|-------|
| `src/components/documents/PayslipDocument.tsx` | Payroll payslip | ~289 |

Used by: `src/pages/payroll/PayrollPeriodDetailPage.tsx`

**Multi-language**: None. Helvetica font, English only, hardcoded "OMR" currency.

---

## Step 3: Library Evaluation (1-5 scale)

### Existing Libraries

| Criterion | pdfmake | jsPDF | @react-pdf |
|-----------|---------|-------|------------|
| Arabic RTL support | **4** | 1 | 2 |
| 14-language coverage | **5** | 1 | 1 |
| Custom font embedding | **5** | 2 | 3 |
| Tables/headers/footers | **5** | 2 | 4 |
| Works in our stack | **5** | 5 | 5 |
| Active maintenance | **4** | 4 | 4 |
| Declarative API | **5** | 1 | 4 |
| Bundle size | **3** | 3 | 2 |
| **TOTAL** | **36/40** | **19/40** | **25/40** |

### External Candidates

| Criterion | pdf-lib | PDFKit | Puppeteer/Playwright |
|-----------|---------|--------|----------------------|
| Arabic RTL support | 1 | 3 | 5 |
| 14-language coverage | 2 | 3 | 5 |
| Custom font embedding | 3 | 4 | 5 |
| Tables/headers/footers | 1 | 3 | 5 |
| Works in our stack | 5 | 2 | **0** (server-only) |
| Active maintenance | 4 | 4 | 5 |
| Declarative API | 1 | 2 | 5 |
| Bundle size | 4 | 2 | **0** (N/A) |
| **TOTAL** | **21/40** | **23/40** | **30/40** (disqualified) |

**Puppeteer disqualification**: Requires headless browser, incompatible with client-side generation and Edge Functions (Deno runtime). Would require complete architectural change.

---

## Step 4: Recommendation — Consolidate on pdfmake

**pdfmake wins at 36/40.** Key reasons:

1. **Already handles 85%+ of PDF generation** with 6000+ lines of battle-tested infrastructure
2. **Full bilingual/RTL system already built** — 14 languages, 7 font families, Arabic word-reversal, `TranslationContext`
3. **Declarative JSON API** — tables, headers/footers, page numbers, auto-pagination natively
4. **No viable alternative comes close** without a rewrite — the infrastructure investment alone makes switching prohibitive
5. **GCC/MENA Arabic RTL works today** with Tajawal and NotoSansArabic fonts

**Can it replace all 3?** Yes:
- Chain of custody (jsPDF) -> pdfmake document template with tables
- Payslip (@react-pdf) -> pdfmake document template with earnings/deductions tables
- HTML-to-PDF path (jsPDF + html2canvas) -> already duplicated by native pdfmake generation

**No library needs to be kept** for a specific use case. pdfmake handles everything.

---

## Step 5: Migration Plan

### Phase 1: Create Missing pdfmake Documents (non-breaking, additive)

**1.1** Create `src/lib/pdf/documents/PaymentReceiptDocument.ts`
- Follow pattern of `InvoiceDocument.ts`
- Include: payment header, payment details, invoice reference, amount, bank info
- Add bilingual/RTL support via existing `TranslationContext`
- Add payment receipt keys to `src/lib/documentTranslations.ts` (all 13 languages)

**1.2** Create `src/lib/pdf/documents/ChainOfCustodyDocument.ts`
- Convert manual x/y layout from `src/lib/chainOfCustodyExport.ts` to pdfmake tables
- Include: forensic header, legal notice, summary stats, entry table with category colors
- Add bilingual/RTL support (currently English-only — this is a feature improvement)
- Add chain of custody keys to `src/lib/documentTranslations.ts`

**1.3** Create `src/lib/pdf/documents/PayslipDocument.ts`
- Convert JSX layout from `src/components/documents/PayslipDocument.tsx` to pdfmake
- Include: employee info, attendance, earnings table, deductions table, net salary
- Add bilingual/RTL support
- Use `accounting_locales` for currency instead of hardcoded "OMR"

**1.4** Update `src/lib/pdf/types.ts`
- Expand `DocumentType` to include: `'payment_receipt' | 'payslip' | 'chain_of_custody'`
- Add data interfaces: `PaymentReceiptData`, `PayslipData`, `ChainOfCustodyData`

**1.5** Update `src/lib/pdf/pdfService.ts`
- Add `generatePaymentReceipt()` / `generatePaymentReceiptAsBlob()`
- Add `generatePayslip()` / `generatePayslipAsBlob()`
- Add `generateChainOfCustody()` / `generateChainOfCustodyAsBlob()`

**1.6** Update `src/lib/pdf/dataFetcher.ts`
- Add `fetchPaymentReceiptData(paymentId)`
- Add `fetchChainOfCustodyData(caseId)`
- Add `fetchPayslipData(recordId)`

### Phase 2: Switch Callers to pdfmake (breaking changes, file by file)

| Caller File | Current Library | Migration Action |
|-------------|----------------|-----------------|
| `src/components/cases/ChainOfCustodyTab.tsx` | jsPDF | Replace `exportChainOfCustodyToPDF()` -> `generateChainOfCustodyAsBlob()` |
| `src/pages/payroll/PayrollPeriodDetailPage.tsx` | @react-pdf | Replace `pdf(<PayslipDocument/>).toBlob()` -> `generatePayslipAsBlob()` |
| `src/components/financial/PaymentReceiptModal.tsx` | jsPDF+html2canvas | Replace `usePDFDownload` -> `generatePaymentReceiptAsBlob()` |
| `src/pages/quotes/QuoteDetailPage.tsx` | jsPDF+html2canvas | Replace `usePDFDownload` -> `generateQuoteAsBlob()` (already exists) |
| `src/pages/financial/InvoiceDetailPage.tsx` | jsPDF+html2canvas | Replace `usePDFDownload` -> `generateInvoiceAsBlob()` (already exists) |
| `src/pages/print/PrintPaymentReceiptPage.tsx` | HTML render | Switch to pdfmake generation |

### Phase 3: Delete Dead Code & Remove Libraries

**Delete files:**
- `src/lib/chainOfCustodyExport.ts` (jsPDF chain of custody — keep CSV/JSON exports if in same file)
- `src/lib/pdfGenerationService.ts` (jsPDF + html2canvas orchestrator)
- `src/lib/professionalPDFHelpers.ts` (jsPDF helpers)
- `src/hooks/usePDFDownload.ts` (wraps pdfGenerationService)
- `src/components/documents/PayslipDocument.tsx` (@react-pdf payslip)
- `src/components/documents/InvoiceDocument.tsx` (deprecated HTML renderer)
- `src/components/documents/QuoteDocument.tsx` (deprecated HTML renderer)
- Evaluate: `src/components/documents/PaymentReceiptDocument.tsx` (keep if used for on-screen preview)

**Remove from `package.json`:**
- `jspdf` (^3.0.3)
- `html2canvas` (^1.4.1)
- `@react-pdf/renderer` (^4.3.1)

**Keep in `package.json`:**
- `pdfmake` (^0.2.20) — consolidated PDF engine
- `@types/pdfmake` (^0.2.12) — TypeScript types
- `arabic-persian-reshaper` (^1.0.1) — Arabic text shaping
- `noto-sans-arabic` (^1.0.2) — Arabic font package

**Estimated bundle savings**: ~750KB-1MB (jsPDF ~300KB + html2canvas ~250KB + @react-pdf ~500KB+).

### Phase 4: Verification

- Test all 11 document types: Office Receipt, Customer Copy, Checkout Form, Case Label, Quote, Invoice, Report, Stock Label, **Payment Receipt (new)**, **Payslip (new)**, **Chain of Custody (new)**
- Test bilingual mode with: Arabic (RTL), Korean (CJK), Thai, Russian (Cyrillic), French (Latin extended)
- Verify email attachments still work via `send-document-email` edge function
- Verify `pdf_generation_logs` records for all new document types
- Run `npm run build` and verify no dead imports
- Compare bundle size before/after

---

## Critical Files Reference

| File | Role |
|------|------|
| `src/lib/pdf/pdfService.ts` | Central orchestrator — add new generation functions |
| `src/lib/pdf/types.ts` | Expand DocumentType union + add new data interfaces |
| `src/lib/pdf/documents/InvoiceDocument.ts` | Best pattern to follow for new templates |
| `src/lib/pdf/styles.ts` | Shared style dictionary — reuse for new documents |
| `src/lib/pdf/fonts.ts` | Font management — no changes needed |
| `src/lib/pdf/fontLoader.ts` | Font loading — no changes needed |
| `src/lib/pdf/dataFetcher.ts` | Add data fetching for new document types |
| `src/lib/documentTranslations.ts` | Add translation keys for new document types |
| `src/lib/chainOfCustodyExport.ts` | Source layout logic to translate to pdfmake |
| `src/components/documents/PayslipDocument.tsx` | Source layout logic to translate to pdfmake |
