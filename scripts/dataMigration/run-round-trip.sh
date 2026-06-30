#!/usr/bin/env bash
# scripts/dataMigration/run-round-trip.sh
# Manual round-trip smoke test.
# Usage:
#   INTEGRATION_DB_TEST=true \
#   VITE_SUPABASE_URL=https://ssmbegiyjivrcwgcqutu.supabase.co \
#   VITE_SUPABASE_ANON_KEY=<key> \
#   bash scripts/dataMigration/run-round-trip.sh
#
# What it runs:
#   1. Generates a 200-customer fixture in memory (seed=99, proportional children)
#   2. Builds it into a .xlsx workbook via buildWorkbook
#   3. Parses the .xlsx back via parseWorkbook + computeFileHash
#   4. Calls runImport -> data_migration_create_run, _import_batch (x11 entities), _finalize
#   5. Asserts entity map counts via data_migration_entity_map select
#   6. Asserts trigger counts (custody/VAT/portal) unchanged
#   7. Runs a second import with the same hash; asserts 0 new inserts
#   8. Prints a PASS / FAIL summary
#
# This is the full round-trip test in a headless-friendly format for CI integration.
set -euo pipefail
INTEGRATION_DB_TEST=true \
  npx vitest run --project=node \
  src/lib/dataMigration/__tests__/roundTrip.integration.test.ts \
  --reporter=verbose
