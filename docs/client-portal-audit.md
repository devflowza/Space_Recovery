# Client Portal Audit — 2026-05-14

## Executive Summary

The client portal is structurally complete but functionally broken and insecure. Three top risks dominate everything else:

1. **The portal "authenticates" with no password check.** `authenticate_portal_customer` (DB function, SECURITY DEFINER) returns a session for any email whose `portal_enabled=true` and `portal_password_hash IS NOT NULL` — the function body literally contains the comment "Password verification would happen here via extension". Any customer email becomes a master key.
2. **Most portal queries 400 silently** due to schema drift. `portal_visible`, `visible_to_customer`, `customer_response`, `customer_responded_at`, `customer_viewed_at`, `download_count`, `version_number`, `report_type`, `currency`, `title`, `description`, `communication_type`, `case_number`, `service_type` are all referenced by portal pages but do not exist on the live tables. Six of seven portal pages have at least one broken `.eq('portal_visible', true)` filter or `.select('non-existent-column')` shape.
3. **Tenant isolation depends on a Supabase Auth session the portal never establishes.** Portal customers are stored in `sessionStorage`, not `auth.users`. The Supabase client therefore runs as anon. `get_current_tenant_id()` returns `NULL`. The RESTRICTIVE policy `tenant_id = get_current_tenant_id() OR is_platform_admin()` evaluates to `NULL OR false`, which RLS treats as deny — so the broken-column 400s are masking a separate failure: even if columns existed, no rows would be returned. There is no portal-aware RLS predicate (`customer_id = current_setting('jwt.claims.customer_id')` or similar) anywhere.

These three together mean: today, the portal is mostly broken; the moment schema drift is "fixed" by adding the missing columns and the moment RLS gets a permissive path for anon, anyone in the world who knows a customer email will be able to log in and read that tenant's data without a password. The fix order matters.

---

## Critical Issues (P0 — fix before next customer ships)

### P0.1 Password is not verified

`authenticate_portal_customer` does not call any password hashing extension (pgcrypto / `crypt()`) — see DB function body retrieved at audit time. The TypeScript layer (`src/contexts/PortalAuthContext.tsx:103-124`) trusts whatever the RPC returns. Net effect: any known customer email logs in.

Fix outline: rewrite the function to verify `portal_password_hash = crypt(p_password, portal_password_hash)` using `pgcrypto`, enforce `portal_locked_until > now()` short-circuit, increment `portal_failed_login_attempts`, and only return the JSON on real match. Also update `change_portal_password` to hash with `crypt(p_new_password, gen_salt('bf'))`.

### P0.2 No real session — sessionStorage is the only auth proof

`src/contexts/PortalAuthContext.tsx:130-132` stores the customer object in `sessionStorage` and treats its presence as authentication. There is no signed token. Anyone with browser dev-tools access can set `sessionStorage.portal_customer = '{"id":"<any uuid>", "customer_name":"X", ...}'` and the portal renders.

Fix outline: issue a short-lived signed JWT (HS256 or use Supabase custom claims) from `authenticate_portal_customer`, attach via `supabase.auth.setSession()` or a custom header, and validate server-side via an RLS policy that checks `auth.jwt() ->> 'role' = 'portal_customer' AND auth.jwt() ->> 'customer_id' = customer_id::text`.

### P0.3 Schema drift makes most portal pages dead on arrival

The portal references columns that do not exist on live tables (verified against `information_schema`):

| File:line | Column referenced | Reality |
|---|---|---|
| `src/pages/portal/PortalDashboard.tsx:37,38,61,62,90` | `cases.portal_visible`, `case_quotes.portal_visible` | Neither column exists |
| `src/pages/portal/PortalCases.tsx:67` | `cases.portal_visible` | Does not exist |
| `src/pages/portal/PortalCases.tsx:18,20` | `cases.summary`, `cases.due_date` | Live schema has `description`, `estimated_completion` |
| `src/pages/portal/PortalQuotes.tsx:12-29,56-62,89-90` | `case_quotes.portal_visible`, `title`, `description`, `currency`, `customer_response`, `customer_responded_at`, and `cases.case_no,title` join | Most of those columns do not exist on `case_quotes` (only `quote_number`, `status`, `total_amount`, etc.) |
| `src/pages/portal/PortalReports.tsx:45-67` | `case_reports.visible_to_customer`, `report_type`, `version_number`, `sent_to_customer_at`, `customer_viewed_at`, `customer_downloaded_at`, `download_count`, `cases.case_number`, `cases.service_type` | None exist on live `case_reports` (only `id, tenant_id, case_id, template_id, report_number, title, status, content, generated_at, generated_by, created_by, created_at, updated_at, deleted_at`) |
| `src/pages/portal/PortalCommunications.tsx:14,32-38` | `customer_communications.portal_visible`, `communication_type` | Live has `type`, no `portal_visible` |
| `src/components/cases/detail/CasePortalTab.tsx:13-25` | `case_portal_visibility.show_device_details, show_quotes, ...` | Already worked around (lines 67-86 stuff them in `visible_fields` jsonb) — but the rest of the portal then never reads `visible_fields` to gate visibility, so the toggles are inert. |

Why it matters: every page crashes its main query with a PostgREST 400 ("column does not exist"). Users see empty states or the spinner forever depending on how the error is swallowed. The dashboard stats card permanently shows zeroes.

Fix outline (catalog, not fix-it-now): for each broken column, either (a) add the column with a sane default and gate via that column, or (b) rewrite the query to use the gating model that actually exists (`case_portal_visibility.is_visible` + jsonb `visible_fields`). The right answer is (b): the portal should JOIN `case_portal_visibility` on `case_id` and filter `WHERE is_visible = true`. Reports/communications need analogous gating tables or columns added.

