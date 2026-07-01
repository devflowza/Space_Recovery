-- Clean-slate retirement of the legacy import/export DB objects (design §10).
-- Verified in P0.1/P0.4 Step 1: the ONLY callers (importExportService.ts and
-- the importExport wizard files) are deleted, so no non-import caller remains.
-- All 4 tables are 0-row. Order: drop FK-child tables before parents.

DROP TABLE IF EXISTS public.import_field_mappings CASCADE;
DROP TABLE IF EXISTS public.import_export_logs    CASCADE;
DROP TABLE IF EXISTS public.import_export_jobs    CASCADE;
DROP TABLE IF EXISTS public.import_export_templates CASCADE;

-- Import-only catalog resolvers (single caller = the deleted importExportService).
-- The new engine does its own catalog resolution (src/lib/dataMigration/catalogResolver.ts).
DROP FUNCTION IF EXISTS public.lookup_brand(text);
DROP FUNCTION IF EXISTS public.lookup_capacity(text);
DROP FUNCTION IF EXISTS public.lookup_condition_type(text);
DROP FUNCTION IF EXISTS public.lookup_country(text);
DROP FUNCTION IF EXISTS public.lookup_device_type(text);
DROP FUNCTION IF EXISTS public.lookup_interface(text);
DROP FUNCTION IF EXISTS public.lookup_status_type(text);
DROP FUNCTION IF EXISTS public.lookup_storage_location(text);
