# Migration Manifest

Every applied migration must appear here. Verified by `scripts/check-migration-manifest.sh`.

| version | filename | classification | summary | PR |
|---|---|---|---|---|
| 20260407100420 | 20260407100420_populate_country_phone_codes.sql | (historical) | populate_country_phone_codes | |
| 20260409000000 | 20260409000000_baseline_schema.sql | (historical) | baseline_schema | |
| 20260409104128 | fix_schema_mismatches_for_frontend | (historical) | fix_schema_mismatches_for_frontend | |
| 20260409114712 | add_profile_fks_for_postgrest_joins | (historical) | add_profile_fks_for_postgrest_joins | |
| 20260513174236 | add_tenants_theme_column | (historical) | add_tenants_theme_column | |
| 20260514074316 | add_log_case_checkout_function_and_portal_visibility_unique | (historical) | add_log_case_checkout_function_and_portal_visibility_unique | |
| 20260514075237 | portal_auth_password_verification_p0_1 | (historical) | portal_auth_password_verification_p0_1 | |
| 20260514081548 | add_tenant_audit_trigger_to_customer_company_relationships | (historical) | add_tenant_audit_trigger_to_customer_company_relationships | |