### P0.4 portal_enabled and portal_maintenance_mode are configured but never enforced

`isPortalEnabled()` and `isPortalInMaintenanceMode()` (`src/lib/portalUrlService.ts:94-102`) exist and work; nothing calls them. `ProtectedPortalRoute` (`src/components/ProtectedPortalRoute.tsx`) only checks `customer`. `PortalLayout` (`src/components/layout/PortalLayout.tsx`) does not gate either. Result: tenants who toggle the portal off in settings can still be logged into.

Fix outline: in `ProtectedPortalRoute`, query `getPortalSettings()` once on mount; if `!portal_enabled`, render a "Portal disabled" splash; if `portal_maintenance_mode`, render `portal_maintenance_message`. Both should short-circuit before child render.

### P0.5 File upload size limit is configurable but unused

`portal_max_file_size_mb` is exposed in `ClientPortalSettings.tsx:614-628`. Grep for `portal_max_file_size_mb` in `src/pages/portal/**` returns zero matches. `portal_allow_file_uploads` likewise unused — and the portal in fact has no file-upload UI at all. The toggles do nothing.

Fix outline: either (a) add the upload UI to `PortalCases` and enforce the size limit client-side + server-side via Supabase Storage policies, or (b) hide the toggles until that ships.

### P0.6 Session timeout (portal_session_timeout) is unused

Configured (default 1440 min = 24h) but `sessionStorage` already auto-clears on browser-tab close. There is no idle-timeout, no token expiry, no "you've been logged out" UX. A laptop left logged in stays logged in forever within a single tab.

Fix outline: track `last_activity_at` in `sessionStorage`; on any route change or query, compare against timeout; force logout + redirect if exceeded.

---

## High-Priority Improvements (P1 — within next sprint)

### P1.1 No password reset flow

`PortalLogin.tsx` has no "Forgot password?" link. `PortalSettings.tsx` only supports authenticated password change. If a customer forgets their password their only path is to contact support, who will then need a staff-side "reset portal password" UI (which also does not exist in `CasePortalTab` or elsewhere). Required for any production launch.

### P1.2 No MFA / 2FA

Data recovery customers are by definition high-trust (their data is the sensitive thing). Add TOTP or email-OTP at minimum.

### P1.3 Portal does not inherit tenant theme/branding

`ThemeProvider` (`src/contexts/ThemeContext.tsx:34-47`) reads from `TenantConfigContext`, which reads from `useAuth().profile.tenant_id`. Portal customers do not populate `AuthContext` (they use `PortalAuthContext`), so `profile?.tenant_id` is null, `getTenantConfig` is never called, the theme stays on `DEFAULT_THEME` (royal). Effect: every tenant's portal looks identical regardless of their chosen branding, and the `portal_custom_logo_url` configured in settings is never read.

`PortalLayout.tsx:39` hardcodes the literal title "Customer Portal" rather than rendering `portal_custom_logo_url`, the tenant name, or the configured brand mark.

Fix outline: introduce a `PortalTenantConfigProvider` that resolves tenant_id from `customers_enhanced.tenant_id` (via `customer.id`) and feeds the same `getTenantConfig` path; render `portal_custom_logo_url` in the header; apply theme via `document.documentElement.dataset.theme`.

### P1.4 PortalLogin has no rate-limit / lockout UX feedback

`PortalAuthContext.tsx:80-119` does track lockout, but the message is generic. No countdown timer, no email-the-user-on-lockout, no admin notification on N failed attempts. Also: lockout is tracked in `sessionStorage` so closing the tab resets it (defeats the purpose). The DB columns `portal_failed_login_attempts` and `portal_locked_until` exist on `customers_enhanced` but the RPC never writes to them.

### P1.5 Tenant admins not notified of portal events

No audit/notification when:
- a customer registers (if self-registration is on)
- a customer hits lockout
- a customer approves/rejects a quote
- a customer views a report

Add to `audit_trails` and surface in a "Portal Activity" admin pane.

### P1.6 PortalReports modal uses single() instead of maybeSingle()

`src/pages/portal/PortalReports.tsx:267` — `supabase.from('case_reports').select('*').eq('id', reportId).single()` will throw if the report is deleted between list and view. Per CLAUDE.md project rules, use `maybeSingle()`.

### P1.7 PortalReports view modal renders raw HTML

`src/pages/portal/PortalReports.tsx:318` injects sanitized HTML via React's raw-HTML escape hatch. `sanitizeHtml` does exist; verify it covers SVG `onload`, `javascript:` URLs in `<a>`, and `<style>` injection. Worth a security review pass — and ideally swap to DOMPurify if not already used.

### P1.8 Accessibility gaps

- `CasePortalTab.tsx:163-169` and `192-203` build a custom toggle from a hidden checkbox + a clickable div. The visible `div` has no `role="switch"`, no `aria-checked`, no keyboard handler. Tabbing into the row does nothing visible.
- `PortalLogin.tsx:36-44` — error region not announced (`role="alert"` / `aria-live="polite"` missing).
- `PortalDashboard.tsx:144-172` — stats card icons not marked `aria-hidden`; screen reader reads "FileText".
- `PortalCases.tsx:188` — entire card is `onClick`, but card is not `role="button"` and is not keyboard-activatable. Same on Quotes, Reports, Purchases. Hitting Enter does not open the modal.
- `PortalReports.tsx:294-329` — modal is `position:fixed` with backdrop but no focus trap, no `role="dialog"`, no `aria-modal="true"`, no ESC handler, no focus restoration on close. The reusable `Modal` component does this; this hand-rolled modal does not.

### P1.9 Mobile UX

