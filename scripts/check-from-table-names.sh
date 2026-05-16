#!/usr/bin/env bash
set -euo pipefail

TYPES_FILE="src/types/database.types.ts"

VALID=$(grep -oE "^      [a-z_]+: \{$" "$TYPES_FILE" | sed -E 's/      ([a-z_]+): \{/\1/' | sort -u)

ALLOWED="$VALID
customers
"

FOUND=$(grep -rhoE "\.from\(['\"][a-z_]+['\"]" src/ \
  | sed -E "s/\.from\(['\"]([a-z_]+)['\"]/\1/" \
  | sort -u)

INVALID=""
while IFS= read -r name; do
  [ -z "$name" ] && continue
  if ! echo "$ALLOWED" | grep -qxF "$name"; then
    INVALID="$INVALID\n  - $name"
  fi
done <<< "$FOUND"

if [ -n "$INVALID" ]; then
  echo "FAIL: Unknown table names in .from() calls (not in $TYPES_FILE):"
  printf '%b\n' "$INVALID"
  echo ""
  echo "Either fix the name or add to ALLOWED list."
  exit 1
fi

echo "OK: every .from() name resolves"
