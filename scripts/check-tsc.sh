#!/usr/bin/env bash
set -euo pipefail

BASELINE_FILE="docs/superpowers/specs/tsc-baseline.count"

if [ ! -f "$BASELINE_FILE" ]; then
  echo "FAIL: baseline file missing: $BASELINE_FILE"
  exit 2
fi

BASELINE=$(cat "$BASELINE_FILE")
if ! [[ "$BASELINE" =~ ^[0-9]+$ ]]; then
  echo "FAIL: baseline file does not contain a non-negative integer: '$BASELINE'"
  exit 2
fi

# Capture tsc output and exit code separately. tsc exits non-zero whenever it
# emits diagnostics, which is normal for this gate. But a true tooling failure
# (missing binary, OOM, bad tsconfig) emits no diagnostics, so we treat
# "non-zero exit + zero diagnostic lines" as a tooling crash, not "all clean".
TSC_EXIT=0
TSC_OUT=$(npx tsc --noEmit -p tsconfig.app.json 2>&1) || TSC_EXIT=$?
CURRENT=$(printf '%s\n' "$TSC_OUT" | grep -c "^src/" || true)

if [ "$TSC_EXIT" -ne 0 ] && [ "$CURRENT" -eq 0 ]; then
  echo "FAIL: tsc invocation failed (exit $TSC_EXIT) with no diagnostics — likely a tooling error"
  echo "--- tsc output (last 20 lines): ---"
  printf '%s\n' "$TSC_OUT" | tail -20
  exit 2
fi

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
