# Dependency Bloat & Application Architecture Audit — xSuite

**Date**: 2026-03-15
**Scope**: `package.json` direct dependencies — inventory, usage detection, overlap analysis, bundle impact, and production readiness
**Codebase**: ~136,744 lines of TypeScript across 393 files, 185 database tables

---

## Executive Summary

**xSuite's dependency footprint is LEAN, not bloated.** 32 direct dependencies (20 production + 12 dev) for a 136K-line ERP+CRM is ~4x fewer than comparable React SaaS applications at this scale (which typically have 60–120 direct dependencies).

**Key findings:**
- **5 completely unused packages** to remove (zero risk)
- **Zero duplicate-purpose packages** — the codebase is remarkably disciplined
- **1 high-severity security vulnerability** in a transitive dependency (rollup via vite) — fix available
- **1 significantly outdated package** — `lucide-react` is 233 versions behind latest
- **1 decision needed** — `i18next`/`react-i18next` are installed but barely used (3 files)

---

## Step 1: Dependency Inventory

### Counts

| Category | Count |
|---|---|
| Production dependencies | 20 |
| Dev dependencies | 12 |
| **Total direct** | **32** |
| Transitive (prod) | 136 |
| Transitive (dev) | 294 |
| Transitive (optional) | 33 |
| **Total resolved** | **429** |

### Categorization

| Category | Packages |
|---|---|
| **Core Framework** | `react` (18.3.1), `react-dom` (18.3.1), `react-router-dom` (7.13.1) |
| **Build Tooling** | `vite` (8.0.0), `@vitejs/plugin-react` (4.7.0), `typescript` (5.5.3) |
| **CSS/Styling** | `tailwindcss` (3.4.1), `autoprefixer` (10.4.18), `postcss` (8.4.35) |
| **State Management** | `@tanstack/react-query` (5.90.7) |
| **Table** | `@tanstack/react-table` (8.21.3) |
| **UI/Icons** | `lucide-react` (0.344.0) |
| **Backend/Auth** | `@supabase/supabase-js` (2.57.4) |
| **Forms/Validation** | `react-hook-form` (7.66.0), `@hookform/resolvers` (5.2.2), `zod` (4.1.12) |
| **PDF Generation** | `pdfmake` (0.2.20), `@types/pdfmake` (0.2.12) |
| **Arabic/RTL Support** | `arabic-persian-reshaper` (1.0.1), `noto-sans-arabic` (1.0.2) |
| **Charting** | `recharts` (3.3.0) |
| **Date/Time** | `date-fns` (4.1.0) |
| **i18n** | `i18next` (25.6.1), `react-i18next` (16.2.4) |
| **Toast/Notifications** | `react-hot-toast` (2.6.0) |
| **Image Cropping** | `react-easy-crop` (5.5.3) |
| **Linting** | `eslint` (9.39.4), `@eslint/js` (9.9.1), `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint` (8.3.0), `globals` (15.9.0) |
| **Types** | `@types/react` (18.3.5), `@types/react-dom` (18.3.0) |

---

## Step 2: Unused & Dead Dependency Detection

### Completely Unused (0 imports in `src/`) — REMOVE

| Package | Verdict | Notes |
|---|---|---|
| `@tanstack/react-table` | **DEAD** | Zero imports anywhere. App implements custom table components instead. Referenced in vite `manualChunks` but never imported in code. |
| `@hookform/resolvers` | **DEAD** | Zero imports. Intended for zod/yup integration with react-hook-form, but no resolver is ever used. |
| `zod` | **DEAD** | Zero imports. No schema validation anywhere in `src/`. |
| `arabic-persian-reshaper` | **DEAD** | Zero imports. Listed in `package.json` but never called. Referenced only in PDF audit doc. |
| `noto-sans-arabic` | **DEAD (npm package)** | Zero imports. Font files are served from `public/fonts/notosansarabic-*.ttf` as static assets — the npm package provides no value. |

### Low Usage (1–5 files) — REVIEW

| Package | Files | Assessment |
|---|---|---|
| `react-easy-crop` | 1 file (`components/ui/ImageCropModal.tsx`) | **KEEP** — specialized, lightweight, no native alternative |
| `recharts` | 2 files (`PlatformDashboard`, `StockReportsPage`) | **KEEP** — charting is essential for dashboards, usage will grow |
| `@supabase/supabase-js` | 2 files | **KEEP** — core backend client, imported once and re-exported via `supabaseClient.ts` |
| `i18next` + `react-i18next` | 3 files (`lib/i18n.ts`, `AnnouncementBanner`, `ReportSectionsPage`) | **KEEP IF i18n planned** — infrastructure is set up. If no i18n plans, remove (~40KB bundle savings). |
| `react-hook-form` | 5 files (onboarding, recruitment, performance modules) | **KEEP** — form state management in complex modals |

### Moderate Usage (14–32 files)

