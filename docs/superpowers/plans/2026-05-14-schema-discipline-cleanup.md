# Schema Discipline Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive `tsc --noEmit -p tsconfig.app.json` to zero errors, install six CI guardrails that make schema drift impossible to merge, and codify the naming standards & migration discipline. Prerequisite for tenant #2 onboarding.

**Architecture:** Ratchet-then-zero on tsc; schema-drift detector regenerates types and diffs them; custom ESLint rule bans legacy table names in `.from()` and in `.select()` embeds; SQL assertion enforces tenant-scoped table requirements (RLS + trigger + index); migration manifest tracks every applied SQL change. All six gates required-status on every PR.

**Tech Stack:** Node 20, TypeScript 5.5, ESLint 9 (flat config), Supabase CLI, GitHub Actions, bash (scripts run on Linux CI; Windows devs use Git Bash or WSL locally).

**Source spec:** `docs/superpowers/specs/2026-05-14-schema-discipline-cleanup-design.md`

---

## File Structure

### New files

| Path | Purpose |
|---|---|
| `scripts/check-tsc.sh` | tsc gate (ratchet in Phase 1, zero in Phase 6) |
| `scripts/check-schema-drift.sh` | Regen types, diff vs committed |
| `scripts/check-tenant-table-requirements.sql` | SQL assertion query |
| `scripts/check-tenant-table-requirements.sh` | psql wrapper for the assertion |
| `scripts/check-migration-manifest.sh` | Verify manifest matches applied migrations |
| `scripts/check-from-table-names.sh` | `.from()` allowlist |
| `eslint-rules/banned-tables.js` | Shared list of banned legacy names |
| `eslint-rules/no-banned-embeds-in-select.js` | Custom rule for embed scanning |
| `.github/workflows/ci.yml` | Orchestrates 6 jobs |
| `.github/PULL_REQUEST_TEMPLATE/migration.md` | Migration PR template |
| `supabase/migrations.manifest.md` | Human-readable migration audit trail |
| `docs/superpowers/specs/2026-05-14-tsc-baseline.txt` | Initial full tsc output |
| `docs/superpowers/specs/tsc-baseline.count` | Single integer; ratchet target |
| `docs/superpowers/specs/2026-05-14-triage.md` | Bucket-classified worksheet (Phase 0) |
| `docs/superpowers/specs/2026-05-14-firedrill-log.md` | One line per guardrail validation |
| `docs/superpowers/specs/2026-05-14-progress-log.md` | tsc count after each merge |

### Modified files

| Path | Why |
|---|---|
| `eslint.config.js` | Add banned-names rule + custom rule + `no-restricted-imports` |
| `package.json` | Add `scripts` entries for the new checks |
| `CLAUDE.md` | Reference naming standards, banned names, guardrails, migration discipline |
| ~25-50 files in `src/` | Schema-drift cleanup (Phases 2-5) |

### Deleted files

| Path | Why |
|---|---|
| `src/components/cases/CloneDriveModal.tsx` | B7 dead code; queries non-existent columns/tables |
| `src/types/database.ts` | Legacy types file; replaced by `database.types.ts` |
| (other B7 files surfaced in triage) | Same |

---

## Phase 0 — Triage

### Task 0.1: Snapshot baseline

**Files:**
- Create: `docs/superpowers/specs/2026-05-14-tsc-baseline.txt`
- Create: `docs/superpowers/specs/tsc-baseline.count`

- [ ] **Step 1: Capture full tsc output**

```bash
mkdir -p docs/superpowers/specs
npx tsc --noEmit -p tsconfig.app.json > docs/superpowers/specs/2026-05-14-tsc-baseline.txt 2>&1 || true
```

Expected: file written; tsc exit ignored (we expect nonzero).

- [ ] **Step 2: Compute baseline count**

```bash
COUNT=$(grep -c "^src/" docs/superpowers/specs/2026-05-14-tsc-baseline.txt)
echo "$COUNT" > docs/superpowers/specs/tsc-baseline.count
echo "Baseline: $COUNT errors"
```

Expected: ~3138.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-14-tsc-baseline.txt docs/superpowers/specs/tsc-baseline.count
git commit -m "chore: snapshot tsc baseline for ratchet (Phase 0)"
```

---

### Task 0.2: Generate triage worksheet skeleton

**Files:**
- Create: `docs/superpowers/specs/2026-05-14-triage.md`

- [ ] **Step 1: Build per-file row list**

```bash
awk -F'(' '/^src\//{print $1}' docs/superpowers/specs/2026-05-14-tsc-baseline.txt \
  | sort | uniq -c | sort -rn \
  | awk '{printf "| %s | %d | ? | (fill) | ? | todo |\n", $2, $1}' \
  > /tmp/triage-rows.txt
wc -l /tmp/triage-rows.txt
```

Expected: ~150-200 rows.

- [ ] **Step 2: Write worksheet**

Create `docs/superpowers/specs/2026-05-14-triage.md` with this content:

```markdown
# Triage Worksheet — Schema Discipline Cleanup

Generated 2026-05-14. Baseline: <count> errors.

## Bucket legend
- B1: Single-root-cause cluster
- B2: Stale embed/query string (SelectQueryError type)
- B3: Stale column read (TS2339/TS2551 on row)
- B4: Stale insert/update keys (TS2353)
- B5: Real type bug
- B6: Unused declarations (TS6133)
- B7: Dead code (whole file references non-existent schema)
- B8: Long tail

## Files