- `PortalLayout.tsx:90-110` — mobile nav is a horizontal scroller of all 7 items. Active state is visible only if scrolled into view. A drawer or bottom-tab pattern would be much better on phones (the most likely portal device).
- `PortalQuotes` quote-detail modal includes a wide `<table>` of items (`PortalQuotes.tsx:312-352`) that overflows on phones with no horizontal scroll wrapper.
- `PortalReports` view modal (`PortalReports.tsx:295`) is `max-w-4xl w-full mx-4` which is fine, but `max-h-[90vh]` plus nested scrolling means the close button can scroll out of view; sticky header recommended.

### P1.10 Error states are missing across the board

Every page uses `useQuery` but only handles `isLoading`. If the network fails, queries that return broken-column-400 silently log via `logger.error` and the page just shows the empty state. The customer thinks they have no cases. No `isError` branch in any of: `PortalDashboard`, `PortalCases`, `PortalQuotes`, `PortalCommunications`, `PortalPurchasesPage`, `PortalReports`.

### P1.11 No portal-customer profile self-service

`PortalSettings.tsx` only handles password change. Customers cannot update their phone, email, profile photo, billing address, notification preferences, or even see their own profile info beyond what's in the header. The `customers_enhanced` table supports all of that.

---

## Medium-Priority Improvements (P2 — within next month)

### P2.1 No real-time updates

Supabase realtime is available; the portal polls via TanStack Query. Subscribing to `cases` updates filtered to `customer_id` would mean status changes propagate live without refresh. High-value for a data-recovery customer obsessively checking status.

### P2.2 No notifications (email or in-app)

`auto_notify_status_change`, `auto_notify_quote_ready`, `auto_notify_device_ready` toggles in `CasePortalTab.tsx:114-118` are stored but never trigger anything. There is no edge function listening for case status changes, no `send-document-email` invocation tied to these flags.

### P2.3 No payment integration

Portal has invoices nowhere (no `PortalInvoices` page) and no Stripe / PayPal / bank-transfer flow. `payments`, `payment_allocations`, `invoices` tables exist but are entirely staff-side.

### P2.4 No document signing flow

NDAs are central to data recovery. `ndas` table exists; no portal page sends/signs them. No e-signature widget.

### P2.5 No support ticket creation

`support_tickets` and `support_ticket_messages` tables exist for platform-level support; nothing exposes them in the portal. A customer who has a question can only use the (currently broken because of P0.3) communications feed which is one-way.

### P2.6 No knowledge base / FAQ inline

`kb_articles`, `kb_categories` exist tenant-scoped. Surfacing a small "Common questions" widget on the dashboard would deflect support volume.

### P2.7 No search / filter / sort / pagination on lists

`PortalCases.tsx`, `PortalQuotes.tsx`, `PortalReports.tsx`, `PortalCommunications.tsx`, `PortalPurchasesPage.tsx` all fetch everything and render unfiltered. Customers with > 20 cases will scroll forever. Add a text filter at minimum; status-chip filter and date sort would be small wins.

### P2.8 Customer-uploaded attachments

There is no UI for a customer to upload a photo of their device, proof of payment, or a signed authorization form. `case_attachments` table exists. `portal_allow_file_uploads` toggle exists but does nothing.

### P2.9 Multi-customer / company-level access

`companies` and `customer_company_relationships` tables exist. There is no concept in the portal of a corporate user managing multiple cases across many employees' devices. Today one portal login = one customer. Enterprise sales will hit this limit fast.

### P2.10 PDF download for quotes & invoices from portal

Reports have download (`PortalReports.tsx:88-99`). Quotes do not. `reportPDFService.downloadReportPDF` exists; analogous `quotePDFService` / `invoicePDFService` should be wired into the portal.

### P2.11 Account activity log / login history

Customers should be able to see their own recent logins (where, when, IP) — standard security hygiene. Backed by `customers_enhanced.portal_last_login` (single field) today; should be a real `portal_login_history` table.

---

## Low-Priority / Future (P3+)

- Light/dark mode toggle for portal (currently light only).
- In-portal chat with assigned engineer (Supabase realtime + `case_communications`).
- Mobile native wrapper (Capacitor) for push notifications.
- Customer-facing case-priority / urgency upgrade purchase ("upgrade to expedited recovery").
- Customer rating / NPS after case close.
- Multi-language UI selector at portal level (independent from tenant `bilingual` setting).
- Localized currency display via tenant config (today portal hardcodes `'USD'` in `PortalPurchasesPage.tsx:11`).
- Webauthn / passkey login.
- "Magic link" passwordless login as an alternative to passwords.

---

## Bilingual Support Gaps

Zero portal pages use `useDocumentTranslations()`. Grep confirms 12 files use the hook; none are in `src/pages/portal/` or `src/components/layout/PortalLayout.tsx`. Every portal-facing string is hardcoded English:

- `src/components/layout/PortalLayout.tsx:39` — "Customer Portal"
- `src/components/layout/PortalLayout.tsx:23-29` — nav labels: "Dashboard", "My Cases", "Quotes", "Reports", "My Purchases", "Messages", "Settings"
- `src/components/layout/PortalLayout.tsx:121` — footer text
- `src/pages/portal/PortalLogin.tsx:34-35,47,57,77-80` — login page copy, button label
- `src/pages/portal/PortalDashboard.tsx:130-134,144,156,168,178,209,218,232-234` — every label/heading
- `src/pages/portal/PortalCases.tsx:168-170,177-179,250,260,266,270,278,283,294,313,318` — every label, status text, badges echo raw enum string
- `src/pages/portal/PortalQuotes.tsx:187-190,197,237,277-279,295,309,316-319,343,358-361,404-417,449-462` — labels, modal copy, button text
- `src/pages/portal/PortalReports.tsx:114,116,124,130-131,142-148,155,217,227,284` — labels, status text via `reportTypes.ts` config (which itself is English-only)
- `src/pages/portal/PortalCommunications.tsx:88-90,97-99,142` — labels, "No communications yet", "From:" prefix
- `src/pages/portal/PortalPurchasesPage.tsx:86-87,97,108,119,129,136-137,209,253` — labels
- `src/pages/portal/PortalSettings.tsx:55-57,67-68,76-77,86,94,103,113,123-129,134-138` — labels and password-requirements list

