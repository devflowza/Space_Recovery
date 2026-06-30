-- P0 verification: run via mcp execute_sql on ssmbegiyjivrcwgcqutu.
-- Every column must be TRUE.
WITH
tables AS (
  SELECT
    to_regclass('public.data_migration_runs')       IS NOT NULL AS runs_exists,
    to_regclass('public.data_migration_entity_map') IS NOT NULL AS map_exists
),
rls AS (
  SELECT
    bool_and(relrowsecurity AND relforcerowsecurity) AS both_rls_forced
  FROM pg_class
  WHERE oid IN ('public.data_migration_runs'::regclass, 'public.data_migration_entity_map'::regclass)
),
isolation AS (
  SELECT
    bool_and(EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=t
        AND policyname = t || '_tenant_isolation' AND permissive='RESTRICTIVE'
    )) AS both_have_restrictive_isolation
  FROM (VALUES ('data_migration_runs'),('data_migration_entity_map')) v(t)
),
triggers AS (  -- tenant-table-requirements self-check: set_<table>_tenant_and_audit present
  SELECT
    bool_and(EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = ('public.'||t)::regclass
        AND tgname = 'set_'||t||'_tenant_and_audit'
    )) AS both_have_tenant_audit_trigger
  FROM (VALUES ('data_migration_runs'),('data_migration_entity_map')) v(t)
),
indexes AS (  -- idx_<table>_tenant_id partial index present
  SELECT
    bool_and(EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname='public' AND tablename=t AND indexname='idx_'||t||'_tenant_id'
    )) AS both_have_tenant_index
  FROM (VALUES ('data_migration_runs'),('data_migration_entity_map')) v(t)
),
unique_idx AS (
  SELECT
    EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='uq_data_migration_runs_active_import')   AS runs_uq,
    EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='uq_data_migration_entity_map_legacy')    AS map_uq
),
guards AS (
  SELECT
    pg_get_functiondef('public.log_device_received_custody'::regproc)        LIKE '%app.importing%' AS device_guard,
    pg_get_functiondef('public.post_invoice_vat_record'::regproc)            LIKE '%app.importing%' AS invoice_guard,
    pg_get_functiondef('public.seed_portal_customer_subscriptions'::regproc) LIKE '%app.importing%' AS portal_guard
),
legacy AS (
  SELECT
    (SELECT count(*) FROM information_schema.tables
       WHERE table_schema='public'
         AND table_name IN ('import_export_templates','import_export_jobs','import_export_logs','import_field_mappings')) = 0 AS legacy_tables_gone,
    (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname LIKE 'lookup_%') = 0 AS lookup_fns_gone
)
SELECT * FROM tables, rls, isolation, triggers, indexes, unique_idx, guards, legacy;