| file | error_count | bucket | root_cause | est_min | status | pr |
|---|---|---|---|---|---|---|
<paste contents of /tmp/triage-rows.txt here>
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-14-triage.md
git commit -m "chore: triage worksheet skeleton (Phase 0)"
```

---

### Task 0.3: Classify top-30 files

**Files:**
- Modify: `docs/superpowers/specs/2026-05-14-triage.md`

- [ ] **Step 1: For each of the top-30 files (highest error_count), read first 5 errors**

```bash
grep "^<filepath>(" docs/superpowers/specs/2026-05-14-tsc-baseline.txt | head -5
```

- [ ] **Step 2: Assign bucket using heuristic**

Per spec §3.3:
- All TS2339 same property → B3
- "SelectQueryError" appears in error message → B2
- Lazy imports / shared component generic → B1
- Whole-file drift, no live consumers → B7 (verify with grep)
- TS6133 → B6
- Else → B5 or B8

Record bucket + one-sentence root_cause in worksheet row.

- [ ] **Step 3: Sum estimated effort**

```bash
awk -F'|' 'NR>4{sum+=$6} END{print "Total est minutes:", sum}' docs/superpowers/specs/2026-05-14-triage.md
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-14-triage.md
git commit -m "chore: classify top-30 files (Phase 0)"
```

---

### Task 0.4: Validate prediction with 10 random spot-checks

**Files:**
- Modify: `docs/superpowers/specs/2026-05-14-triage.md`

- [ ] **Step 1: Pick 10 random files outside top-30**

```bash
awk -F'|' 'NR>34 && NF>2 {print $2}' docs/superpowers/specs/2026-05-14-triage.md | shuf -n 10
```

- [ ] **Step 2: Classify each**

Same heuristic as Task 0.3.

- [ ] **Step 3: Check prediction**

Compare distribution vs. spec §3.4. If B5 > 40% in the sample, update spec's predictions section and adjust Phase 5 estimate.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-14-triage.md
git commit -m "chore: validate triage prediction with 10 spot-checks"
```

---

### Task 0.5: Initialize progress log

**Files:**
- Create: `docs/superpowers/specs/2026-05-14-progress-log.md`

- [ ] **Step 1: Write log**

```markdown
# Schema Discipline Cleanup — Progress Log

| Date | Phase | Merged | tsc count |
|------|-------|--------|-----------|
| 2026-05-14 | 0 (baseline) | — | <initial count> |
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-05-14-progress-log.md
git commit -m "chore: initialize cleanup progress log"
```

---

## Phase 1 — Install ratchet gate

### Task 1.1: Write check-tsc.sh (ratchet form)

**Files:**
- Create: `scripts/check-tsc.sh`

- [ ] **Step 1: Create directory and script**

```bash
mkdir -p scripts
```

Then write `scripts/check-tsc.sh`:

```bash
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
```

- [ ] **Step 2: Make executable and run locally**

```bash
chmod +x scripts/check-tsc.sh
bash scripts/check-tsc.sh
```

Expected: "OK: tsc errors unchanged at <baseline>"

- [ ] **Step 3: Commit**

```bash
git add scripts/check-tsc.sh
git commit -m "feat(ci): tsc ratchet script (Phase 1)"
```

---

### Task 1.2: Create CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create directories**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Write workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: bash scripts/check-tsc.sh
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat(ci): typecheck workflow with ratchet (Phase 1)"
```

---

### Task 1.3: Add npm script alias

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add check:tsc to scripts**

In `package.json`, add inside `"scripts"`:

```json
    "check:tsc": "bash scripts/check-tsc.sh",
```

- [ ] **Step 2: Verify**

```bash
npm run check:tsc
```

Expected: "OK: tsc errors unchanged at <baseline>"

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add check:tsc npm script"
```

---

### Task 1.4: Validate ratchet with deliberate failure

- [ ] **Step 1: Add a TS error on a temp branch**

```bash
git checkout -b cleanup/ratchet-firedrill
echo "const __ratchet_test: number = 'oops';" > src/__ratchet_test.ts
```

- [ ] **Step 2: Run gate locally**

```bash
bash scripts/check-tsc.sh; echo "exit=$?"
```

Expected: "FAIL: tsc errors increased ..." with exit code 1.

- [ ] **Step 3: Clean up**

```bash
rm src/__ratchet_test.ts
bash scripts/check-tsc.sh
git checkout main
git branch -D cleanup/ratchet-firedrill
```

Expected: "OK: tsc errors unchanged at <baseline>"

- [ ] **Step 4: Log the fire drill**

Append to `docs/superpowers/specs/2026-05-14-firedrill-log.md` (create if needed):

```markdown
# Fire Drill Log

| Date | Guardrail | Result | Notes |
|------|-----------|--------|-------|
| 2026-05-14 | G1 ratchet | PASS | Deliberate `const x: number = 'oops'` rejected with exit 1 |
```

```bash
git add docs/superpowers/specs/2026-05-14-firedrill-log.md
git commit -m "chore: log G1 ratchet fire drill"
```

---

### Task 1.5: Enable branch protection

- [ ] **Step 1: Configure required status check in GitHub**

Settings → Branches → Branch protection rules for `main`:
- Enable "Require status checks to pass before merging"
- Add `typecheck` to required status checks
- Enable "Require branches to be up to date before merging"

- [ ] **Step 2: Verify with a no-op test PR**

Open and immediately close a no-op PR; confirm `typecheck` runs and is required.

- [ ] **Step 3: Log completion**

Append to progress log:

```markdown
| 2026-05-14 | 1 complete | check-tsc.sh + CI + branch protection | <unchanged> |
```

```bash
git add docs/superpowers/specs/2026-05-14-progress-log.md
git commit -m "chore: log Phase 1 completion"
```

---

## Phase 2 — Dead code

### Task 2.1: Verify CloneDriveModal has no live consumers

- [ ] **Step 1: Search for imports**

```bash
grep -rE "CloneDriveModal" src/ | grep -v "components/cases/CloneDriveModal" || echo "no live imports"
```

Expected: "no live imports" OR a short list of caller files to update.

- [ ] **Step 2: Check route configs**

```bash
grep -rE "CloneDrive" src/App.tsx src/contexts/ src/pages/ || echo "no route refs"
```

Expected: nothing or identifiable callers to update.

- [ ] **Step 3: Document findings in commit message for Task 2.2**

---

### Task 2.2: Delete CloneDriveModal.tsx

**Files:**
- Delete: `src/components/cases/CloneDriveModal.tsx`
- Modify: any caller surfaced in Task 2.1

- [ ] **Step 1: Delete the file**

```bash
git rm src/components/cases/CloneDriveModal.tsx
```

- [ ] **Step 2: Remove caller imports if any**

For each caller from Task 2.1, edit the file to remove the import and any usage block (likely a modal-open button).

- [ ] **Step 3: Run tsc check**

```bash
bash scripts/check-tsc.sh
```

Expected: "OK: tsc errors decreased (... to <baseline minus 51 or more>)"

