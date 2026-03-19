# xSuite Table Name Mapping

## Migration Date: 2026-03-19
## Migration Version: 14 migrations applied

---

## Naming Convention

| Prefix | Scope | Example |
|--------|-------|---------|
| `geo_` | Global | `geo_countries`, `geo_cities` |
| `catalog_` | Global | `catalog_device_brands`, `catalog_service_types` |
| `master_` | Global | `master_case_statuses`, `master_industries` |
| `system_` | Global | `system_settings`, `system_seed_status` |
| `platform_` | Platform | `platform_admins`, `platform_audit_logs` |
| `tenant_` | Platform | `tenant_subscriptions`, `tenant_health_metrics` |
| `subscription_` | Platform | `subscription_plans` |
| `billing_` | Platform | `billing_invoices`, `billing_events` |
| `case_` | Tenant | `cases`, `case_devices` |
| `customer_` | Tenant | `customers_enhanced`, `customer_groups` |
| `invoice_` | Tenant | `invoices`, `invoice_line_items` |
| `quote_` | Tenant | `quotes`, `quote_items` |
| `purchase_` | Tenant | `purchase_orders`, `purchase_order_items` |
| `expense_` | Tenant | `expenses`, `expense_attachments` |
| `payment_` | Tenant | `payments`, `payment_allocations` |
| `inventory_` | Tenant | `inventory_items`, `inventory_transactions` |
| `stock_` | Tenant | `stock_items`, `stock_movements` |
| `asset_` | Tenant | `assets`, `asset_assignments` |
| `supplier_` | Tenant | `suppliers`, `supplier_contacts` |
| `employee_` | Tenant | `employees`, `employee_documents` |
| `payroll_` | Tenant | `payroll_records`, `payroll_periods` |
| `leave_` | Tenant | `leave_requests`, `leave_balances` |
| `kb_` | Tenant | `kb_articles`, `kb_categories` |

---

## Complete Rename Mapping (Old → New)

### Geography

| Old Name | New Name |
|----------|----------|
| `countries` | `geo_countries` |
| `cities` | `geo_cities` |

### Device & Service Catalogs

| Old Name | New Name |
|----------|----------|
| `brands` | `catalog_device_brands` |
| `device_types` | `catalog_device_types` |
| `capacities` | `catalog_device_capacities` |
| `device_encryption` | `catalog_device_encryption` |
| `device_form_factors` | `catalog_device_form_factors` |
| `device_interfaces` | `catalog_device_interfaces` |
| `device_made_in` | `catalog_device_made_in` |
| `device_head_no` | `catalog_device_head_counts` |
| `device_platter_no` | `catalog_device_platter_counts` |
| `device_roles` | `catalog_device_roles` |
| `device_conditions` | `catalog_device_conditions` |
| `device_component_statuses` | `catalog_device_component_statuses` |
| `interfaces` | `catalog_interfaces` |
| `accessories` | `catalog_accessories` |
| `donor_compatibility_matrix` | `catalog_donor_compatibility_matrix` |
| `service_types` | `catalog_service_types` |
| `service_locations` | `catalog_service_locations` |
| `service_problems` | `catalog_service_problems` |
| `service_catalog_categories` | `catalog_service_categories` |
| `service_line_items_catalog` | `catalog_service_line_items` |

### Master Data

| Old Name | New Name |
|----------|----------|
| `industries` | `master_industries` |
| `currency_codes` | `master_currency_codes` |
| `case_priorities` | `master_case_priorities` |
| `case_statuses` | `master_case_statuses` |
| `case_report_templates` | `master_case_report_templates` |
| `invoice_statuses` | `master_invoice_statuses` |
| `quote_statuses` | `master_quote_statuses` |
| `purchase_order_statuses` | `master_purchase_order_statuses` |
| `leave_types` | `master_leave_types` |
| `payment_methods` | `master_payment_methods` |
| `expense_categories` | `master_expense_categories` |
| `transaction_categories` | `master_transaction_categories` |
| `template_categories` | `master_template_categories` |
| `template_types` | `master_template_types` |
| `template_variables` | `master_template_variables` |
| `modules` | `master_modules` |
| `inventory_categories` | `master_inventory_categories` |
| `inventory_condition_types` | `master_inventory_condition_types` |
| `inventory_item_categories` | `master_inventory_item_categories` |
| `inventory_status_types` | `master_inventory_status_types` |
| `supplier_categories` | `master_supplier_categories` |
| `supplier_payment_terms` | `master_supplier_payment_terms` |
| `payroll_components` | `master_payroll_components` |

### System