| Package | Files | Assessment |
|---|---|---|
| `pdfmake` | 14 files (`lib/pdf/documents/`, `lib/pdf/fonts.ts`, `lib/pdf/styles.ts`) | **KEEP** — core PDF generation. Separate audit in progress. |
| `react-hot-toast` | 16 files (modals, pages, hooks) | **KEEP** — sole notification system, well-integrated |
| `date-fns` | 32 files (formatting/manipulation across all modules) | **KEEP** — tree-shakes well, only `format()` and `formatDistanceToNow()` used |

### Heavy Usage (85+ files)

| Package | Files | Assessment |
|---|---|---|
| `react-router-dom` | 87 files | **KEEP** — core routing |
| `@tanstack/react-query` | 148 files | **KEEP** — server state management throughout |
| `lucide-react` | 257 files | **KEEP** — per CLAUDE.md policy: "lucide-react only" |

---

## Step 3: Duplicate & Overlapping Functionality Analysis

| Category | Finding |
|---|---|
| Date/time libraries | **CLEAN** — Only `date-fns` (32 files). No moment/dayjs/luxon. |
| HTTP clients | **CLEAN** — Only Supabase client + native fetch. No axios/got. |
| Toast/notification | **CLEAN** — Only `react-hot-toast` (16 files). No react-toastify/sonner. |
| Icon packages | **CLEAN** — Only `lucide-react` (257 files). No react-icons/heroicons. |
| Form libraries | **CLEAN** — Only `react-hook-form` (5 files). No formik/final-form. |
| PDF libraries | **CLEAN** — Only `pdfmake` (14 files). `@react-pdf/renderer` is mentioned in CLAUDE.md but NOT installed. Handled in separate PDF audit. |
| CSV/Excel | **NONE installed** — No CSV/Excel library. |
| Animation | **NONE installed** — Tailwind CSS transitions only. |
| Rich text editors | **NONE installed** — KB module uses plain textarea. |
| State management | **CLEAN** — Only `@tanstack/react-query` (148 files) + React Context (3 context files). No redux/zustand/mobx. |

### Verdict: ZERO duplicate-purpose packages found.

---

## Step 4: Bundle Size Impact Assessment

### Vite Build Configuration (`vite.config.ts`)

- Manual chunk splitting with 8 named chunks: `react-vendor`, `supabase`, `ui-libs`, `form-libs`, `chart-libs`, `pdfmake-libs`, `date-libs`, `i18n`
- `chunkSizeWarningLimit: 1000` (1MB)
- esbuild minification, no sourcemaps in production
- `lucide-react` excluded from dep optimization (tree-shaking)
- `pdfmake/build/pdfmake` and `pdfmake/build/vfs_fonts` explicitly included

### Estimated Top Dependencies by Bundle Size

| Package | Est. Bundle Size (minified) | Usage (files) | Concern |
|---|---|---|---|
| `pdfmake` + vfs_fonts | ~500–800KB | 14 | Large but essential. Lazy-loadable. |
| `recharts` | ~200–300KB | 2 | Heavy for 2 files, but dashboards need charting. |
| `@supabase/supabase-js` | ~150KB | Core | Essential, well-chunked. |
| `react-router-dom` | ~50KB | 87 | Essential. |
| `@tanstack/react-query` | ~40KB | 148 | Essential. |
| `lucide-react` | ~40KB (tree-shaken) | 257 | Only imported icons are bundled. |
| `i18next` + `react-i18next` | ~40KB | 3 | **Flag**: 40KB for 3-file usage is marginal. |
| `date-fns` | ~30KB (tree-shaken) | 32 | Only `format()` and `formatDistanceToNow()` bundled. |
| `react-hook-form` | ~25KB | 5 | Lightweight. |
| `zod` | ~15KB | **0** | **WASTE**: In `manualChunks` despite 0 usage — adds dead code to bundle. |

### Bundle Issues Found

1. **`manualChunks` references unused packages**: `@tanstack/react-table`, `@hookform/resolvers`, and `zod` are in the chunk config but never imported. Vite may create empty or wasteful chunks for these.
2. **Tree-shaking is working correctly**: `date-fns` and `lucide-react` both use ES module exports — only imported symbols are bundled. No barrel-import anti-patterns detected.
3. **No full-library imports**: No `import * as dateFns`, no `import _ from 'lodash'`, no other heavy blanket imports.

---

## Step 5: Production-Grade Assessment

### Is the dependency count appropriate?

**Verdict: LEAN**

32 direct dependencies for a 136K-line ERP+CRM with 185 database tables is remarkably minimal. For comparison, typical React SaaS applications at this scale carry 60–120 direct dependencies. The team has been disciplined about avoiding dependency sprawl.

### Security Vulnerabilities (`npm audit`)

| Severity | Count | Details |
|---|---|---|
| Critical | 0 | — |
| High | 1 | `rollup` (transitive via `vite`): **Arbitrary File Write via Path Traversal** (GHSA-mw96-cpmx-2vgc). Affects rollup 4.0.0–4.58.0. **Fix available** by updating vite to pull rollup ≥4.59.0. |
| Moderate | 0 | — |
| Low | 0 | — |

### Outdated Dependencies