- [ ] **Step 4: Build verification**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(cleanup): delete CloneDriveModal.tsx (B7 dead code)"
```

- [ ] **Step 6: Update progress log**

```markdown
| 2026-05-14 | 2 | CloneDriveModal | <new count> |
```

```bash
git add docs/superpowers/specs/2026-05-14-progress-log.md
git commit -m "chore: log Phase 2.2 progress"
```

---

### Task 2.3: Sweep remaining B7 files from triage

- [ ] **Step 1: List B7 files**

```bash
grep "| B7 |" docs/superpowers/specs/2026-05-14-triage.md | awk -F'|' '{print $2}'
```

- [ ] **Step 2: For each, verify no live consumers**

```bash
grep -rE "<filename without extension>" src/ | grep -v "^<filename>"
```

Expected: empty or only self-references.

- [ ] **Step 3: Delete all B7 files in one PR**

```bash
git rm <each B7 file>
npm run build
bash scripts/check-tsc.sh
```

Expected: count drops; build succeeds.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(cleanup): delete remaining B7 dead-code files"
```

- [ ] **Step 5: Update progress log**

---

## Phase 3 — Single-root-cause clusters

### Task 3.1: Fix App.tsx lazy-import pattern (~85 errors)

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Read first 3 errors to identify pattern**

```bash
grep "^src/App.tsx(" docs/superpowers/specs/2026-05-14-tsc-baseline.txt | head -3
```

Look for the recurring "Type 'Promise<{ default: ComponentType<unknown>; } | { default: FC<{}>; }>'" pattern. Root cause: `React.lazy()` expects `{ default: ComponentType<any> }` but some lazy modules export `FC<{}>`.

- [ ] **Step 2: Read App.tsx lazy lines**

```bash
grep -n "lazy(\|import(" src/App.tsx | head -10
```

- [ ] **Step 3: Apply the type-cast fix to every lazy line**

Pattern: cast `m.default` to `React.ComponentType` after the dynamic import.

Before:
```tsx
const Foo = lazy(() => import('./pages/Foo'));
```

After:
```tsx
const Foo = lazy(() => import('./pages/Foo').then(m => ({ default: m.default as React.ComponentType })));
```

Apply to every lazy line in App.tsx.

- [ ] **Step 4: Run tsc**

```bash
bash scripts/check-tsc.sh
```

Expected: count drops by ~85.

- [ ] **Step 5: Smoke test**

```bash
npm run dev
```

