#!/usr/bin/env bash
set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "FAIL: SUPABASE_DB_URL not set"
  exit 2
fi

MANIFEST="supabase/migrations.manifest.md"
APPLIED=$(psql "$SUPABASE_DB_URL" -A -t -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;")

MISSING=""
while IFS= read -r version; do
  [ -z "$version" ] && continue
  if ! grep -q "| $version |" "$MANIFEST"; then
    MISSING="$MISSING\n  - $version"
  fi
done <<< "$APPLIED"

if [ -n "$MISSING" ]; then
  echo "FAIL: Migrations applied but missing from $MANIFEST:"
  printf '%b\n' "$MISSING"
  exit 1
fi

echo "OK: manifest is complete"
