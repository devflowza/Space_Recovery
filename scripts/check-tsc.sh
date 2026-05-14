#!/usr/bin/env bash
set -euo pipefail

BASELINE_FILE="docs/superpowers/specs/tsc-baseline.count"

if [ ! -f "$BASELINE_FILE" ]; then
  echo "FAIL: baseline file missing: $BASELINE_FILE"
  exit 2
fi

BASELINE=$(cat "$BASELINE_FILE")
CURRENT=$(npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "^src/" || true)

if [ "$CURRENT" -gt "$BASELINE" ]; then
  echo "FAIL: tsc errors increased ($BASELINE to $CURRENT)"
  exit 1
elif [ "$CURRENT" -lt "$BASELINE" ]; then
  echo "OK: tsc errors decreased ($BASELINE to $CURRENT)"
  if [ "${GITHUB_REF:-}" = "refs/heads/main" ] && [ "${GITHUB_EVENT_NAME:-}" = "push" ]; then
    echo "$CURRENT" > "$BASELINE_FILE"
    echo "Baseline lowered to $CURRENT"
  fi
else
  echo "OK: tsc errors unchanged at $CURRENT"
fi