Open the app, navigate to 3-5 lazy-loaded routes, confirm no broken pages.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "fix(types): App.tsx lazy-import pattern (B1, ~85 errors)"
```

- [ ] **Step 7: Update progress log**

---

### Task 3.2: Fix document component shared type (~200 errors)

**Files:**
- Modify: `src/components/documents/InvoiceDocument.tsx`, `ReportDocument.tsx`, `QuoteDocument.tsx`, `PaymentReceiptDocument.tsx`
- Modify: `src/lib/pdf/documents/*.ts` counterparts

- [ ] **Step 1: Read first 5 errors from InvoiceDocument**

```bash
grep "^src/components/documents/InvoiceDocument.tsx(" docs/superpowers/specs/2026-05-14-tsc-baseline.txt | head -5
```

- [ ] **Step 2: Locate shared prop type**

```bash
grep -rE "interface (Invoice|Report|Quote|PaymentReceipt)DocumentProps" src/components/documents/ src/lib/pdf/
```

- [ ] **Step 3: Compare prop fields against generated types**

For each document type, identify mismatched property names by comparing the hand-written interface to:

```typescript
import type { Database } from '../../types/database.types';
type Invoice = Database['public']['Tables']['invoices']['Row'];
```

List the mismatched property names.

- [ ] **Step 4: Replace hand-written interface with derived type**

```typescript
type Invoice = Database['public']['Tables']['invoices']['Row'];
```

Or pick fields explicitly:

```typescript
type Invoice = Pick<Database['public']['Tables']['invoices']['Row'], 'invoice_number' | 'total'>;
```

- [ ] **Step 5: Update callers**

`Edit` consumer files (the screens that render these documents) to match the new prop shape.

- [ ] **Step 6: Run tsc**

```bash
bash scripts/check-tsc.sh
```

Expected: count drops by ~200.

- [ ] **Step 7: Visual verification — generate a PDF**

```bash
npm run dev
```

Generate an invoice, quote, and report PDF. Confirm they render correctly with populated fields.

- [ ] **Step 8: Commit**

```bash
git add src/components/documents/ src/lib/pdf/
git commit -m "fix(types): document prop types derived from Database (B1, ~200 errors)"
```

- [ ] **Step 9: Update progress log**

---

### Task 3.3: Address stockService.ts (222 errors)

**Files:**
- Modify or partially delete: `src/lib/stockService.ts`

**Time-box: 1 working day. If unresolved, isolate and defer remainder to B8.**

- [ ] **Step 1: Read first 20 errors**

```bash
grep "^src/lib/stockService.ts(" docs/superpowers/specs/2026-05-14-tsc-baseline.txt | head -20
```

- [ ] **Step 2: Inspect file structure**

```bash
wc -l src/lib/stockService.ts
grep -nE "^(export |function |const )" src/lib/stockService.ts | head -30
```

- [ ] **Step 3: Find live consumers**

```bash
grep -rnE "stockService|from.*stockService" src/ | grep -v "lib/stockService.ts"
```

- [ ] **Step 4: Classify the file**

| Outcome | Action |
|---|---|
| Whole file uses pre-v1.0.0 schema AND no live consumers | Re-bucket as B7, delete |
| Pre-v1.0.0 schema BUT live consumers | Identify called functions; isolate dead exports; rewrite called ones |
| Current schema with many local bugs | Standard B3/B4 sweep |

- [ ] **Step 5: Apply chosen approach**

If delete: `git rm src/lib/stockService.ts` and remove imports.
If isolate: delete dead exports, fix live ones.
If standard sweep: rename columns/tables per audit.

- [ ] **Step 6: Run tsc, build, smoke test**

```bash
bash scripts/check-tsc.sh
npm run build
npm run dev
```

Exercise stock-related screens.

- [ ] **Step 7: Commit**

Commit message documents approach chosen and any remaining work.

- [ ] **Step 8: Update progress log**

---

## Phase 4 — Schema-drift sweep

### Task 4.1: Per-file schema-drift fix template

**Instantiate once per row in triage worksheet with bucket B2/B3/B4. Dispatch in batches of 8-12 concurrent agents via `superpowers:dispatching-parallel-agents`.**

**Agent inputs:**
- File path: `<from worksheet>`
- Bucket: B2/B3/B4
- Root cause: `<from worksheet>`
- Current error count for this file: `<from baseline>`

**Files:**
- Modify: `<the file>`

- [ ] **Step 1: Read errors for this file**

```bash
grep "^<filepath>(" docs/superpowers/specs/2026-05-14-tsc-baseline.txt
```

- [ ] **Step 2: Read the file via Read tool**

- [ ] **Step 3: Verify live schema for affected tables**

For each table in `.from()` or in embeds, query via `mcp__supabase__execute_sql`:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='<table>'
ORDER BY ordinal_position;
```

For FKs:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid='public.<table>'::regclass AND contype='f';
```

Note canonical column names and FK-referenced table names (which go inside embed parentheses).

- [ ] **Step 4: Apply bucket-specific fix**

| Bucket | Fix |
|---|---|
| B2 | Rename stale table names in the `.select()` template string AND in `.from()` argument. Update consumer code that reads the result (e.g., `device.device_types` becomes `device.catalog_device_types`). |
| B3 | Rename consumer read sites OR adjust `.select()` to alias the field back. Prefer renaming consumers — cleaner end-state. |
| B4 | Rename insert/update keys to match current schema. If a column was dropped without replacement, flag for product decision, file an issue, defer. |

- [ ] **Step 5: Confirm count drops for this file**

```bash
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "^<filepath>("
```

Expected: 0 (B2/B3 fully cleared) OR documented residual (B4 with dropped column).

- [ ] **Step 6: Verify against live DB**

For B2/B3: run the corrected query via `mcp__supabase__execute_sql`:

```sql
SELECT <columns>, <embedded_columns>
FROM <table> <joins>
WHERE <conditions>
LIMIT 1;
```

Paste the result row in the commit message.

- [ ] **Step 7: Smoke test the screen (UI files)**

```bash
npm run dev
```

Walk the golden path for the affected screen.

- [ ] **Step 8: Run full ratchet**

```bash
bash scripts/check-tsc.sh
```

Expected: count drops by `<expected for this file>`.

- [ ] **Step 9: Commit**

```bash
git add <filepath>
git commit -m "fix(schema): <filepath> drift — <bucket> (-<N> errors)"
```

Include the live-DB query result in the commit body.

- [ ] **Step 10: Update progress log and worksheet status**

```markdown
| 2026-05-14 | 4 | <filepath> | <new count> |
```

Mark the worksheet row as `done` with PR link.

---

### Task 4.2: Coordinator — dispatch and validate

**Runs in parallel with Task 4.1 instantiations.**

- [ ] **Step 1: Plan dispatch batches**

List worksheet rows with bucket in B2/B3/B4 and status = todo. Group into batches of 8-12.

- [ ] **Step 2: Dispatch a batch**

Use the `Agent` tool with `subagent_type: general-purpose`. Each agent prompt contains:
- The full text of Task 4.1
- The specific filepath, bucket, root_cause, error_count
- Instruction to open PR with the Step 9 commit and link in the worksheet

- [ ] **Step 3: Review each PR as it opens**

For each agent's PR:
- Confirm tsc count dropped as predicted
- Confirm live-DB verification block is in the PR description
- For UI-affecting changes: confirm smoke-test notes
- Merge if all pass

- [ ] **Step 4: Reject non-conforming PRs**

If tsc count didn't drop, or verification missing, close PR and re-dispatch agent with feedback.

- [ ] **Step 5: Confirm baseline updates on each merge**

```bash
cat docs/superpowers/specs/tsc-baseline.count
```

- [ ] **Step 6: Move to next batch**

Repeat until all B2/B3/B4 rows are done.

---

## Phase 5 — Long tail

### Task 5.1: Remove unused declarations (B6, ~303 errors)

- [ ] **Step 1: List B6 files**

```bash
grep "error TS6133" docs/superpowers/specs/2026-05-14-tsc-baseline.txt \
  | awk -F'(' '{print $1}' | sort -u > /tmp/b6-files.txt
wc -l /tmp/b6-files.txt
```

- [ ] **Step 2: Try ESLint autofix**

In `eslint.config.js`, temporarily add inside the rules block:

```js
'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
```

Then:

```bash
npx eslint src/ --fix --no-warn-ignored
```

- [ ] **Step 3: Count remaining B6**

```bash
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "error TS6133"
```

- [ ] **Step 4: Manual sweep for remaining**

For each, delete the unused line. For intentional unused params, prefix with `_`.

- [ ] **Step 5: Run full tsc**

```bash
bash scripts/check-tsc.sh
```

Expected: count drops by ~303.

- [ ] **Step 6: Build verification**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(cleanup): remove unused declarations (B6, ~303 errors)"
```

- [ ] **Step 8: Update progress log**

---

### Task 5.2: Real type bugs (B5)

- [ ] **Step 1: List B5 rows**

```bash
grep "| B5 |" docs/superpowers/specs/2026-05-14-triage.md
```

- [ ] **Step 2: Classify each by error code**

| Error code | Typical fix |
|---|---|
| TS18047 (null) | Add null guard or optional-chaining |
| TS2322 (type mismatch) | Narrow type at boundary; do not cast to `any` |
| TS2345 (arg mismatch) | Fix call site or function signature |

- [ ] **Step 3: Fix per `systematic-debugging`**

Never silence with `@ts-ignore`, `any`, or non-null assertion. If a fix needs a product decision, file an issue and DEFER — do not fake a fix.

- [ ] **Step 4: One PR per file**

- [ ] **Step 5: After each PR, update progress log**

---

### Task 5.3: B8 long tail

- [ ] **Step 1: List B8 rows**

```bash
grep "| B8 |" docs/superpowers/specs/2026-05-14-triage.md
```

- [ ] **Step 2: Apply Task 4.1 template per file**

Most B8 files have 1-3 errors. Quick sweep.

- [ ] **Step 3: Commit per file**

- [ ] **Step 4: Verify zero**

```bash
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "^src/"
```

Expected: 0.

---

## Phase 6 — Final lock-in

### Task 6.1: Schema-drift detector

**Files:**
- Create: `scripts/check-schema-drift.sh`

- [ ] **Step 1: Write the script**

`scripts/check-schema-drift.sh`:

```bash
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
```

- [ ] **Step 2: Make executable and test**

```bash
chmod +x scripts/check-schema-drift.sh
bash scripts/check-schema-drift.sh
```

Expected: "OK: types match live schema". If it fails, investigate via `systematic-debugging`.

- [ ] **Step 3: Add npm script**

In `package.json` scripts:

```json
    "check:schema-drift": "bash scripts/check-schema-drift.sh",
```

- [ ] **Step 4: Commit**

```bash
git add scripts/check-schema-drift.sh package.json
git commit -m "feat(ci): schema-drift detector (Phase 6)"
```

---

### Task 6.2: ESLint banned-names rule

**Files:**
- Create: `eslint-rules/banned-tables.js`
- Create: `eslint-rules/no-banned-embeds-in-select.js`
- Modify: `eslint.config.js`

- [ ] **Step 1: Create banned-tables list**

`eslint-rules/banned-tables.js`:

```js
export const BANNED_TABLES = [
  'device_types', 'device_brands', 'brands', 'device_capacities', 'capacities',
  'device_conditions', 'device_encryption', 'device_form_factors', 'device_made_in',
  'device_head_counts', 'device_platter_counts', 'device_roles', 'device_component_statuses',
  'interfaces', 'accessories', 'service_types', 'service_locations', 'service_problems',
  'service_categories', 'service_line_items', 'donor_compatibility_matrix',
  'industries', 'currency_codes', 'case_priorities', 'case_statuses', 'case_report_templates',
  'invoice_statuses', 'quote_statuses', 'purchase_order_statuses', 'payment_methods',
  'expense_categories', 'transaction_categories', 'leave_types', 'payroll_components',
  'inventory_categories', 'inventory_condition_types', 'inventory_item_categories',
  'inventory_status_types', 'supplier_categories', 'supplier_payment_terms',
  'template_categories', 'template_types', 'template_variables', 'modules',
  'countries', 'cities',
];
```

- [ ] **Step 2: Create custom rule for embed scanning**

`eslint-rules/no-banned-embeds-in-select.js`:

```js
import { BANNED_TABLES } from './banned-tables.js';

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow legacy table names in PostgREST select() embeds' },
    schema: [],
    messages: {
      banned: 'Legacy table name "{{name}}" in select embed. Use prefixed name (catalog_*/master_*/geo_*).',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee?.property?.name !== 'select') return;
        const arg = node.arguments[0];
        if (arg?.type !== 'TemplateLiteral') return;

        const source = arg.quasis.map(q => q.value.cooked).join('\n');
        const pattern = new RegExp('\\b(' + BANNED_TABLES.join('|') + ')\\s*[!(]', 'g');

        let match;
        while ((match = pattern.exec(source)) !== null) {
          context.report({ node: arg, messageId: 'banned', data: { name: match[1] } });
        }
      },
    };
  },
};
```

- [ ] **Step 3: Update eslint.config.js**

Replace existing content:

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { BANNED_TABLES } from './eslint-rules/banned-tables.js';
import noBannedEmbeds from './eslint-rules/no-banned-embeds-in-select.js';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2020, globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'xsuite': { rules: { 'no-banned-embeds-in-select': noBannedEmbeds } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-syntax': ['error', {
        selector: 'CallExpression[callee.property.name="from"][arguments.0.value=/^(' + BANNED_TABLES.join('|') + ')$/]',
        message: 'Legacy table name. Use catalog_*/master_*/geo_* prefix. See CLAUDE.md.',
      }],
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'src/types/database', message: 'Use src/types/database.types instead.' },
          { name: '../types/database', message: 'Use ../types/database.types instead.' },
          { name: '../../types/database', message: 'Use ../../types/database.types instead.' },
        ],
      }],
      'xsuite/no-banned-embeds-in-select': 'error',
    },
  }
);
```

