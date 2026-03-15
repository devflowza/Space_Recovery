# xSuite Codebase Optimization Audit — Zero Functional Change

**Date**: 2026-03-15
**Scope**: Dead code, dependency optimization, code duplication, bundle analysis, TypeScript quality, Edge Functions
**Codebase**: ~136,744 lines of TypeScript across 393 files, 185 database tables, 6 Edge Functions
**Golden Rule**: No workflow, business logic, functionality, UI behavior, or user-facing output changes

---

## Executive Summary

| Metric | Finding |
|---|---|
| Dead file lines | **4,501** (3 files: legacy types + 2 backups) |
| Dead console statements | **81** (console.log/debug/warn/info across 14 files) |
| `.select('*')` calls | **193** across 79 files (bandwidth waste) |
| `any` type usages | **~195** across ~74 files |
| `if (error) throw error` repetitions | **307** across service files |
| Duplicated utility functions | **5 functions** copy-pasted across 2-5 services each |
| Deep relative imports | **54** (`../../../`) across 20 files |
| Production bundle | **6.8 MB** total (5.3 MB JS, 81.8 KB CSS, 174 chunks) |
| Code splitting | **Excellent** — all ~125 routes lazy-loaded |
| Duplicate dependencies | **None** (cleaned in prior audit) |
| Security vulnerabilities | **0** (resolved in prior audit) |
| Files over 500 lines | **80** |
| Files 300–500 lines | **83** |
| Estimated removable lines (Tier 1) | **~4,582** |

**Bottom line**: The codebase is architecturally sound with excellent code splitting and no dependency bloat. The main opportunities are dead file removal, console cleanup, and progressive improvement of `.select('*')` queries and `any` types.

---

## Phase 1: Dead Code & Dead File Detection

### 1A. Dead Files

| File | Lines | Reason |
|---|---|---|
| `src/types/database.ts` | 1,733 | Legacy type file — **ZERO imports** anywhere in codebase. Canonical file is `src/types/database.types.ts` (imported by 36 files). CLAUDE.md confirms: "legacy, kept for reference only during transition." |
| `src/pages/financial/InvoiceDetailPage.tsx.backup2` | 1,176 | Backup file with `.backup2` extension — not a valid module, never imported, not referenced in routes |
| `src/pages/quotes/QuoteDetailPage.tsx.backup2` | 1,592 | Backup file with `.backup2` extension — not a valid module, never imported, not referenced in routes |
| **Total dead file lines** | **4,501** | |

**Verification**: Confirmed via `grep -r "types/database'" src/` (0 results) and `grep -r "backup2" src/` (0 results outside the backup files themselves).

### 1B. Dead Exports

No comprehensive dead export scan was performed at the individual function level — the TypeScript compiler with `noUnusedLocals: true` catches most of these. The service files export functions that are consumed by page/component files via TanStack Query hooks. No obvious orphaned exports were found during exploration.

### 1C. Console Statements (non-error)

**81 `console.log/debug/warn/info` statements** across 14 files:

| File | Count | Category |
|---|---|---|
| `src/lib/pdf/fontLoader.ts` | 26 | Font loading diagnostics |
| `src/lib/pdf/pdfService.ts` | 19 | PDF generation timing/status |
| `src/lib/pdf/fonts.ts` | 11 | Font initialization status |
| `src/components/cases/detail/useCaseMutations.ts` | 6 | Mutation debugging |
| `src/lib/companySettingsService.ts` | 2 | Settings update debugging |
| `src/pages/settings/GeneralSettings.tsx` | 2 | Debug logging left in |
| `src/lib/seedService.ts` | 2 | Seed operation logging |
| `src/lib/reportPDFService.ts` | 7 | Report generation logging |
| `src/components/importExport/ImportWizard.tsx` | 1 | Parse warning |
| `src/components/importExport/ExportWizard.tsx` | 1 | Job creation warning |
| `src/pages/settings/ImportExport.tsx` | 1 | Migration check warning |
| `src/lib/pdf/loggingService.ts` | 1 | Auth check warning |
| `src/components/cases/PDFPreviewModal.tsx` | 1 | Preview debugging |
| `src/lib/financialService.ts` | 1 | Service debugging |