| Old Name | New Name |
|----------|----------|
| `settings` | `system_settings` |
| `seed_status` | `system_seed_status` |

---

## Tables That Kept Their Names

### Platform & Auth
`tenants`, `profiles`, `platform_admins`, `platform_audit_logs`, `platform_announcements`, `platform_metrics`, `tenant_impersonation_sessions`, `subscription_plans`, `plan_features`, `tenant_subscriptions`, `tenant_payment_methods`, `tenant_activity_log`, `tenant_health_metrics`, `billing_invoices`, `billing_invoice_items`, `billing_events`, `billing_coupons`, `coupon_redemptions`, `usage_records`, `usage_snapshots`, `support_tickets`, `support_ticket_messages`, `announcement_dismissals`, `onboarding_progress`, `signup_otps`

### Cases
`cases`, `case_devices`, `case_attachments`, `case_communications`, `case_diagnostics`, `case_engineers`, `case_follow_ups`, `case_internal_notes`, `case_job_history`, `case_milestones`, `case_portal_visibility`, `case_qa_checklists`, `case_recovery_attempts`, `case_quotes`, `case_quote_items`, `case_reports`, `case_report_sections`

### Chain of Custody
`chain_of_custody`, `chain_of_custody_access_log`, `chain_of_custody_integrity_checks`, `chain_of_custody_transfers`

### Customers & Companies
`customers_enhanced`, `customer_groups`, `customer_communications`, `customer_company_relationships`, `companies`, `company_documents`, `company_settings`, `ndas`, `portal_link_history`

### Financial
`invoices`, `invoice_line_items`, `quotes`, `quote_items`, `quote_history`, `payments`, `payment_allocations`, `payment_receipts`, `payment_disbursements`, `receipts`, `receipt_allocations`, `expenses`, `expense_attachments`, `financial_transactions`, `financial_audit_logs`, `bank_accounts`, `bank_transactions`, `bank_reconciliation_sessions`, `account_balance_snapshots`, `account_transfers`, `reconciliation_matches`, `accounting_locales`, `tax_rates`, `vat_records`, `vat_returns`, `vat_transactions`

### Inventory & Stock
`inventory_items`, `inventory_locations`, `inventory_assignments`, `inventory_case_assignments`, `inventory_photos`, `inventory_reservations`, `inventory_search_templates`, `inventory_status_history`, `inventory_transactions`, `inventory_parts_usage`, `stock_items`, `stock_categories`, `stock_locations`, `stock_movements`, `stock_adjustments`, `stock_adjustment_sessions`, `stock_adjustment_session_items`, `stock_alerts`, `stock_price_history`, `stock_sales`, `stock_sale_items`, `stock_serial_numbers`, `stock_transactions`, `clone_drives`, `resource_clone_drives`, `device_diagnostics`

### Suppliers
`suppliers`, `supplier_contacts`, `supplier_communications`, `supplier_documents`, `supplier_audit_trail`, `supplier_performance_metrics`, `supplier_products`, `purchase_orders`, `purchase_order_items`

### HR & Payroll
`departments`, `positions`, `employees`, `employee_documents`, `employee_salary_config`, `employee_salary_components`, `employee_salary_structures`, `employee_loans`, `loan_repayments`, `attendance_records`, `timesheets`, `leave_balances`, `leave_requests`, `salary_components`, `payroll_settings`, `payroll_periods`, `payroll_records`, `payroll_record_items`, `payroll_adjustments`, `payroll_bank_files`, `performance_reviews`, `onboarding_checklists`, `onboarding_checklist_items`, `onboarding_tasks`, `recruitment_jobs`, `recruitment_candidates`

### Assets
`asset_categories`, `assets`, `asset_assignments`, `asset_depreciation`, `asset_maintenance`

### Documents & Templates
`document_templates`, `templates`, `template_versions`, `number_sequences`, `number_sequences_audit`, `role_module_permissions`

### System & Logs
`system_logs`, `audit_trails`, `database_backups`, `pdf_generation_logs`, `user_preferences`, `user_sidebar_preferences`, `user_activity_sessions`, `user_activity_logs`, `user_sessions`, `branches`

### Knowledge Base
`kb_categories`, `kb_articles`, `kb_tags`, `kb_article_tags`, `kb_article_versions`

### Import/Export
`import_export_templates`, `import_export_jobs`, `import_export_logs`, `import_field_mappings`

### Views
`customers` (compatibility view over `customers_enhanced`), `v_chain_of_custody_timeline`

---

## Report Section Tables (No Prefix — Global)
`report_section_library`, `report_section_presets`, `report_template_section_mappings`