- [ ] **Step 4: Verify ESLint passes**

```bash
npm run lint
```

Expected: zero violations. If violations remain, Phase 4 missed something — go back and fix.

- [ ] **Step 5: Commit**

```bash
git add eslint-rules/ eslint.config.js
git commit -m "feat(ci): ESLint banned-names rule + custom embed scanner (Phase 6)"
```

---

### Task 6.3: Tenant-table requirements assertion

**Files:**
- Create: `scripts/check-tenant-table-requirements.sql`
- Create: `scripts/check-tenant-table-requirements.sh`

- [ ] **Step 1: Write the SQL**

`scripts/check-tenant-table-requirements.sql`:

```sql
WITH tenant_tables AS (
  SELECT DISTINCT t.table_name
  FROM information_schema.tables t
  JOIN information_schema.columns c
    ON c.table_schema = t.table_schema AND c.table_name = t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.column_name = 'tenant_id'
    AND t.table_name NOT IN ('tenant_subscriptions', 'tenant_payment_methods',
                              'tenant_activity_log', 'tenant_health_metrics',
                              'tenant_impersonation_sessions', 'tenant_rate_limits')
),
violations AS (
  SELECT
    tt.table_name,
    CASE WHEN (SELECT is_nullable FROM information_schema.columns
               WHERE table_schema='public' AND table_name=tt.table_name AND column_name='tenant_id') = 'NO'
         THEN NULL ELSE 'tenant_id is nullable' END AS issue_1,
    CASE WHEN (SELECT relrowsecurity FROM pg_class
               WHERE oid = format('public.%I', tt.table_name)::regclass) = true
         THEN NULL ELSE 'RLS not enabled' END AS issue_2,
    CASE WHEN (SELECT relforcerowsecurity FROM pg_class
               WHERE oid = format('public.%I', tt.table_name)::regclass) = true
         THEN NULL ELSE 'RLS not forced' END AS issue_3,
    CASE WHEN EXISTS (SELECT 1 FROM pg_policy
                      WHERE polrelid = format('public.%I', tt.table_name)::regclass
                        AND NOT polpermissive)
         THEN NULL ELSE 'No RESTRICTIVE policy' END AS issue_4,
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger
                      WHERE tgrelid = format('public.%I', tt.table_name)::regclass
                        AND tgname LIKE 'set_%_tenant_and_audit'
                        AND NOT tgisinternal)
         THEN NULL ELSE 'Missing set_*_tenant_and_audit trigger' END AS issue_5,
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes
                      WHERE schemaname='public' AND tablename=tt.table_name
                        AND indexdef ILIKE '%(tenant_id)%')
         THEN NULL ELSE 'Missing tenant_id index' END AS issue_6
  FROM tenant_tables tt
)
SELECT table_name, issue_1, issue_2, issue_3, issue_4, issue_5, issue_6
FROM violations
WHERE issue_1 IS NOT NULL OR issue_2 IS NOT NULL OR issue_3 IS NOT NULL
   OR issue_4 IS NOT NULL OR issue_5 IS NOT NULL OR issue_6 IS NOT NULL;
```