**Note**: 416 `console.error` statements across 122 files are **intentional** (established in the security audit). Leave those untouched.

### 1D. TODO/FIXME/HACK Comments

**None found.** The codebase has zero TODO, FIXME, or HACK comments. Clean.

### 1E. Commented-Out Code

No significant commented-out code blocks (3+ lines) were found during exploration. The codebase is clean of dead commented code.

### 1F. `.select('*')` Usage — Over-Fetching Queries

**193 occurrences across 79 files.** Each `.select('*')` fetches all columns from the table, which:
- Sends unnecessary data over the wire
- Defeats Supabase's column-level RLS optimization
- Increases memory usage on the client

**Top offenders:**

| File | Count |
|---|---|
| `src/lib/stockService.ts` | 16 |
| `src/lib/payrollService.ts` | 13 |
| `src/lib/platformAdminService.ts` | 13 |
| `src/components/cases/DeviceFormModal.tsx` | 7 |
| `src/lib/inventoryService.ts` | 5 |
| `src/lib/chainOfCustodyService.ts` | 4 |
| `src/lib/reportsService.ts` | 4 |
| `src/lib/reportSectionService.ts` | 4 |
| `src/lib/billingService.ts` | 4 |
| `src/lib/kbService.ts` | 4 |
| `src/lib/leaveService.ts` | 4 |
| `src/pages/inventory/DonorSearchPage.tsx` | 4 |
| `src/pages/inventory/InventoryFormPage.tsx` | 4 |
| `src/lib/pdf/dataFetcher.ts` | 4 |
| All other files (65 files) | 1-3 each |

---

## Phase 2: Dependency Optimization

**Status: Already completed** in the prior dependency bloat audit (`docs/audits/dependency-bloat-audit.md`).

### Summary of completed work:
- **5 unused packages removed**: `@tanstack/react-table`, `@hookform/resolvers`, `zod`, `arabic-persian-reshaper`, `noto-sans-arabic`
- **1 package relocated**: `@types/pdfmake` moved from `dependencies` to `devDependencies`
- **1 missing peer dep added**: `react-is@^18.3.1` (required by recharts)
- **Build system fixed**: `vite.config.ts` `manualChunks` converted from object to function format for Vite 8/rolldown compatibility; deprecated `minify: 'esbuild'` removed
- **Zero duplicate-purpose dependencies** found — the codebase is remarkably disciplined
- **Zero security vulnerabilities** after dependency cleanup (`npm audit` clean)

### Current dependency count:
- Production: 15 dependencies
- Dev: 13 devDependencies
- Total resolved: ~394 packages
- `package-lock.json`: ~5,474 lines (normal for this count)