RTL handling: no portal page sets `dir="rtl"` based on tenant locale. `documentTranslations.isRTLLanguage()` is never called from portal code. With Arabic enabled, the entire portal renders LTR with Arabic text awkwardly mixed in.

Suggested approach: pull the `useDocumentTranslations()` hook into `PortalLayout` (and surface `isRTL` to a wrapper `<div dir={isRTL ? 'rtl' : 'ltr'}>`), build a portal-specific translations key set in `documentTranslations.ts`, and wrap every hardcoded string. The status/priority enums (`'pending_approval'`, `'in-progress'`, etc.) should map through a translation table rather than be rendered raw.

---

## Suggested Settings Page Additions

Things tenant admins should be able to configure but cannot today:

1. **Portal email templates** — separate welcome email, password reset, quote ready, case status change. Today the `auto_notify_*` flags exist per-case but no template editor exists.
2. **Default per-case visibility template** — when a new case is created, what should `case_portal_visibility` look like? Today every case gets unchecked toggles by default and staff must opt in case-by-case.
3. **Preview-as-customer mode** — a "View portal as customer X" button on `CasePortalTab` and on `ClientPortalSettings`. Today admins have no way to see what their customer actually sees without creating a test customer login.
4. **Password complexity rules** — minimum length, symbol/number requirements, max age, history reuse limit.
5. **Failed-login alerting** — "email me when a customer hits 5 failures" toggle + recipient.
6. **Allowed login countries / IP allowlist** — relevant for high-value B2B recoveries.
7. **Custom CSS / theme override per tenant** — portal currently cannot even pick up tenant theme (P1.3) so this is moot until that lands, but should be on the roadmap.
8. **Portal subdomain / vanity URL** — `portal_base_url` exists but there is no path to provision DNS / certificates automatically.
9. **Required acceptance of T&Cs on first login** — the URLs are stored but never gated.
10. **Default communication channel preference** (email vs SMS vs in-portal) — per-customer override should be on the customer profile.
11. **MFA enforcement policy** — "require MFA for all portal customers" / "optional" / "off".
12. **Self-registration approval gate** — `portal_allow_self_registration` is binary today. A "registrations require staff approval" middle state is the realistic default.

---

## Out of Scope / Already Known (Schema-Drift Catalog)

These are findings, not fix targets in this audit. They go on the schema-drift sprint backlog. Each row is `file:line` versus DB reality.

- `PortalDashboard.tsx:37,38,61,62,90` — `portal_visible` does not exist on `cases` or `case_quotes`
- `PortalCases.tsx:18,20,67` — `cases.summary`, `cases.due_date`, `cases.portal_visible` do not exist; correct columns are `description`, `estimated_completion`, none-yet-for-portal-flag
- `PortalQuotes.tsx:12-29` — `case_quotes` has no `title`, `description`, `currency`, `customer_response`, `customer_responded_at`, `portal_visible`; live columns are `quote_number, status, subtotal, tax_amount, discount_amount, total_amount, notes, valid_until, approved_at, approved_by, created_by`
- `PortalQuotes.tsx:89,107` — calls `approve_quote` / `reject_quote` RPCs; both exist (good) but signatures should be re-verified once column drift is resolved
- `PortalReports.tsx:45-67` — `case_reports` has no `visible_to_customer`, `report_type`, `version_number`, `sent_to_customer_at`, `customer_viewed_at`, `customer_downloaded_at`, `download_count`; live columns are `report_number, title, status, content, generated_at, generated_by`
- `PortalReports.tsx:59-63` — `cases.case_number` exists (good) but `cases.service_type` does not (live has `service_type_id`)
- `PortalCommunications.tsx:14,32` — `customer_communications.communication_type` and `portal_visible` do not exist; live has `type`
- `CasePortalTab.tsx:13-25` vs `case_portal_visibility` actual columns — `show_device_details`, `show_quotes`, `show_invoices`, `show_reports`, `show_attachments`, `show_technical_details`, `show_device_password`, `show_important_data`, `show_accessories`, `show_status_updates`, `auto_notify_*` are all stuffed into `visible_fields` jsonb (workaround already in code at line 67-86); the portal then never reads `visible_fields` so the toggles are inert
- `PortalPurchasesPage.tsx:11` — currency hardcoded `'USD'` instead of using `useCurrencyConfig()` (also a violation of project rule "Do not hardcode currency symbols")
- `PortalDashboard.tsx:42-45` — case status strings (`'received'`, `'diagnosis'`, `'in-progress'`, `'waiting-approval'`) hardcoded; live `cases.status` is text but actual values are driven by `master_case_statuses` which the portal does not consult

Recommended sprint action: introduce a `portal_visible` column on `cases`, `case_quotes`, `customer_communications`, `case_reports` (or, better, gate via `case_portal_visibility` joins everywhere) AND regenerate `database.types.ts` AND rewire each portal page to the actual columns. This is one focused 1-2 day sprint.

---

## Quick Wins (under 30 minutes each)