- [ ] **Step 2: Write the wrapper script**

`scripts/check-tenant-table-requirements.sh`:

```bash
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
```

- [ ] **Step 3: Initial validation via MCP**

```bash
chmod +x scripts/check-tenant-table-requirements.sh
```

Run the SQL via `mcp__supabase__execute_sql` (paste the SQL into the tool). Expected: empty result.

If violations: fix via migration BEFORE this gate is enabled.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-tenant-table-requirements.sql scripts/check-tenant-table-requirements.sh
git commit -m "feat(ci): tenant-table requirements assertion (Phase 6)"
```

---

### Task 6.4: Migration manifest

**Files:**
- Create: `supabase/migrations.manifest.md`
- Create: `scripts/check-migration-manifest.sh`

- [ ] **Step 1: Generate manifest from applied migrations**

Run via `mcp__supabase__list_migrations` (or via SQL):

```sql
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
```

- [ ] **Step 2: Write `supabase/migrations.manifest.md`**

```markdown
# Migration Manifest

Every applied migration must appear here. Verified by `scripts/check-migration-manifest.sh`.

| version | filename | classification | summary | PR |
|---|---|---|---|---|
<one row per applied migration>
```

For pre-existing migrations: classification = `(historical)`, summary = migration filename, PR = (blank).

- [ ] **Step 3: Write the check script**

`scripts/check-migration-manifest.sh`:

```bash
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
```

- [ ] **Step 4: Make executable**

```bash
chmod +x scripts/check-migration-manifest.sh
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations.manifest.md scripts/check-migration-manifest.sh
git commit -m "feat(ci): migration manifest check (Phase 6)"
```

---

### Task 6.5: .from() allowlist check

**Files:**
- Create: `scripts/check-from-table-names.sh`

- [ ] **Step 1: Write the script**

`scripts/check-from-table-names.sh`:

```bash
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
```

- [ ] **Step 2: Make executable and run**

```bash
chmod +x scripts/check-from-table-names.sh
bash scripts/check-from-table-names.sh
```

Expected: "OK: every .from() name resolves" (Phase 4 already fixed bare names).

- [ ] **Step 3: Commit**

```bash
git add scripts/check-from-table-names.sh
git commit -m "feat(ci): .from() table-name allowlist (Phase 6)"
```

---

### Task 6.6: Wire all 6 jobs into CI

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Replace workflow**

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: bash scripts/check-tsc.sh

  schema-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: bash scripts/check-schema-drift.sh
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx eslint . --max-warnings=0

  tenant-table-requirements:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bash scripts/check-tenant-table-requirements.sh
        env:
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}

  migration-manifest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bash scripts/check-migration-manifest.sh
        env:
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}

  from-table-names:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bash scripts/check-from-table-names.sh
```

- [ ] **Step 2: Add secrets in GitHub**

Settings → Secrets → Actions:
- `SUPABASE_ACCESS_TOKEN` (project-scoped read access)
- `SUPABASE_DB_URL` (read-only role with USAGE on `public` and `information_schema`)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat(ci): wire all 6 guardrails into workflow (Phase 6)"
```

---

### Task 6.7: Flip tsc gate from ratchet to zero

**Files:**
- Modify: `scripts/check-tsc.sh`
- Delete: `docs/superpowers/specs/tsc-baseline.count`

- [ ] **Step 1: Replace check-tsc.sh with zero-mode**

```bash
#!/usr/bin/env bash
set -euo pipefail

OUTPUT=$(npx tsc --noEmit -p tsconfig.app.json 2>&1 || true)
COUNT=$(echo "$OUTPUT" | grep -c "^src/" || true)

if [ "$COUNT" -ne 0 ]; then
  echo "FAIL: tsc has $COUNT errors:"
  echo "$OUTPUT"
  exit 1
fi

echo "OK: tsc clean (0 errors)"
```

- [ ] **Step 2: Delete baseline file**

```bash
git rm docs/superpowers/specs/tsc-baseline.count
```

- [ ] **Step 3: Run locally**

```bash
bash scripts/check-tsc.sh
```

Expected: "OK: tsc clean (0 errors)".

- [ ] **Step 4: Commit**

```bash
git add scripts/check-tsc.sh
git commit -m "feat(ci): flip tsc gate from ratchet to zero (Phase 6)"
```

---

### Task 6.8: Delete legacy src/types/database.ts

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -rE "from '.*types/database'" src/ | grep -v "database.types" || echo "no imports"
```

Expected: "no imports" (Phase 6 Task 6.2 ESLint rule already enforces this).

- [ ] **Step 2: Delete**

```bash
git rm src/types/database.ts
```

- [ ] **Step 3: Verify**

```bash
bash scripts/check-tsc.sh
npm run lint
```

Both pass.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: delete legacy src/types/database.ts (Phase 6)"
```

---

### Task 6.9: Migration PR template

**Files:**
- Create: `.github/PULL_REQUEST_TEMPLATE/migration.md`

- [ ] **Step 1: Create template**

```bash
mkdir -p .github/PULL_REQUEST_TEMPLATE
```

`.github/PULL_REQUEST_TEMPLATE/migration.md`:

```markdown
## Migration summary
One sentence describing the schema change and motivation.

