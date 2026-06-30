-- C2: DB-level duplicate detection in data_migration_import_batch.
-- Before inserting each row, look for an existing live row (tenant-scoped, not soft-deleted).
-- If found: status='skipped_duplicate' with a reason, DO NOT insert, but STILL write the
-- entity_map (legacy_id -> existing_uuid) so child rows resolve to the existing parent.
--
-- Dedup keys (verified against live schema 2026-07-01):
--   customers_enhanced : metadata.legacy_id  OR  email  OR  phone
--   companies          : name  OR  email
--   cases              : case_number
--   invoices           : invoice_number
--   quotes             : quote_number
-- Children with no business key AND no metadata column (relationships, devices, quoteItems,
-- invoiceLineItems, notes, statusHistory) cannot be deduped against pre-existing live rows
-- (only customers_enhanced has a metadata jsonb column). They rely on the per-run entity_map
-- idempotency that already guards re-runs of the SAME run/file.
--
-- All other semantics (per-row implicit savepoint, parent remap, catalog name resolution,
-- generated-column avoidance, app.importing trigger suppression) are unchanged from the
-- original RPC. Only metadata stamping for customers + the dedup branch are added.

CREATE OR REPLACE FUNCTION public.data_migration_import_batch(
  p_run_id uuid,
  p_entity_type text,
  p_rows jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
  v_row jsonb;
  v_legacy text;
  v_new_id uuid;
  v_existing uuid;
  v_existing_status text;
  v_dupe uuid;
  v_dupe_reason text;
  v_err text;
  v_results jsonb := '[]'::jsonb;
  -- flat parent-ref legacy ids (workbook/export shape: top-level *_legacy_id keys)
  v_customer_legacy text; v_company_legacy text; v_case_legacy text;
  v_quote_legacy text; v_invoice_legacy text;
  -- resolved parents
  v_case uuid; v_customer uuid; v_company uuid; v_quote uuid; v_invoice uuid;
  -- resolved device catalog refs (by name -> uuid; unknown name -> NULL, report-only)
  v_device_type_id uuid; v_brand_id uuid; v_capacity_id uuid;
  v_interface_id uuid; v_condition_id uuid;
  -- dedup helper locals
  v_email text; v_phone text; v_name text;
  v_case_number text; v_invoice_number text; v_quote_number text;
BEGIN
  -- transaction-local: suppress fabricating triggers + permit explicit-tenant inserts
  PERFORM set_config('app.importing', 'true', true);
  PERFORM set_config('app.bypass_tenant_guard', 'true', true);

  SELECT tenant_id INTO v_tenant FROM data_migration_runs WHERE id = p_run_id AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'data_migration run % not found', p_run_id;
  END IF;
  IF v_tenant <> get_current_tenant_id() AND NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Run % belongs to another tenant', p_run_id;
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_legacy := v_row->>'legacy_id';
    v_customer_legacy := NULLIF(v_row->>'customer_legacy_id', '');
    v_company_legacy  := NULLIF(v_row->>'company_legacy_id', '');
    v_case_legacy     := NULLIF(v_row->>'case_legacy_id', '');
    v_quote_legacy    := NULLIF(v_row->>'quote_legacy_id', '');
    v_invoice_legacy  := NULLIF(v_row->>'invoice_legacy_id', '');
    v_new_id := NULL;
    v_err := NULL;
    v_dupe := NULL;
    v_dupe_reason := NULL;

    -- Idempotency (same run): already mapped this (run, entity, legacy_id)?
    SELECT new_id, status INTO v_existing, v_existing_status
    FROM data_migration_entity_map
    WHERE run_id = p_run_id AND entity_type = p_entity_type AND legacy_id = v_legacy;
    IF FOUND AND v_existing_status <> 'error' THEN
      v_results := v_results || jsonb_build_object(
        'legacy_id', v_legacy, 'new_id', v_existing,
        'status', 'skipped_duplicate', 'error', NULL);
      CONTINUE;
    END IF;

    -- Per-row implicit savepoint.
    BEGIN
      -- C2: pre-insert DB-level duplicate detection (tenant-scoped, live rows)
      IF p_entity_type = 'customers' THEN
        v_email := NULLIF(v_row->>'email', '');
        v_phone := NULLIF(v_row->>'phone', '');
        SELECT id INTO v_dupe FROM customers_enhanced
          WHERE tenant_id = v_tenant AND deleted_at IS NULL
            AND metadata->>'legacy_id' = v_legacy LIMIT 1;
        IF v_dupe IS NOT NULL THEN v_dupe_reason := 'existing customer with same legacy_id'; END IF;
        IF v_dupe IS NULL AND v_email IS NOT NULL THEN
          SELECT id INTO v_dupe FROM customers_enhanced
            WHERE tenant_id = v_tenant AND deleted_at IS NULL AND lower(email) = lower(v_email) LIMIT 1;
          IF v_dupe IS NOT NULL THEN v_dupe_reason := 'existing customer with same email'; END IF;
        END IF;
        IF v_dupe IS NULL AND v_phone IS NOT NULL THEN
          SELECT id INTO v_dupe FROM customers_enhanced
            WHERE tenant_id = v_tenant AND deleted_at IS NULL AND phone = v_phone LIMIT 1;
          IF v_dupe IS NOT NULL THEN v_dupe_reason := 'existing customer with same phone'; END IF;
        END IF;

      ELSIF p_entity_type = 'companies' THEN
        v_name := NULLIF(v_row->>'name', '');
        v_email := NULLIF(v_row->>'email', '');
        IF v_name IS NOT NULL THEN
          SELECT id INTO v_dupe FROM companies
            WHERE tenant_id = v_tenant AND deleted_at IS NULL AND lower(name) = lower(v_name) LIMIT 1;
          IF v_dupe IS NOT NULL THEN v_dupe_reason := 'existing company with same name'; END IF;
        END IF;
        IF v_dupe IS NULL AND v_email IS NOT NULL THEN
          SELECT id INTO v_dupe FROM companies
            WHERE tenant_id = v_tenant AND deleted_at IS NULL AND lower(email) = lower(v_email) LIMIT 1;
          IF v_dupe IS NOT NULL THEN v_dupe_reason := 'existing company with same email'; END IF;
        END IF;

      ELSIF p_entity_type = 'cases' THEN
        v_case_number := NULLIF(v_row->>'case_number', '');
        IF v_case_number IS NOT NULL THEN
          SELECT id INTO v_dupe FROM cases
            WHERE tenant_id = v_tenant AND deleted_at IS NULL AND case_number = v_case_number LIMIT 1;
          IF v_dupe IS NOT NULL THEN v_dupe_reason := 'existing case with same case_number'; END IF;
        END IF;

      ELSIF p_entity_type = 'invoices' THEN
        v_invoice_number := NULLIF(v_row->>'invoice_number', '');
        IF v_invoice_number IS NOT NULL THEN
          SELECT id INTO v_dupe FROM invoices
            WHERE tenant_id = v_tenant AND deleted_at IS NULL AND invoice_number = v_invoice_number LIMIT 1;
          IF v_dupe IS NOT NULL THEN v_dupe_reason := 'existing invoice with same invoice_number'; END IF;
        END IF;

      ELSIF p_entity_type = 'quotes' THEN
        v_quote_number := NULLIF(v_row->>'quote_number', '');
        IF v_quote_number IS NOT NULL THEN
          SELECT id INTO v_dupe FROM quotes
            WHERE tenant_id = v_tenant AND deleted_at IS NULL AND quote_number = v_quote_number LIMIT 1;
          IF v_dupe IS NOT NULL THEN v_dupe_reason := 'existing quote with same quote_number'; END IF;
        END IF;
      END IF;

      IF v_dupe IS NOT NULL THEN
        -- Map legacy_id -> existing live uuid so children resolve to the existing parent.
        INSERT INTO data_migration_entity_map (run_id, tenant_id, entity_type, legacy_id, new_id, status, error)
        VALUES (p_run_id, v_tenant, p_entity_type, v_legacy, v_dupe, 'inserted', v_dupe_reason)
        ON CONFLICT (run_id, entity_type, legacy_id)
        DO UPDATE SET new_id = EXCLUDED.new_id, status = 'inserted', error = EXCLUDED.error, updated_at = now();
        v_results := v_results || jsonb_build_object(
          'legacy_id', v_legacy, 'new_id', v_dupe, 'status', 'skipped_duplicate', 'error', v_dupe_reason);
        CONTINUE;
      END IF;

      v_new_id := gen_random_uuid();

      IF p_entity_type = 'companies' THEN
        INSERT INTO companies (id, tenant_id, name, email, phone, website, address, notes, created_at)
        VALUES (v_new_id, v_tenant, v_row->>'name', v_row->>'email', v_row->>'phone',
                v_row->>'website', v_row->>'address', v_row->>'notes',
                COALESCE((v_row->>'created_at')::timestamptz, now()));

      ELSIF p_entity_type = 'customers' THEN
        INSERT INTO customers_enhanced (id, tenant_id, customer_number, customer_name, email, phone, mobile_number, address, notes, metadata, created_at)
        VALUES (v_new_id, v_tenant, v_row->>'customer_number', v_row->>'customer_name', v_row->>'email',
                v_row->>'phone', v_row->>'mobile_number', v_row->>'address', v_row->>'notes',
                jsonb_build_object('legacy_id', v_legacy, 'data_migration_run_id', p_run_id),
                COALESCE((v_row->>'created_at')::timestamptz, now()));

      ELSIF p_entity_type = 'relationships' THEN
        IF v_customer_legacy IS NULL THEN
          RAISE EXCEPTION 'relationship row missing required customer_legacy_id';
        END IF;
        IF v_company_legacy IS NULL THEN
          RAISE EXCEPTION 'relationship row missing required company_legacy_id';
        END IF;
        v_customer := data_migration__resolve(p_run_id, 'customers', v_customer_legacy);
        v_company  := data_migration__resolve(p_run_id, 'companies', v_company_legacy);
        IF v_customer IS NULL OR v_company IS NULL THEN
          RAISE EXCEPTION 'unresolved parent (customer=% company=%)', v_customer_legacy, v_company_legacy;
        END IF;
        INSERT INTO customer_company_relationships (id, tenant_id, customer_id, company_id, role, is_primary, created_at)
        VALUES (v_new_id, v_tenant, v_customer, v_company, v_row->>'role',
                COALESCE((v_row->>'is_primary')::boolean, false),
                COALESCE((v_row->>'created_at')::timestamptz, now()));

      ELSIF p_entity_type = 'cases' THEN
        IF v_customer_legacy IS NULL THEN
          RAISE EXCEPTION 'case row missing required customer_legacy_id';
        END IF;
        v_customer := data_migration__resolve(p_run_id, 'customers', v_customer_legacy);
        IF v_customer IS NULL THEN
          RAISE EXCEPTION 'unresolved customer %', v_customer_legacy;
        END IF;
        v_company := CASE WHEN v_company_legacy IS NOT NULL
                          THEN data_migration__resolve(p_run_id, 'companies', v_company_legacy)
                          ELSE NULL END;
        IF v_company_legacy IS NOT NULL AND v_company IS NULL THEN
          RAISE EXCEPTION 'unresolved company %', v_company_legacy;
        END IF;
        INSERT INTO cases (id, tenant_id, case_number, customer_id, company_id, status, subject, description, created_at)
        VALUES (v_new_id, v_tenant, v_row->>'case_number', v_customer, v_company, v_row->>'status',
                COALESCE(v_row->>'subject', v_row->>'title'), v_row->>'description',
                COALESCE((v_row->>'created_at')::timestamptz, now()));

      ELSIF p_entity_type = 'devices' THEN
        IF v_case_legacy IS NULL THEN
          RAISE EXCEPTION 'device row missing required case_legacy_id';
        END IF;
        v_case := data_migration__resolve(p_run_id, 'cases', v_case_legacy);
        IF v_case IS NULL THEN RAISE EXCEPTION 'unresolved case %', v_case_legacy; END IF;
        SELECT id INTO v_device_type_id FROM catalog_device_types
          WHERE lower(name) = lower(NULLIF(v_row->>'device_type','')) LIMIT 1;
        SELECT id INTO v_brand_id FROM catalog_device_brands
          WHERE lower(name) = lower(NULLIF(v_row->>'brand','')) LIMIT 1;
        SELECT id INTO v_capacity_id FROM catalog_device_capacities
          WHERE lower(name) = lower(NULLIF(v_row->>'capacity','')) LIMIT 1;
        SELECT id INTO v_interface_id FROM catalog_interfaces
          WHERE lower(name) = lower(NULLIF(v_row->>'interface','')) LIMIT 1;
        SELECT id INTO v_condition_id FROM catalog_device_conditions
          WHERE lower(name) = lower(NULLIF(v_row->>'condition','')) LIMIT 1;
        INSERT INTO case_devices (id, tenant_id, case_id, device_type_id, brand_id, capacity_id, interface_id, condition_id,
                                  model, serial_number, symptoms, notes, created_at)
        VALUES (v_new_id, v_tenant, v_case,
                v_device_type_id, v_brand_id, v_capacity_id, v_interface_id, v_condition_id,
                v_row->>'model', v_row->>'serial_number', v_row->>'symptoms', v_row->>'notes',
                COALESCE((v_row->>'created_at')::timestamptz, now()));

      ELSIF p_entity_type = 'quotes' THEN
        IF v_case_legacy IS NULL THEN
          RAISE EXCEPTION 'quote row missing required case_legacy_id';
        END IF;
        v_case := data_migration__resolve(p_run_id, 'cases', v_case_legacy);
        IF v_case IS NULL THEN RAISE EXCEPTION 'unresolved case %', v_case_legacy; END IF;
        INSERT INTO quotes (id, tenant_id, quote_number, case_id, status, subtotal, tax_amount, total_amount, notes, created_at)
        VALUES (v_new_id, v_tenant, v_row->>'quote_number', v_case, v_row->>'status',
                COALESCE((v_row->>'subtotal')::numeric, 0), COALESCE((v_row->>'tax_amount')::numeric, 0),
                COALESCE((v_row->>'total_amount')::numeric, 0), v_row->>'notes',
                COALESCE((v_row->>'created_at')::timestamptz, now()));

      ELSIF p_entity_type = 'quoteItems' THEN
        IF v_quote_legacy IS NULL THEN
          RAISE EXCEPTION 'quoteItem row missing required quote_legacy_id';
        END IF;
        v_quote := data_migration__resolve(p_run_id, 'quotes', v_quote_legacy);
        IF v_quote IS NULL THEN RAISE EXCEPTION 'unresolved quote %', v_quote_legacy; END IF;
        INSERT INTO quote_items (id, tenant_id, quote_id, description, quantity, unit_price, total, sort_order, created_at)
        VALUES (v_new_id, v_tenant, v_quote, v_row->>'description',
                COALESCE((v_row->>'quantity')::numeric, 1), COALESCE((v_row->>'unit_price')::numeric, 0),
                COALESCE((v_row->>'total')::numeric, 0), COALESCE((v_row->>'sort_order')::int, 0),
                COALESCE((v_row->>'created_at')::timestamptz, now()));

      ELSIF p_entity_type = 'invoices' THEN
        IF v_case_legacy IS NULL THEN
          RAISE EXCEPTION 'invoice row missing required case_legacy_id';
        END IF;
        v_case := data_migration__resolve(p_run_id, 'cases', v_case_legacy);
        IF v_case IS NULL THEN RAISE EXCEPTION 'unresolved case %', v_case_legacy; END IF;
        INSERT INTO invoices (id, tenant_id, invoice_number, case_id, status, subtotal, tax_amount, total_amount, notes, created_at)
        VALUES (v_new_id, v_tenant, v_row->>'invoice_number', v_case, COALESCE(v_row->>'status','draft'),
                COALESCE((v_row->>'subtotal')::numeric, 0), COALESCE((v_row->>'tax_amount')::numeric, 0),
                COALESCE((v_row->>'total_amount')::numeric, 0), v_row->>'notes',
                COALESCE((v_row->>'created_at')::timestamptz, now()));

      ELSIF p_entity_type = 'invoiceLineItems' THEN
        IF v_invoice_legacy IS NULL THEN
          RAISE EXCEPTION 'invoiceLineItem row missing required invoice_legacy_id';
        END IF;
        v_invoice := data_migration__resolve(p_run_id, 'invoices', v_invoice_legacy);
        IF v_invoice IS NULL THEN RAISE EXCEPTION 'unresolved invoice %', v_invoice_legacy; END IF;
        INSERT INTO invoice_line_items (id, tenant_id, invoice_id, description, quantity, unit_price, tax_amount, total, sort_order, created_at)
        VALUES (v_new_id, v_tenant, v_invoice, v_row->>'description',
                COALESCE((v_row->>'quantity')::numeric, 1), COALESCE((v_row->>'unit_price')::numeric, 0),
                COALESCE((v_row->>'tax_amount')::numeric, 0), COALESCE((v_row->>'total')::numeric, 0),
                COALESCE((v_row->>'sort_order')::int, 0),
                COALESCE((v_row->>'created_at')::timestamptz, now()));

      ELSIF p_entity_type = 'notes' THEN
        IF v_case_legacy IS NULL THEN
          RAISE EXCEPTION 'note row missing required case_legacy_id';
        END IF;
        v_case := data_migration__resolve(p_run_id, 'cases', v_case_legacy);
        IF v_case IS NULL THEN RAISE EXCEPTION 'unresolved case %', v_case_legacy; END IF;
        INSERT INTO case_internal_notes (id, tenant_id, case_id, content, created_at)
        VALUES (v_new_id, v_tenant, v_case, COALESCE(v_row->>'content',''),
                COALESCE((v_row->>'created_at')::timestamptz, now()));

      ELSIF p_entity_type = 'statusHistory' THEN
        IF v_case_legacy IS NULL THEN
          RAISE EXCEPTION 'statusHistory row missing required case_legacy_id';
        END IF;
        v_case := data_migration__resolve(p_run_id, 'cases', v_case_legacy);
        IF v_case IS NULL THEN RAISE EXCEPTION 'unresolved case %', v_case_legacy; END IF;
        INSERT INTO case_job_history (id, tenant_id, case_id, action, old_value, new_value, created_at)
        VALUES (v_new_id, v_tenant, v_case, COALESCE(v_row->>'action','STATUS_CHANGED'),
                v_row->>'old_value', v_row->>'new_value',
                COALESCE((v_row->>'performed_at')::timestamptz, now()));

      ELSE
        RAISE EXCEPTION 'unknown entity_type %', p_entity_type;
      END IF;

      INSERT INTO data_migration_entity_map (run_id, tenant_id, entity_type, legacy_id, new_id, status)
      VALUES (p_run_id, v_tenant, p_entity_type, v_legacy, v_new_id, 'inserted')
      ON CONFLICT (run_id, entity_type, legacy_id)
      DO UPDATE SET new_id = EXCLUDED.new_id, status = 'inserted', error = NULL, updated_at = now();

      v_results := v_results || jsonb_build_object(
        'legacy_id', v_legacy, 'new_id', v_new_id, 'status', 'inserted', 'error', NULL);

    EXCEPTION WHEN OTHERS THEN
      v_err := SQLERRM;
      INSERT INTO data_migration_entity_map (run_id, tenant_id, entity_type, legacy_id, new_id, status, error)
      VALUES (p_run_id, v_tenant, p_entity_type, v_legacy, NULL, 'error', v_err)
      ON CONFLICT (run_id, entity_type, legacy_id)
      DO UPDATE SET status = 'error', error = v_err, updated_at = now();
      v_results := v_results || jsonb_build_object(
        'legacy_id', v_legacy, 'new_id', NULL, 'status', 'error', 'error', v_err);
    END;
  END LOOP;

  RETURN jsonb_build_object('results', v_results);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.data_migration_import_batch(uuid,text,jsonb) TO authenticated;
