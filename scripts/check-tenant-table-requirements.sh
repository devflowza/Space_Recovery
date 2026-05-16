#!/usr/bin/env bash
set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "FAIL: SUPABASE_DB_URL not set"
  exit 2
fi

RESULT=$(psql "$SUPABASE_DB_URL" -A -t -f scripts/check-tenant-table-requirements.sql)

if [ -n "$RESULT" ]; then
  echo "FAIL: Tenant-scoped tables missing required elements:"
  echo "$RESULT"
  exit 1
fi

echo "OK: all tenant-scoped tables conform"