## Classification
- [ ] Additive (new tables/columns/indexes/policies)
- [ ] Conditional rename (justify why expand-contract is not needed)
- [ ] Expand-Contract PR 1 (writes both, callers read new)
- [ ] Expand-Contract PR 2 (drops old)
- [ ] RLS-only change

## Migration filename
`<timestamp>_<description>.sql` — applied via `mcp__supabase__apply_migration`

## Blast radius
Files changed:
- src/...

## Tenant-scoped table checklist (if new table)
- [ ] `tenant_id uuid NOT NULL REFERENCES tenants(id)`
- [ ] `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`
- [ ] RESTRICTIVE tenant isolation policy
- [ ] `set_<table>_tenant_and_audit` trigger
- [ ] `idx_<table>_tenant_id` partial index
- [ ] CRUD policies appropriate
- [ ] `deleted_at` column

## Verification (paste actual output)
1. `mcp__supabase__list_tables` for affected tables (post-migration)
2. Representative query returning the new shape
3. Tenant isolation test (query as tenant B for tenant A data — must be 0 rows)
4. Soak window confirmation (PR 2 of expand-contract only)

## Rollback plan
SQL to revert destructive elements, or "additive — no rollback needed".

## Backwards-compat notes
In-flight requests during deploy? External consumers (edge functions, integrations)?
```

- [ ] **Step 2: Commit**

```bash
git add .github/PULL_REQUEST_TEMPLATE/migration.md
git commit -m "feat: migration PR template (Phase 6)"
```

---

### Task 6.10: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Read current structure**

```bash
grep -nE "^##? " CLAUDE.md
```

- [ ] **Step 2: Add "Schema Discipline" section after "Database Architecture"**

Insert this section into CLAUDE.md:

```markdown
## Schema Discipline (enforced by CI)

Six required-status checks block PRs that re-introduce schema drift. Full design: `docs/superpowers/specs/2026-05-14-schema-discipline-cleanup-design.md`.

### Naming standards

- **Catalog tables**: `catalog_*` prefix. Banned legacy names: `device_types`, `brands`, `capacities`, `service_types`, etc. — full list in `eslint-rules/banned-tables.js`.
- **Master tables** (lookups, statuses, categories): `master_*` prefix.
- **Geo tables**: `geo_*` prefix.
- **Tenant-scoped tables** must have: `tenant_id NOT NULL`, RLS enabled+forced, RESTRICTIVE isolation policy, `set_<table>_tenant_and_audit` trigger, `idx_<table>_tenant_id` partial index. Asserted by `scripts/check-tenant-table-requirements.sql`.

### Type-import rules

- Import `Database` from `src/types/database.types.ts` only.
- `src/types/database.ts` is deleted; importing it is a lint error.
- Never hand-edit `database.types.ts`. Regenerate via `npm run db:types`.

### Migration discipline

Every migration PR must contain:
1. Migration SQL (applied via `mcp__supabase__apply_migration`).
2. Regenerated `database.types.ts`.
3. Every caller updated.
4. Use `.github/PULL_REQUEST_TEMPLATE/migration.md`.

The schema-drift detector (`scripts/check-schema-drift.sh`) regenerates types and diffs them — any mismatch fails the PR.

### CI gates

| Job | Catches |
|---|---|
| `typecheck` | TS errors including stale column reads (TS2339, TS2551) |
| `schema-drift` | Live DB diverging from `database.types.ts` |
| `lint` | `.from('<legacy_name>')` and embed names in `.select()` |
| `tenant-table-requirements` | New tenant-scoped table missing RLS, trigger, or index |
| `migration-manifest` | Applied migration missing from manifest |
| `from-table-names` | `.from('<X>')` where X is not a real table |
```

- [ ] **Step 3: Update the "Do Not" section**

In the existing "Do Not" list, add:

```markdown
- Do not write to a banned legacy table name (see Schema Discipline section)
- Do not import from `src/types/database.ts` (legacy file; deleted)
- Do not bypass the migration PR template for schema changes
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add Schema Discipline section to CLAUDE.md (Phase 6)"
```

---

### Task 6.11: Fire drills

**Files:**
- Modify: `docs/superpowers/specs/2026-05-14-firedrill-log.md`

Each drill creates a deliberate failure, confirms the gate catches it, cleans up, logs.

- [ ] **Step 1: G1 (zero form) drill**

```bash
git checkout -b firedrill/g1
echo "const __fd: number = 'oops';" > src/__fd.ts
bash scripts/check-tsc.sh; echo "exit=$?"
```

Expected: FAIL, exit 1.

```bash
rm src/__fd.ts
git checkout main && git branch -D firedrill/g1
```

Log: `| 2026-05-14 | G1 zero | PASS | const x = 'oops' rejected |`

- [ ] **Step 2: G2 (schema-drift) drill**

Apply via `mcp__supabase__apply_migration`:

```sql
ALTER TABLE platform_audit_logs ADD COLUMN _fd_test text;
```

```bash
bash scripts/check-schema-drift.sh; echo "exit=$?"
```

Expected: FAIL with diff showing new column.

Drop:

```sql
ALTER TABLE platform_audit_logs DROP COLUMN _fd_test;
```

Regenerate types and verify clean:

```bash
npm run db:types
bash scripts/check-schema-drift.sh
```

Log: `| 2026-05-14 | G2 | PASS | _fd_test column drift detected |`

- [ ] **Step 3: G3 (banned-names) drill**

```bash
git checkout -b firedrill/g3
cat > src/__fd3.ts <<'EOF'
import { supabase } from './lib/supabaseClient';
export async function fd() {
  return await supabase.from('device_types').select('*');
}
EOF
npm run lint; echo "exit=$?"
```

Expected: FAIL with banned-name message.

```bash
rm src/__fd3.ts
git checkout main && git branch -D firedrill/g3
```

Log: `| 2026-05-14 | G3 from | PASS | .from('device_types') rejected |`

- [ ] **Step 4: G3b (banned embeds) drill**

```bash
git checkout -b firedrill/g3b
cat > src/__fd3b.ts <<'EOF'
import { supabase } from './lib/supabaseClient';
export async function fd() {
  return await supabase.from('case_devices').select(`id, device_types(name)`);
}
EOF
npm run lint; echo "exit=$?"
```

Expected: FAIL with custom rule message.

```bash
rm src/__fd3b.ts
git checkout main && git branch -D firedrill/g3b
```

Log: `| 2026-05-14 | G3b embed | PASS | device_types in select() rejected |`

- [ ] **Step 5: G4 (tenant-table requirements) drill**

Via `mcp__supabase__execute_sql`:

```sql
CREATE TABLE _fd_test_table (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL);
ALTER TABLE _fd_test_table ENABLE ROW LEVEL SECURITY;
```

Run the assertion SQL. Expected: row returned listing issues 3, 4, 5, 6.

Drop:

```sql
DROP TABLE _fd_test_table;
```

Log: `| 2026-05-14 | G4 | PASS | _fd_test_table missing trigger/index detected |`

- [ ] **Step 6: G5 (migration manifest) drill**

Apply a no-op migration via `mcp__supabase__apply_migration` without updating the manifest:

```sql
COMMENT ON TABLE platform_audit_logs IS 'Fire drill (no-op)';
```

Run `scripts/check-migration-manifest.sh`. Expected: FAIL listing the new migration version.

Update manifest with the new row; re-run; expected: OK.

Log: `| 2026-05-14 | G5 | PASS | orphan migration detected |`

- [ ] **Step 7: G6 (.from allowlist) drill**

```bash
git checkout -b firedrill/g6
cat > src/__fd6.ts <<'EOF'
import { supabase } from './lib/supabaseClient';
export async function fd() {
  return await supabase.from('totally_made_up_table').select('*');
}
EOF
bash scripts/check-from-table-names.sh; echo "exit=$?"
```

Expected: FAIL listing the unknown name.

```bash
rm src/__fd6.ts
git checkout main && git branch -D firedrill/g6
```

Log: `| 2026-05-14 | G6 | PASS | unknown table rejected |`

- [ ] **Step 8: Commit fire drill log**

```bash
git add docs/superpowers/specs/2026-05-14-firedrill-log.md
git commit -m "chore: log all Phase 6 fire drills (6/6 PASS)"
```

---

### Task 6.12: Final audit-done verification

- [ ] **Step 1: Re-run original audit greps**

```bash
echo "--- Bare-name .from() ---"
grep -rE "\.from\('(device_types|brands|capacities|service_types|countries|cities|industries|supplier_categories|purchase_order_statuses|inventory_status_types)'\)" src/ || echo "clean"