### Import Optimization Status:
- **Tree-shaking: Working correctly** — `lucide-react` and `date-fns` use individual named imports throughout
- **No `import *` anti-patterns** (except 1 unavoidable case in `pdf/fonts.ts` for pdfmake's VFS)
- **No barrel import issues** — only 2 index.ts re-export files exist, both with targeted exports
- **No lodash or moment.js** — only lightweight, tree-shakeable libraries used

---

## Phase 3: Code Duplication & DRY Analysis

### 3A. Service File CRUD Patterns

**48 service files** in `src/lib/` follow near-identical patterns:

```typescript
// Repeated pattern across all services (~10-15 lines each occurrence)
export async function getItems() {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createItem(item: ItemInsert) {
  const { data, error } = await supabase
    .from('table_name')
    .insert(item)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function softDeleteItem(id: string) {
  const { error } = await supabase
    .from('table_name')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
```

**Estimate**: ~60-70% of each service file is boilerplate CRUD. A generic service factory could reduce this, but:
- Each service has domain-specific queries, joins, and business logic mixed with CRUD
- The current pattern is explicit and easy to debug
- Refactoring risk is high relative to benefit
- **Recommendation**: Report only. Consider for new services, not retrofitting.

**`if (error) throw error` pattern**: Appears **307 times** across service files. Consistent but verbose — a wrapper function could reduce this to a single-line call while preserving behavior.

### 3B. Duplicated Utility Functions Across Services

Several utility functions are copy-pasted across multiple service files rather than shared:

| Function | Duplicated In | Lines Per Copy | Potential Shared Module |
|---|---|---|---|
| `logAuditTrail()` | invoiceService, quotesService, paymentsService, expensesService, vatService | ~11-15 | `auditTrailService.ts` |
| `sanitizeUuidFields()` | invoiceService, quotesService | ~11 | `dataValidation.ts` |
| `createFinancialTransaction()` | paymentsService, expensesService | ~11 | `financialTransactionService.ts` |
| `getNextXxxNumber()` wrappers | invoiceService, quotesService, paymentsService, expensesService | ~5-8 | `numberSequenceService.ts` |
| Status update patterns | 10+ services | ~5-8 | Generic `updateStatus()` helper |
| Stats calculation (filter/count/sum) | quotesService, paymentsService, expensesService, invoiceService | ~30-50 | `statsCalculationService.ts` |

**Estimated lines eliminable by extracting shared utilities**: 200-400 lines.

### 3C. Component Pattern Duplication

**78 modal/form components** share significant structural similarity:

- **InvoiceFormModal (1,021 lines) vs QuoteFormModal (888 lines)**: ~60% identical code — same LineItem interface, bank account selection, terms template fetching, line item editing, currency formatting
- **DeviceFormModal (1,062 lines)**: Large, contains form logic repeated in other device components
- **Modal open/close/submit/toast patterns**: Repeated across all 78 modals

A base `FormModal` component could reduce boilerplate across the modal components, but the effort-to-risk ratio is high for an ERP with domain-specific forms.

### 3D. Toast & Date Formatting Patterns

| Pattern | Total Occurrences | Files | Status |
|---|---|---|---|
| Toast notifications (toast.success/error/etc.) | 209 | 56 files | `useMutationToast` hook exists but not universally adopted |
| Date formatting (date-fns calls) | 404 | 134 files | `src/lib/format.ts` utility exists, most files use it but 32 import date-fns directly |
| Soft delete pattern (`.update({ deleted_at })`) | ~30+ | ~30 files | Consistent — no issue |

### 3E. Deep Relative Imports

**54 occurrences of `../../../`** relative imports across 20 files:

| Directory | Files Affected |
|---|---|
| `src/components/platform-admin/tenant-detail/` | 6 files |
| `src/components/platform-admin/announcements/` | 3 files |
| `src/components/platform-admin/tickets/` | 1 file |
| `src/components/cases/detail/` | 10 files |

The `@/` path alias is **already configured** in both `tsconfig.app.json` and `vite.config.ts`:
```json
"paths": { "@/*": ["src/*"] }
```
```typescript
alias: { '@': resolve(__dirname, './src') }
```

These 54 imports could be simplified from `../../../lib/someService` to `@/lib/someService`.

### 3D. Date Formatting

`date-fns` is used consistently across 32 files with individual imports (`import { format } from 'date-fns'`). A centralized format utility exists at `src/lib/format.ts`. No duplication concern.

### 3E. Toast Notifications

`react-hot-toast` is used directly in 16 files. A custom hook wrapper exists at `src/hooks/useToast.tsx`. Some files import toast directly rather than using the hook — minor inconsistency but not worth refactoring.

---

## Phase 4: Bundle & Performance Analysis

### 4A. Production Bundle Overview

| Metric | Value |
|---|---|
| Total `dist/` size | 6.8 MB |
| Total JS | 5.3 MB across 174 chunks |
| Total CSS | 81.8 KB (single file) |
| Initial page load JS | ~378 KB (index + supabase + ui-libs) |

### 4B. Top 15 Heaviest Chunks

| # | Chunk | Size (KB) | Notes |
|---|---|---|---|
| 1 | `pdfmake-libs` | 2,106 | ~40% of total JS. Lazy-loaded, separate chunk. Only loaded when PDF generation is triggered. |
| 2 | `chart-libs` (recharts) | 448 | Used in only 2 pages. Separate chunk, loaded on demand. |
| 3 | `CaseDetail` | 270 | Largest page chunk. Already decomposed from 1,730→938 lines in security audit. |
| 4 | `index` (core) | 198 | Main app shell: router, auth, base layout |
| 5 | `supabase` | 116 | Backend client library |
| 6 | `pdfService` | 89 | PDF generation orchestration (separate from pdfmake library) |
| 7 | `InventoryListPage` | 87 | Complex inventory table with filters |
| 8 | `ui-libs` | 65 | lucide-react (tree-shaken) + @tanstack/react-query |
| 9 | `CasesList` | 58 | Case list page with filters and table |
| 10 | `documentTranslations` | 47 | i18n translation strings for documents |
| 11 | `i18n` | 44 | i18next library core |
| 12 | `QuoteDetailPage` | 40 | Quote detail view |
| 13 | `LeaveManagement` | 39 | HR leave management page |
| 14 | `InvoiceDetailPage` | 36 | Invoice detail view |
| 15 | `SeedingResultsDisplay` | 36 | Database seeding results |

### 4C. Code Splitting Assessment

**Rating: Excellent**

- All ~125 routes use `React.lazy()` + `Suspense` in `src/App.tsx`
- Heavy libraries (pdfmake, recharts) are in separate vendor chunks, loaded only when needed
- Manual chunk splitting configured for 8 vendor groups: react-vendor, supabase, ui-libs, form-libs, chart-libs, pdfmake-libs, date-libs, i18n
- No admin-only or portal-only code leaking into the main bundle — all page-level code is lazy-loaded

**Minor inconsistency**: 91 routes use `.then(m => ({ default: m.NamedExport }))` pattern, 34 routes use `.then(m => ({ default: m.default }))`. Functionally equivalent but inconsistent.

### 4D. Asset Analysis

**Font files** in `public/fonts/` (1.27 MB total):

| Font | Files | Size |
|---|---|---|
| Roboto (Latin) | Regular, Bold, Italic, BoldItalic | 586 KB |
| Tajawal (Arabic) | Regular, Bold | 111 KB |
| NotoSansArabic | Regular, Bold | 380 KB |

Both Tajawal and NotoSansArabic serve Arabic text. The PDF system uses both for different contexts (Tajawal for document body, NotoSansArabic for specific glyph coverage). **Defer font consolidation to the PDF audit.**

No SVGs or images found in `public/` that need optimization.

---

## Phase 5: TypeScript & Code Quality

### 5A. `any` Type Usage

**~195 occurrences across ~74 files** (excluding backup files).

| Category | Count | Assessment |
|---|---|---|
| `catch(error: any)` blocks | ~60 | Common pattern, acceptable |
| PDF/pdfmake types | ~25 | Weak upstream typing, hard to avoid |
| Platform admin services | ~20 | Could be typed more specifically |
| Import/export services | ~10 | Dynamic data handling |
| Other services | ~80 | Mix of avoidable and necessary |

**Files with highest `any` concentration:**

| File | Count |
|---|---|
| `src/lib/pdf/fonts.ts` | 17 |
| `src/lib/platformAdminService.ts` | 13 |
| `src/lib/reportPDFService.ts` | 11 |
| `src/components/cases/detail/useCaseModals.ts` | 10 |
| `src/lib/importExportService.ts` | 7 |
| `src/lib/financialReportsService.ts` | 6 |
| `src/pages/suppliers/SupplierProfilePage.tsx` | 7 |
| `src/lib/userManagementService.ts` | 5 |

**TypeScript compiler config is strict** (`tsconfig.app.json`):
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

### 5B. Type Organization

| File | Lines | Status |
|---|---|---|
| `src/types/database.types.ts` | 6,917 | **GENERATED** — canonical, imported by 36 files |
| `src/types/database.ts` | 1,733 | **DEAD** — legacy, zero imports |
| `src/types/roles.ts` | — | Active — role type definitions |
| `src/types/accountingLocale.ts` | — | Active — locale types |
| `src/lib/pdf/types.ts` | 454 | Active — PDF-specific types |

No duplicate type definitions found across files. Types are well-organized.

### 5C. File Size Analysis

**80 files over 500 lines** (excluding the 6,917-line generated types file):

#### Over 1,000 lines (16 files):

| File | Lines | Type | Decomposition Candidate? |
|---|---|---|---|
| `lib/stockService.ts` | 2,069 | Service | **Yes** — largest service file, could split by stock domain (items, movements, adjustments, sales) |
| `lib/importExportService.ts` | 1,448 | Service | Moderate — handles many table types |
| `pages/settings/GeneralSettings.tsx` | 1,427 | Page | **Yes** — settings page with many sections |
| `lib/documentTranslations.ts` | 1,335 | Data | No — translation data, inherently large |
| `pages/employee-management/LeaveManagement.tsx` | 1,203 | Page | Moderate — complex HR page |
| `lib/pdf/pdfService.ts` | 1,152 | Service | Moderate — PDF generation orchestration |
| `config/seedData.ts` | 1,141 | Data | No — seed configuration, inherently large |
| `pages/customers/CustomerProfilePage.tsx` | 1,089 | Page | Moderate — customer detail with tabs |
| `components/cases/CreateCaseWizard.tsx` | 1,080 | Component | Moderate — multi-step wizard |
| `pages/stock/StockItemDetail.tsx` | 1,079 | Page | Moderate |
| `lib/seedService.ts` | 1,066 | Service | No — seed operations |
| `pages/customers/CustomersListPage.tsx` | 1,065 | Page | Moderate |
| `components/cases/DeviceFormModal.tsx` | 1,062 | Component | Moderate — complex device form |
| `components/cases/InvoiceFormModal.tsx` | 1,021 | Component | Moderate |
| `pages/employee-management/TimesheetManagement.tsx` | 994 | Page | Moderate |
| `pages/companies/CompaniesListPage.tsx` | 987 | Page | Moderate |

#### 500–999 lines (64 files):

<details>
<summary>Click to expand full list</summary>

| File | Lines |
|---|---|
| `lib/chainOfCustodyService.ts` | 969 |
| `pages/companies/CompanyProfilePage.tsx` | 948 |
| `pages/resources/CloneDrivesList.tsx` | 938 |
| `pages/cases/CaseDetail.tsx` | 938 |
| `components/cases/QuoteFormModal.tsx` | 888 |
| `lib/payrollService.ts` | 865 |
| `lib/i18n.ts` | 837 |
| `lib/bankingService.ts` | 836 |
| `components/inventory/AddInventoryModal.tsx` | 824 |
| `pages/quotes/QuoteDetailPage.tsx` | 799 |
| `pages/inventory/InventoryListPage.tsx` | 799 |
| `lib/platformAdminService.ts` | 799 |
| `pages/financial/BankingPage.tsx` | 785 |
| `pages/suppliers/SupplierProfilePage.tsx` | 778 |
| `components/importExport/ImportWizard.tsx` | 777 |
| `pages/financial/ReportsDashboard.tsx` | 770 |
| `lib/invoiceService.ts` | 755 |
| `components/cases/ClientTab.tsx` | 730 |
| `lib/quotesService.ts` | 715 |
| `pages/settings/ClientPortalSettings.tsx` | 704 |
| `lib/pdf/styles.ts` | 703 |
| `lib/pdf/documents/ReportDocument.ts` | 700 |
| `pages/cases/CasesList.tsx` | 699 |
| `App.tsx` | 693 |
| `pages/financial/InvoicesListPage.tsx` | 689 |
| `pages/financial/InvoiceDetailPage.tsx` | 686 |
| `components/layout/Sidebar.tsx` | 677 |
| `pages/financial/VATAuditPage.tsx` | 666 |
| `pages/financial/PaymentsList.tsx` | 656 |
| `pages/stock/StockReportsPage.tsx` | 653 |
| `pages/settings/CategoryDetail.tsx` | 638 |
| `components/cases/detail/CaseOverviewTab.tsx` | 625 |
| `lib/pdf/documents/CheckoutFormDocument.ts` | 619 |
| `lib/pdf/dataFetcher.ts` | 619 |
| `lib/bulkImportService.ts` | 611 |
| `pages/quotes/QuotesListPage.tsx` | 607 |
| `components/documents/ReportDocument.tsx` | 604 |
| `pages/stock/StockAdjustmentsPage.tsx` | 598 |
| `pages/inventory/InventoryFormPage.tsx` | 598 |
| `pages/settings/GeneralSettingsTab.tsx` | 592 |
| `pages/financial/ExpensesList.tsx` | 584 |
| `lib/inventoryService.ts` | 582 |
| `lib/paymentsService.ts` | 572 |
| `components/cases/CloneDriveModal.tsx` | 567 |
| `components/cases/StreamlinedReportEditor.tsx` | 564 |
| `pages/suppliers/SuppliersListPage.tsx` | 562 |
| `components/cases/ProfessionalReportFormModal.tsx` | 561 |
| `lib/pdf/documents/InvoiceDocument.ts` | 557 |
| `components/inventory/InventoryDetailModal.tsx` | 557 |
| `components/banking/RecordReceiptModal.tsx` | 552 |
| `components/cases/ServerBulkDrivesModal.tsx` | 550 |
| `lib/pdf/documents/QuoteDocument.ts` | 535 |
| `components/importExport/BulkInventoryImportModal.tsx` | 531 |
| `components/stock/StockItemFormModal.tsx` | 527 |
| `lib/pdf/documents/PaymentReceiptDocument.ts` | 524 |
| `pages/users/UserManagement.tsx` | 523 |
| `components/financial/RecordPaymentModal.tsx` | 523 |
| `components/cases/ChainOfCustodyTab.tsx` | 523 |
| `lib/billingService.ts` | 520 |
| `pages/hr/RecruitmentPage.tsx` | 509 |
| `lib/expensesService.ts` | 504 |

</details>

### 5D. Circular Dependencies

**None detected.** No files import each other directly or through short cycles.

### 5E. Import Organization

- Path alias `@/` is configured but underutilized (54 deep relative imports could use it)
- Import ordering is generally consistent (external → internal → types)
- No circular dependency issues

---

## Phase 6: Supabase & Edge Function Optimization

### 6A. Edge Functions

**6 Edge Functions** in `supabase/functions/`:

| Function | Purpose | Lines (est.) |
|---|---|---|
| `send-document-email` | Email delivery via Gmail SMTP | ~200 |
| `user-management` | Admin user creation/password reset | ~250 |
| `provision-tenant` | Multi-tenant provisioning | ~200 |
| `paypal-webhook` | PayPal subscription webhooks | ~300 |
| `paypal-create-subscription` | Create PayPal subscriptions | ~200 |
| `paypal-cancel-subscription` | Cancel subscriptions | ~150 |

### 6B. Edge Function Code Duplication

| Pattern | Duplicated Across | Lines Per Instance |
|---|---|---|
| CORS headers object | All 6 functions | ~5 |
| `checkRateLimit()` function | 4 functions | ~15 |
| `rateLimitResponse()` function | 4 functions | ~5 |
| `getPayPalAccessToken()` | 3 PayPal functions | ~20 |
| Auth header validation | 4 functions | ~10 |
| Error response formatting | All 6 functions | ~5 |

**Total duplicated lines**: ~150-200 lines across Edge Functions.

**Important**: Per CLAUDE.md — "Never share code between edge functions." This duplication is **intentional per project convention**. Supabase Edge Functions run independently in Deno isolates, and sharing code between them adds deployment complexity. **Do not refactor.**

### 6C. Database Query Patterns

- **193 `.select('*')` calls** — could be replaced with specific column lists for high-traffic queries
- **Pagination**: Already addressed in security audit — most list queries have `.limit()` or `.range()`
- **Joins**: Supabase's query builder with `.select('*, related_table(*)') ` is used appropriately throughout

---

## Priority-Ranked Action Items

### Tier 1: Safe Quick Wins — Zero Risk

| # | Action | Impact | Files | Effort |
|---|---|---|---|---|
| 1 | **Delete `src/types/database.ts`** | -1,733 dead lines | 1 file | Trivial |
| 2 | **Delete `src/pages/financial/InvoiceDetailPage.tsx.backup2`** | -1,176 dead lines | 1 file | Trivial |
| 3 | **Delete `src/pages/quotes/QuoteDetailPage.tsx.backup2`** | -1,592 dead lines | 1 file | Trivial |
| 4 | **Remove 81 console.log/debug/warn/info statements** | Cleaner production logs | 14 files | Low |
| | **Tier 1 Total** | **-4,582 lines** | | |

### Tier 2: Low-Risk Optimizations

| # | Action | Impact | Files | Effort |
|---|---|---|---|---|
| 5 | **Extract `logAuditTrail()` to shared `auditTrailService.ts`** | Eliminate duplication across 5 services (~60 lines saved) | 5 service files | Low |
| 6 | **Extract `sanitizeUuidFields()` to shared utility** | Eliminate duplication (~22 lines saved) | 2 service files | Low |
| 7 | **Extract `getNextNumber` wrappers to shared utility** | Consolidate 4+ near-identical wrappers | 4+ service files | Low |
| 8 | **Replace 54 deep `../../../` imports with `@/` alias** | Cleaner, more maintainable imports | 20 files | Low |
| 9 | **Replace `.select('*')` with specific columns** in top-10 highest-traffic services | Reduced Supabase bandwidth, faster queries | ~15 files | Medium |
| 10 | **Standardize lazy-load export pattern** in `App.tsx` | Consistency (34 routes use `m.default` vs 91 using `m.NamedExport`) | 1 file | Low |

### Tier 3: Refactoring Opportunities — Higher Effort, Needs Review

| # | Action | Impact | Effort | Risk |
|---|---|---|---|---|
| 11 | **Decompose `stockService.ts`** (2,069 lines) | Split into stockItemsService, stockMovementsService, stockAdjustmentsService, stockSalesService | High | Medium |
| 12 | **Decompose `GeneralSettings.tsx`** (1,427 lines) | Extract settings sections into separate tab components | High | Medium |
| 13 | **Reduce `any` usage** (~195 occurrences) | Better type safety, IDE support | Medium | Low |
| 14 | **Create shared base `FormModal` component** | Reduce boilerplate across 78 modal components (~60% shared patterns) | High | Medium |
| 15 | **Generic CRUD service factory** for 48 service files | DRY, less boilerplate for new services | Very High | High |

---

## Estimated Impact Summary

| Metric | Current | After Tier 1 | After Tier 1+2 | After All |
|---|---|---|---|---|
| Total lines of code | 136,744 | ~132,162 | ~132,000 | ~130,000 |
| Dead files | 3 | 0 | 0 | 0 |
| Console noise | 81 statements | 0 | 0 | 0 |
| `.select('*')` calls | 193 | 193 | ~150 | ~100 |
| `any` types | ~195 | ~195 | ~195 | ~30 |
| Deep relative imports | 54 | 54 | 0 | 0 |
| Production bundle size | 6.8 MB | 6.8 MB | 6.8 MB | 6.8 MB |

**Note on bundle size**: Tier 1-3 changes primarily affect code maintainability and developer experience. Bundle size is already well-optimized with lazy loading and vendor chunking. The dead files (types, backups) are not included in the production build, so removing them won't change bundle size but will improve repository hygiene.

---

## Appendix A: Full File Size Distribution

| Range | Count |
|---|---|
| Over 1,000 lines | 16 files (+1 generated types, +1 legacy dead) |
| 500–999 lines | 64 files |
| 300–499 lines | 83 files |
| Under 300 lines | 230 files |
| **Total** | **393 files** |

## Appendix B: Dependency Status (Post-Cleanup)

| Category | Packages |
|---|---|
| **Production (15)** | @supabase/supabase-js, @tanstack/react-query, date-fns, i18next, lucide-react, pdfmake, react, react-dom, react-easy-crop, react-hook-form, react-hot-toast, react-i18next, react-is, react-router-dom, recharts |
| **Dev (13)** | @eslint/js, @types/pdfmake, @types/react, @types/react-dom, @vitejs/plugin-react, autoprefixer, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss, tailwindcss, typescript, typescript-eslint, vite |
| **Unused** | None |
| **Duplicates** | None |
| **Vulnerabilities** | 0 |