1. **Wire portal_maintenance_mode and portal_enabled** into `ProtectedPortalRoute`. ~20 min. Single fetch + conditional render.
2. **Use useCurrencyConfig()** in `PortalPurchasesPage.tsx:10-12` instead of `Intl.NumberFormat('en-US', 'USD')`. Will require porting the portal-side tenant config story (see P1.3) so maybe 45 min, but the swap itself is one line.
3. **Add role="dialog" and aria-modal="true"** to the hand-rolled modal in `PortalReports.tsx:294`. Five-minute a11y win.
4. **Add isError branches** to all six portal `useQuery` calls. Render a small Card with a retry button. ~20 min per page; could be a shared `<QueryErrorState>` component, 30 min total.
5. **Add a "Forgot password?" link** on `PortalLogin.tsx` that opens a `mailto:` to `portal_support_email`. Stopgap until P1.1 lands. 5 min.
6. **Mark stats-card icons aria-hidden="true"** in `PortalDashboard.tsx`, `PortalPurchasesPage.tsx`. 5 min each.
7. **Replace single() with maybeSingle()** in `PortalReports.tsx:267`. 1 min.
8. **Render portal_custom_logo_url** in `PortalLayout.tsx` header instead of the literal "Customer Portal" string when configured. 10 min.
9. **Render portal_support_email / portal_support_phone** in the portal footer when set. 10 min.
10. **Render portal_terms_url / portal_privacy_url** as links on `PortalLogin.tsx` below the form. 5 min.
11. **Add role="button" and onKeyDown Enter handler** to the cards-as-buttons in `PortalCases`, `PortalQuotes`, `PortalReports`, `PortalPurchasesPage`. ~15 min each, 60 min total.
12. **Render case_portal_visibility.custom_message** somewhere visible on `PortalCases` case detail. Today it is saved but never displayed. 10 min.
13. **Replace generic loading spinners with `<Skeleton>` rows** matching the list shape on Cases / Quotes / Communications. Reduces layout shift. 30 min per page.
14. **Add `<title>` plus meta tags per portal route** (page title set in `useEffect`) so browser tabs do not all say "xSuite". 15 min via shared hook.
15. **Move the Logout button to the user-avatar dropdown** instead of a separate button taking nav space on mobile. 15 min.

---

# Security Deep-Dive Addendum — 2026-05-14

This addendum re-examines the portal with fresh queries against the live DB, the on-disk edge functions, and the actual `sanitizeHtml` implementation. Where it disagrees with the first audit, it cites the evidence directly.

## Critical (P0) — additional findings

### P0.7 Cross-tenant data leak via PERMISSIVE `USING (true)` SELECT policies

Every portal-readable table I queried has a PERMISSIVE SELECT policy with `qual = 'true'`:

| Table | Policy | qual |
|---|---|---|
| `cases` | `cases_select` | `true` |
| `case_quotes` | `case_quotes_select` | `true` |
| `case_reports` | `case_reports_select` | `true` |
| `case_report_sections` | `case_report_sections_select` | `true` |
| `case_devices` | `case_devices_select` | `true` |
| `case_attachments` | `case_attachments_select` | `true` |
| `case_portal_visibility` | `case_portal_visibility_select` | `true` |
| `customer_communications` | `customer_communications_select` | `true` |
| `customers_enhanced` | `customers_enhanced_select` | `true` |
| `quotes` | `quotes_select` | `true` |

The RESTRICTIVE `*_tenant_isolation` policy (`tenant_id = get_current_tenant_id() OR is_platform_admin()`) is supposed to AND with these. Today the portal is broken (P0.2) so this is academic — but the moment portal customers are issued a real `auth.users` session (the fix path the first audit recommends) that session will resolve `get_current_tenant_id()` to the customer's tenant_id and the RESTRICTIVE gate becomes a no-op against cross-customer queries inside the same tenant. With `qual: true` SELECT, customer A can `from('cases').select('*')` and read every case in their tenant, not just their own. The portal queries happen to filter `customer_id` client-side, but the DB does not enforce it. A motivated customer using browser dev-tools can change the query.

The same applies to UPDATE policies: every portal-readable table has a PERMISSIVE UPDATE policy with `qual: "true", with_check: "true"`. A portal customer with a real session could `update({status:'completed'}).eq('id', anyCaseId)` on any case in their tenant. RESTRICTIVE tenant isolation does not block this; only the missing portal-scoped policy would.

Fix outline: add a portal-customer-scoped predicate to every SELECT/UPDATE policy, e.g. `qual: "(NOT is_portal_user()) OR customer_id = (auth.jwt() ->> 'customer_id')::uuid"`. For `case_quotes`/`case_reports` which lack `customer_id` directly, scope via `EXISTS (SELECT 1 FROM cases WHERE cases.id = case_quotes.case_id AND cases.customer_id = ...)`.

### P0.8 Portal `approve_quote` / `reject_quote` calls wrong-tenant, never authenticates customer, and signature drift will cause 400

Two distinct issues:

1. **Function signature mismatch (immediate 400)**. The live `approve_quote` accepts only `(p_quote_id uuid)` and the live `reject_quote` accepts `(p_quote_id uuid, p_reason text)`. The portal calls them with `{ p_quote_id, p_customer_response }` (`PortalQuotes.tsx:89-92, 107-110`). PostgREST will reject the call because of the unknown named parameter `p_customer_response`. Net effect: no portal customer can approve or reject any quote today.
2. **`get_current_tenant_id()` returns NULL for the portal session**. Both functions have `WHERE id = p_quote_id AND tenant_id = get_current_tenant_id()` (`pg_get_functiondef` confirmed). The portal customer's anon session has no `tenant_id` claim, so the predicate evaluates `tenant_id = NULL` which is `NULL`, the UPDATE matches zero rows, and the RPC silently no-ops. Even if signatures were correct the function would do nothing.
3. **Worse: the functions also do not check `customer_id`**. The match is only on `tenant_id`. If a staff user with a real auth session were to call this through any code path with a quote_id from a *different* customer in the same tenant, the function would update it. Today the portal is the only caller, but the function itself is unsafe — a portal customer with stolen staff credentials, or any staff user with any role (including `viewer`), can approve/reject any quote in the tenant. There is no role check on these `SECURITY DEFINER` functions.
4. **`approve_quote` references `quotes.status_id`**, but the table the portal actually filters on is `case_quotes` (no `status_id` column, only `status`). Two different quote tables, two different sets of columns. Calling `approve_quote` from the portal — even if the param-name mismatch were resolved — would write to the wrong table.

