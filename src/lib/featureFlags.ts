/**
 * featureFlags — app-level build-time feature gates (distinct from the PDF-engine
 * routing flags in `src/lib/pdf/engine/featureFlag.ts`).
 *
 * DEFAULT-ON (opt-out) since Phase 11: with the flag unset, the app uses the new
 * Document Studio flow. Set `VITE_DOC_STUDIO=false` as a kill switch to revert to
 * the legacy Report Studio surface. Only the literal string `'false'` disables it —
 * any other value (unset, `'true'`, `'1'`, …) keeps it ON. These are build-time,
 * ALL-tenants switches.
 */

/**
 * Document Studio — the unified document & reporting redesign
 * (`docs/superpowers/specs/2026-06-27-document-studio-design.md`).
 *
 * Gates the new Document Studio admin surface and the case-side Documents
 * run-time. The legacy Report Studio (`ReportSectionsPage`) and the current
 * report flow are now the fallback. Set `VITE_DOC_STUDIO=false` to disable
 * Document Studio and revert to the legacy flow.
 */
export function isDocStudioEnabled(): boolean {
  const raw = (import.meta.env as Record<string, unknown>).VITE_DOC_STUDIO;
  return raw !== 'false';
}
