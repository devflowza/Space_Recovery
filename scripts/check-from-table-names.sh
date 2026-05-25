#!/usr/bin/env bash
set -euo pipefail

# Extract every `.from('name')` reference in src/, exclude
# `supabase.storage.from(...)` bucket calls, and ensure each remaining
# name is either a real PostgREST table from database.types.ts or the
# `customers` compatibility view.
#
# Implemented in Python because the storage.from() check needs to look
# backwards across line breaks (the call is often formatted as
# `supabase.storage\n  .from('bucket')`), which line-based grep cannot
# handle.

TYPES_FILE="src/types/database.types.ts"

python3 - "$TYPES_FILE" <<'PY'
import os, re, sys

types_path = sys.argv[1]

# Extract valid table names from the generated types file.
table_re = re.compile(r"^      ([a-z_]+): \{$", re.MULTILINE)
with open(types_path) as f:
    valid = set(table_re.findall(f.read()))
valid.add("customers")  # compat view

# Walk src/ and collect every .from('name') NOT preceded by .storage.
from_call_re = re.compile(r"\.from\(\s*['\"]([a-z_-]+)['\"]")
storage_re = re.compile(r"\.storage\s*$", re.DOTALL)
found = set()
for dirpath, _, fnames in os.walk("src"):
    for fn in fnames:
        if not fn.endswith((".ts", ".tsx")):
            continue
        path = os.path.join(dirpath, fn)
        with open(path, encoding="utf-8") as f:
            content = f.read()
        for m in from_call_re.finditer(content):
            ctx = content[max(0, m.start() - 60):m.start()]
            # If the immediately-preceding token chain ends with .storage,
            # this is a storage bucket call, not a postgrest table call.
            if storage_re.search(ctx):
                continue
            found.add(m.group(1))

invalid = sorted(n for n in found if n not in valid)
if invalid:
    print(f"FAIL: Unknown table names in .from() calls (not in {types_path}):\n")
    for n in invalid:
        print(f"  - {n}")
    print("\nEither fix the name or add to ALLOWED list.")
    sys.exit(1)
print("OK: every .from() name resolves")
PY