echo "--- Bare-name embeds ---"
grep -rE "\b(device_types|brands|capacities|service_types|supplier_categories|purchase_order_statuses|inventory_status_types)\s*!\w+_id\s*\(" src/ || echo "clean"

echo "--- Legacy types import ---"
grep -rE "from '.*types/database'" src/ | grep -v "database.types" || echo "clean"

echo "--- tsc ---"
bash scripts/check-tsc.sh
```

Expected: every line "clean" or "OK".

- [ ] **Step 2: Run all six gates locally**

```bash
bash scripts/check-tsc.sh
bash scripts/check-schema-drift.sh
npm run lint
bash scripts/check-tenant-table-requirements.sh
bash scripts/check-migration-manifest.sh
bash scripts/check-from-table-names.sh
```

All six pass.

- [ ] **Step 3: Enable required-status checks in GitHub**

Settings → Branches → main protection. Add to required:
- `typecheck`
- `schema-drift`
- `lint`
- `tenant-table-requirements`
- `migration-manifest`
- `from-table-names`

---

### Task 6.13: Tag the release

- [ ] **Step 1: Tag**

```bash
git tag -a v1.1.0-schema-discipline -m "Schema discipline: tsc zero + 6 CI gates"
git push origin v1.1.0-schema-discipline
```

- [ ] **Step 2: Final progress log entry**

```markdown
| 2026-05-14 | 6 complete | All 6 gates active; tagged v1.1.0-schema-discipline | 0 |
```

```bash
git add docs/superpowers/specs/2026-05-14-progress-log.md
git commit -m "chore: log Phase 6 completion"
```

- [ ] **Step 3: Tenant #2 onboarding unblocked**

Spec §1.5 / §8.9 business gate is now satisfied.

---

## Self-review

### Spec coverage check

| Spec section | Implemented by |
|---|---|
| §1 Goals/Non-goals/Scope | Implicit (every task contributes) |
| §1.5 Tenant #2 gate | Task 6.13 Step 3 |
| §2.1 Naming convention | Task 6.2 (ESLint), Task 6.10 (CLAUDE.md) |
| §2.2 Banned legacy names | Task 6.2 (banned-tables.js) |
| §2.3 Column drift list | Task 0.3 (worksheet), Phase 4 fixes |
| §2.4 Type-import rules | Task 6.2 (no-restricted-imports), Task 6.8 (delete legacy) |
| §2.5 Query-shape rules | Task 6.2, Task 6.10 |
| §3 Triage approach | Phase 0 |
| §4 Phased execution | Phases 0-6 (this plan) |
| §5 Migration discipline | Task 6.9, Task 6.10 |
| §6 CI guardrails | Phase 6 Tasks 6.1-6.7 |
| §7.2 Fire drills | Task 6.11 |
| §7.3 Cleanup-done audit | Task 6.12 |
| §8.4 R1 (stockService rabbit hole) | Task 3.3 time-box |
| §8.4 R7 (migration during cleanup) | Task 6.9 template ready Day 1 |

### Placeholder scan

- No "TBD", "TODO", "implement later" in task bodies
- No "add appropriate error handling" without showing what
- Task 4.1 is a template instantiated per file with explicit per-file inputs from the worksheet
- Every code step has actual code
- Every command step has explicit Expected line

### Type consistency

- Baseline file path matches between Task 0.1 (create) and Task 6.7 (delete): `docs/superpowers/specs/tsc-baseline.count`
- ESLint rule names match between Task 6.2 definition and Task 6.11 Steps 3-4 fire drills
- Migration manifest path matches between Task 6.4 (create) and Task 6.11 Step 6 (fire drill)
- Banned-tables list location matches between Task 6.2 Step 1 (create) and Task 6.2 Step 3 (import)