| Package | Current | Latest | Gap | Notes |
|---|---|---|---|---|
| `lucide-react` | 0.344.0 | 0.577.0 | **233 versions** | Significant gap. May be pinned intentionally due to breaking icon name changes between versions. |
| `pdfmake` | 0.2.20 | 0.3.6 | Minor → major | API changes in 0.3.x. Defer to PDF audit. |
| `@types/pdfmake` | 0.2.12 | 0.3.2 | — | Should match `pdfmake` version. |
| `react` / `react-dom` | 18.3.1 | 19.2.4 | Major | React 19 available. Non-trivial migration — not urgent. |

All other packages are at or near latest within their semver range.

### Abandoned/Unmaintained Packages

- `noto-sans-arabic` (1.0.2) — Static font package, last published long ago. No concern because the npm package is unused (fonts in `public/fonts/`).
- `arabic-persian-reshaper` (1.0.1) — Niche, low maintenance. Irrelevant since it's unused.

---

## Step 6: Recommendations

### 1. Immediate Removals (zero risk — unused dependencies)

| # | Package | Reason | Risk | Bundle Savings |
|---|---|---|---|---|
| 1 | `@tanstack/react-table` | 0 imports in codebase | None | ~30KB |
| 2 | `@hookform/resolvers` | 0 imports in codebase | None | ~5KB |
| 3 | `zod` | 0 imports in codebase | None | ~15KB |
| 4 | `arabic-persian-reshaper` | 0 imports in codebase | None | ~10KB |
| 5 | `noto-sans-arabic` | 0 imports; fonts served from `public/fonts/` | None | ~2MB (font files in node_modules only) |

**Also required**: Update `vite.config.ts` `manualChunks` to remove references to `@tanstack/react-table`, `@hookform/resolvers`, and `zod`.

**Estimated total savings**: ~60KB from production bundle + ~2MB from `node_modules`.

### 2. Consolidation Targets

**None.** No duplicate-purpose packages found. The codebase is clean.

### 3. Upgrade Candidates

| Package | Action | Priority |
|---|---|---|
| `vite` (→ latest patch) | Fixes `rollup` high-severity CVE (GHSA-mw96-cpmx-2vgc) | **HIGH** |
| `lucide-react` (0.344.0 → 0.577.0) | 233 versions behind. Test for icon name changes. | Medium |
| `pdfmake` (0.2.20 → 0.3.6) | Defer to dedicated PDF audit | Low |
| `react` / `react-dom` (18 → 19) | Major migration. Plan separately. | Low |

### 4. Lighter Alternatives

**None needed.** Current package choices are already optimal:
- `date-fns` — gold standard, tree-shakeable, no lighter alternative needed
- `react-hot-toast` — tiny (~5KB gzipped)
- `lucide-react` — tree-shakes effectively, only used icons bundled
- No lodash, moment.js, axios, or other known "heavy" packages present

### 5. Architecture Observations

**Package structure**: Single-package (non-monorepo) is **appropriate** for this application. The codebase is a single deployable SaaS frontend. Splitting into workspaces would add complexity without benefit at this scale.

**`package-lock.json`** (5,548 lines): **Normal** for 32 direct dependencies resolving to 429 total packages. Lock files grow proportionally to the transitive dependency tree — this is not a concern.

**`@types/pdfmake` in dependencies**: This is a type-only package (`@types/*`) that should be in `devDependencies`, not `dependencies`. It has no runtime impact but is categorized incorrectly.

### 6. Decision Required: i18n Libraries

`i18next` (25.6.1) + `react-i18next` (16.2.4) are installed and configured (`src/lib/i18n.ts`) but only actively used in 3 files. Two options:

| Option | Bundle Impact | Trade-off |
|---|---|---|
| **Keep** (if multi-language support is planned) | ~40KB in `i18n` chunk | Infrastructure ready for future i18n rollout |
| **Remove** (if English-only for foreseeable future) | Save ~40KB | Would need to reinstall and reconfigure if i18n is needed later |

---

## Appendix: Full Usage Matrix

| Package | Import Count | Category | Verdict |
|---|---|---|---|
| `lucide-react` | 257 | Icons | Keep |
| `@tanstack/react-query` | 148 | State | Keep |
| `react-router-dom` | 87 | Routing | Keep |
| `date-fns` | 32 | Dates | Keep |
| `react-hot-toast` | 16 | Notifications | Keep |
| `pdfmake` | 14 | PDF | Keep (see PDF audit) |
| `react-hook-form` | 5 | Forms | Keep |
| `i18next` | 3 | i18n | Decision needed |
| `react-i18next` | 3 | i18n | Decision needed |
| `@supabase/supabase-js` | 2 | Backend | Keep |
| `recharts` | 2 | Charting | Keep |
| `react-easy-crop` | 1 | Image crop | Keep |
| `@tanstack/react-table` | 0 | Table | **REMOVE** |
| `@hookform/resolvers` | 0 | Form validation | **REMOVE** |
| `zod` | 0 | Schema validation | **REMOVE** |
| `arabic-persian-reshaper` | 0 | Arabic text | **REMOVE** |
| `noto-sans-arabic` | 0 | Arabic font | **REMOVE** |