Fix outline: rewrite both functions to (a) take `p_customer_id uuid`, (b) verify the JWT claim, (c) check the quote belongs to that customer via `EXISTS (SELECT 1 FROM cases c WHERE c.id = case_quotes.case_id AND c.customer_id = p_customer_id)`, and (d) target the correct table (`case_quotes`, not `quotes`).

### P0.9 Stored XSS in `PortalReports` via incomplete `sanitizeHtml`

`src/lib/sanitizeHtml.ts` is a hand-rolled DOM walker with an attribute whitelist of exactly one entry: `style`. It deserves close reading because `PortalReports.tsx:318` injects `section.section_content` via `dangerouslySetInnerHTML`. Anything a staff user puts in a report section is rendered as HTML in the portal browser of every customer who views the report. The sanitizer covers some vectors but not others:

Covered:
- Disallowed tags (`<script>`, `<iframe>`, `<img>`, `<a>`, `<svg>`, `<style>`, `<link>`, `<object>`, `<embed>`, etc.) are stripped (the tag is unwrapped, children are kept). This means `<img src=x onerror=...>` is removed entirely — good, since `img` is not in `ALLOWED_TAGS`. **But** the children are kept, so `<script>alert(1)</script>` becomes the text `alert(1)` — safe.
- Inline `style` values with `javascript:`, `expression(`, `url(`, `@import`, `import(` are stripped by `BLOCKED_VALUE_PATTERNS`.
- `style` whitelist only allows 5 properties.

NOT covered (each is exploitable):
- **`on*` event-handler attributes on allowed tags.** `ALLOWED_ATTRIBUTES = ['style']` — the code only copies `style`, so `<p onclick="...">` does have the handler stripped on copy. Good in theory. But: when an element's tag is NOT in the allow-list, the sanitizer recursively keeps its children (line 32-39). The CHILDREN of a `<div onmouseover="...">` survive. However the `<div>` tag itself IS in the allow-list, so this specific case is safe — but tags like `<form>`, `<button>`, `<input>` (not in allow-list) get their event handlers dropped only because the tag is dropped. The real risk is in allowed tags carrying event-handler attributes: `<p onclick="alert(1)">x</p>` — the new `<p>` is created via `document.createElement('p')` and only `style` is copied. **This branch is safe**. Confirmed by re-reading lines 42-56.
- **Style value with CSS-injected `behaviour:url(...)` or IE-specific `binding`** — `BLOCKED_VALUE_PATTERNS` catches `url(`, but not `behaviour:` or `-moz-binding`. Low risk on modern browsers.
- **Style-based exfiltration via `background-color: url(...)`** — `url(` IS blocked, good.
- **Text-decoration / color value with closing `;` and CSS escape sequences** like `color: red;}body{background:url(...)`. The split-on-`;` strategy splits one entry at a time, and the entire value (post the colon) is regex-checked for blocked patterns — but the value itself can contain a literal `}`. The browser is then tolerant of `<p style="color: red;}body{...">` if it's reflected directly — but since the sanitizer serializes back via `setAttribute('style', sanitized.join('; '))`, the `}` would survive into the attribute value. The browser parses inline style attribute values without re-entering selector context, so `}` is harmless inside an inline `style=`. **Safe.**
- **Unicode/IDN homograph attacks in style colors** — irrelevant.
- **Nested unallowed tags inside allowed text** — covered (children re-walked).
- **`<style>` blocks in the source HTML** — `style` is not in `ALLOWED_TAGS`, so the tag itself is dropped, but its children (the CSS text) become a text node. Net effect: arbitrary CSS leaks as visible text. Not a security risk but is a UX bug — a staff user who pastes a CSS block will see it rendered as gibberish in customer browsers.

Net assessment: the sanitizer is **mostly safe for the script-execution vectors** but is fragile and not battle-tested. It does not use `<template>`/inert DOM (it parses with `DOMParser` then walks `document.body.childNodes`, which is fine because the parsed doc is a separate Document). The single most concerning gap is that this is a custom sanitizer in a code base that prohibits adding npm packages without checking — when the actual industry standard (`DOMPurify`) is one `npm install` away and has been battle-tested for a decade.

Recommendation: swap `sanitizeHtml` to call `DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })` from `dompurify`. The custom code can stay as a fallback. Until then, every place this is rendered should be treated as semi-trusted output. There is no XSS today *that I could verify*, but the surface area is small and the cost of a miss is portal-wide cross-customer compromise.

### P0.10 `PortalReports.handleView` issues an UPDATE that the database lets through

