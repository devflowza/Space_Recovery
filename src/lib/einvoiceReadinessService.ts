// Flag storage: company_settings.metadata.einvoice_readiness — the same
// tenant-scoped metadata bucket as table_columns / list_page_size
// (tablePrefsService pattern). updateCompanySettings enforces owner/admin.
import type { Json } from '../types/database.types';
import {
  getOrCreateCompanySettings,
  updateCompanySettings,
  invalidateCompanySettingsCache,
} from './companySettingsService';
import {
  EINVOICE_READINESS_METADATA_KEY,
  normalizeEInvoiceReadiness,
  type EInvoiceReadiness,
} from './einvoiceReadiness';

export async function getEInvoiceReadiness(): Promise<EInvoiceReadiness> {
  const settings = await getOrCreateCompanySettings();
  const metadata = (settings.metadata ?? {}) as Record<string, unknown>;
  return normalizeEInvoiceReadiness(metadata[EINVOICE_READINESS_METADATA_KEY]);
}

export async function setEInvoiceApplicable(applicable: boolean): Promise<void> {
  const settings = await getOrCreateCompanySettings();
  const metadata = { ...((settings.metadata ?? {}) as Record<string, unknown>) };
  metadata[EINVOICE_READINESS_METADATA_KEY] = {
    applicable,
    marked_at: new Date().toISOString(),
  };
  await updateCompanySettings({ metadata: metadata as Json });
  invalidateCompanySettingsCache();
}
