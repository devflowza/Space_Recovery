#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="ssmbegiyjivrcwgcqutu"
TYPES_FILE="src/types/database.types.ts"
TMP=$(mktemp)

if ! command -v supabase >/dev/null 2>&1; then
  echo "FAIL: supabase CLI not installed"
  exit 2
fi

supabase gen types typescript --project-id "$PROJECT_ID" > "$TMP"

if ! diff -q "$TYPES_FILE" "$TMP" > /dev/null; then
  echo "FAIL: $TYPES_FILE is stale relative to the live schema."
  echo ""
  echo "Diff (first 50 lines):"
  diff -u "$TYPES_FILE" "$TMP" | head -50
  echo ""
  echo "Fix: npm run db:types"
  exit 1
fi

echo "OK: types match live schema"