`PortalReports.tsx:79-83` calls:
```ts
await supabase.from('case_reports').update({ customer_viewed_at: ... }).eq('id', reportId).is('customer_viewed_at', null);
```
- `customer_viewed_at` does not exist on `case_reports` (confirmed via `information_schema.columns`). PostgREST returns 400, the await fails silently because there is no error handler, and the modal opens regardless.
- If the column were added (per the first audit's recommendation), the `case_reports_update` PERMISSIVE policy is `qual: true, with_check: true` — meaning ANY authenticated user could update ANY report. Combined with the broken portal auth (P0.2), today this is moot, but on the fix path this becomes a real "any portal customer can mutate any report" risk.

## High (P1) — additional findings

### P1.12 Edge functions trust `Origin` header to choose the CORS allowlist response

All six edge functions (`paypal-webhook`, `paypal-create-subscription`, `paypal-cancel-subscription`, `send-document-email`, `send-otp-email`, `user-management`, `provision-tenant`) use the pattern:
```ts
const origin = req.headers.get('Origin') || '';
return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
```
A non-allowlisted origin still gets back `Access-Control-Allow-Origin: https://xsuite.space`. Browsers will reject the response because the echoed origin doesn't match the requester. **This is safe.** The concern is `ALLOWED_ORIGINS[0]` always being `https://xsuite.space` — if that domain were ever attacker-controlled (via DNS takeover, dangling subdomain), every edge function would happily process its requests. Add explicit `Vary: Origin` to all responses too — currently absent, which means caches can fan-out the wrong origin.

### P1.13 `send-document-email` accepts arbitrary HTML body and arbitrary `to` from any authenticated staff user

`send-document-email/index.ts:123-258` validates email format and rate-limits 5/60s/user, but the `body` is sent as `html` directly to recipients via Gmail SMTP. Any staff user with `owner|admin|technician|sales|accounts|hr` (i.e., not just admins — the function does not check role beyond `getUser()` succeeding) can send arbitrary HTML email from the tenant's Gmail account to any address. Spam/phishing risk via stolen staff credentials. Recommend (a) restrict to `manager+` role, (b) enforce a per-tenant daily email cap, (c) strip remote `<img>` and `<script>` from `body` before send.

### P1.14 `send-otp-email` allows OTP enumeration via "code expired or not found" vs "Too many attempts"

`send-otp-email/index.ts:104-170` returns different messages based on whether the email has an OTP row, after a 3/300s rate limit. An attacker can enumerate which emails are mid-signup. Standard fix: return a single generic message for all error states.

Additionally, `send-otp-email` uses `crypto.getRandomValues` for OTP generation (good) but stores the OTP as plain text in `signup_otps.otp_code` (`otpRecord.otp_code !== otp_code`, line 220). If the table is ever leaked, in-flight OTPs are usable. Hash with `crypt(...)`.

### P1.15 Service-role key reused across all edge functions, no audit trail

Every edge function (`provision-tenant`, `user-management`, `send-document-email`, `send-otp-email`, `paypal-*`) creates a service-role Supabase client and uses it for both read and write. No edge function inserts to `audit_trails` or `platform_audit_logs` to record what the service role did. A compromised edge function or a stolen `SUPABASE_SERVICE_ROLE_KEY` (which would appear in `.env`/Supabase secrets) leaves no forensic trail. Recommendation: every service-role mutation should log to `platform_audit_logs` with `actor=edge:<function_name>`, `acting_user_id=<auth.uid from JWT>`.

### P1.16 `paypal-webhook` skips signature verification in sandbox

`paypal-webhook/index.ts:146-148`:
```ts
} else {
  console.log("Sandbox mode: skipping webhook signature verification");
}
```
Anyone who can hit the webhook URL in sandbox can forge a `BILLING.SUBSCRIPTION.ACTIVATED` event with arbitrary `custom_id` (tenant_id) and toggle that tenant to `subscription_status='active'`. Plus, the function returns 200 to unsigned requests — a sandbox-only setup is fine if sandbox never points at production data, but the table being updated is `tenants.subscription_status` which is the SAME row used in production gating logic. If `PAYPAL_MODE` is misconfigured (env var not set, defaults to `"sandbox"`), production traffic flows through unverified. **Strong recommendation: refuse to start if `PAYPAL_MODE` is unset.**

### P1.17 `provision-tenant` self-service flow allows new tenant creation with no email verification gate

Lines 123-130: `if (!authHeader) { /* self-service */ rate-limit 3/3600/IP }`. There is no check that `adminEmail` belongs to anyone — the function creates the auth user, marks `email_confirm: true` (lines 226-229), and grants `role: 'owner'`. Combined with the OTP enumeration in P1.14, an attacker can: (1) call `send-otp-email` with a target email to discover whether it has a pending OTP, (2) call `provision-tenant` (no auth header) with a chosen email to provision a tenant under that email. The new tenant is theirs; the email owner is locked out unless they request a password reset. The 3/3600/IP rate-limit is bypassable from cloud egress pools. The `signup_otps.verified` check is NEVER consulted by `provision-tenant` — OTP verification is enforced only client-side.

### P1.18 CSP allows `'unsafe-inline'` styles

`index.html:7`:
```
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
```
`'unsafe-inline'` for styles permits style-injection vectors like CSS exfiltration. Since the app uses Tailwind (build-time CSS, no inline `<style>` blocks expected in production), this can be removed. Test first — `@react-pdf/renderer` and toast libraries sometimes inject inline styles, in which case use a nonce.

Other CSP observations:
- `img-src 'self' data: blob: https:` — `https:` is a wide-open wildcard for any HTTPS image source. Recommend tightening to `https://*.supabase.co https://*.googleusercontent.com` (or whichever explicit hosts).
- `connect-src` is good — explicit Supabase + PayPal only.
- `frame-ancestors` is NOT set. Clickjacking risk: an attacker can iframe the portal and overlay a fake "Approve Quote" button. Add `frame-ancestors 'none'` (or `'self'` if the platform needs to embed itself).
- `report-uri` / `report-to` not set — no CSP violation telemetry. Add a reporting endpoint to know when something is being blocked.
- No `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, or `Permissions-Policy` headers (these need to be set at the host/CDN level — Cloudflare Pages or the reverse proxy — since `<meta>` cannot carry them).

### P1.19 `case_attachments` Storage policies do not enforce tenant or customer scope

The `case-attachments` bucket policies are:
- INSERT: `bucket_id = 'case-attachments'` (any authenticated user, any tenant)
- SELECT: `bucket_id = 'case-attachments'` (any authenticated user, any tenant)
- DELETE: `bucket_id = 'case-attachments'` (any authenticated user, any tenant)

There is no `(storage.foldername(name))[1] = tenant_id` or `(storage.foldername(name))[1] = (auth.jwt() ->> 'customer_id')` constraint. Once an authenticated user knows a storage path, they can read or download any case attachment in any tenant, regardless of which tenant the user belongs to. This is the largest cross-tenant data-leak vector in the system and it is independent of the portal. Recommend (a) embed `tenant_id` as the first path component, (b) policy `(storage.foldername(name))[1] = get_current_tenant_id()::text`.

`profile-photos` is private with proper per-user scoping (good). `customer-profile-photos`, `company-assets`, `company-qrcodes`, `staff-profile-avatars` are all `public: true` — anyone on the internet can list them if they know the bucket+path. Customer profile photos being public is borderline acceptable (most apps do this) but should be a conscious decision.

## Medium (P2) — additional findings

### P2.12 No `case_quotes.customer_id`, no `quotes.customer_id` direct portal scope

Confirmed via `information_schema.columns`:
- `case_quotes` columns: `id, tenant_id, case_id, quote_number, status, subtotal, tax_amount, discount_amount, total_amount, notes, valid_until, approved_at, approved_by, created_by, created_at, updated_at, deleted_at`. No `customer_id`, no `title`, no `description`, no `currency`, no `customer_response*`, no `portal_visible`.
- `quotes` table HAS `customer_id` (queried directly) — the portal uses the wrong table.

The portal's quote-related queries are doubly broken: wrong table + wrong columns. A correct portal implementation should either query `quotes` directly (filtered by `customer_id`) OR continue using `case_quotes` but join to `cases.customer_id` (which is what the current code attempts at `PortalQuotes.tsx:58-60`, but still asks for nonexistent columns `title, description, currency, customer_response, customer_responded_at, portal_visible`).

### P2.13 `cases.case_no` DOES exist (correction to first audit P0.3)

The first audit's catalog says `cases.case_no` does not exist. It does. Both `case_no` and `case_number` exist on the live `cases` table. Use `case_no` (used by `PortalQuotes.tsx:58, 210, 255`) — both work. The columns that genuinely don't exist on `cases` are: `summary`, `due_date`, `service_type`, `portal_visible`.

### P2.14 No HSTS / X-Content-Type-Options / Permissions-Policy at the meta level

See P1.18. These must be set at the CDN/host. If the deployment target is Cloudflare Pages (`space-recovery.pages.dev` is in the allowed origins), a `_headers` file in the build output would do it. Today no such file is in the repo.

### P2.15 `PortalAuthContext` rate limiter is in-memory and per-tab

`src/lib/rateLimiter.ts:13-49` uses an in-memory `Map` that resets every tab open and is bypassable by opening a new tab or incognito. The DB-side rate limiter (`check_rate_limit` RPC, used by edge functions) is not called from `PortalAuthContext` — only client-side `checkRateLimit` is. Combined with the sessionStorage-resettable lockout (first audit P1.4), the entire "5 failed attempts and you're locked" model is defeated by opening a private window. The DB function `authenticate_portal_customer` does increment `portal_failed_login_attempts` and set `portal_locked_until` — that's the real defense — but the portal currently has no UI feedback when the DB returns NULL due to lockout (the message is the generic "Invalid email or password").

### P2.16 `portal_customer` sessionStorage object can be forged (re-confirmation of P0.2 with a twist)

`PortalAuthContext.tsx:43-54` has an `isValidPortalCustomer` type guard, but it only checks types, not signatures. `sessionStorage.setItem('portal_customer', JSON.stringify({id: '00000000-0000-0000-0000-000000000001', customer_number:'X', customer_name:'X', email:'x@x.com', mobile_number:null, profile_photo_url:null}))` will pass validation and render the portal as that customer. Combined with P0.7 / P0.8 (RLS doesn't scope by customer_id), the forged customer can issue any query the portal supports.

## Notes on existing P0 items

- **P0.1 (Password not verified)** — **outdated, partially fixed**. The live `authenticate_portal_customer` (queried via `pg_get_functiondef`) now uses `crypt(p_password, v_customer.portal_password_hash)` with proper bcrypt, increments `portal_failed_login_attempts`, sets `portal_locked_until` after 5 failures, and stamps `portal_last_login` on success. The TODO comment the first audit cited is gone. `pgcrypto` is installed (`pg_extension` confirms). This is no longer a P0; demote to verified-fixed. Audit the upstream of this function (which migration introduced it) to confirm the fix is permanent and not feature-flagged.
- **P0.2 (sessionStorage-only auth)** — **confirmed still open**. See P2.16. The session has no signature and cannot defend against client-side forgery.
- **P0.3 (Schema drift)** — **confirmed and refined**. The first audit's catalog is mostly correct but has minor mistakes: `cases.case_no` does exist (P2.13), and the join chain `case_quotes → cases.customer_id` is technically expressible — the queries just need different column names. The portal's choice of `case_quotes` vs `quotes` is wrong: `case_quotes` has no `customer_id` linkage; `quotes` does. Pick one and rewrite consistently.
- **P0.4–P0.6 (settings toggles dead)** — confirmed by reading `ProtectedPortalRoute.tsx:9-28` (only checks `customer`, no settings consultation), and confirmed `portal_max_file_size_mb` / `portal_allow_file_uploads` / `portal_session_timeout` have zero references in `src/pages/portal/**`.

