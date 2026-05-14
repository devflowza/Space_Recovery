# Schema Discipline — Fire Drill Log

Each row records a deliberate failure injected into the codebase to verify a CI guardrail catches the target failure mode. Logged once per guardrail. See spec §7.2 for the complete drill protocol.

| Date | Guardrail | Result | Notes |
|------|-----------|--------|-------|
| 2026-05-14 | G1 ratchet | PASS | Deliberate `const __ratchet_test: number = 'oops'` in `src/__ratchet_test.ts` raised tsc count from 3138 to 3140 (TS2322 type-mismatch + TS6133 unused-decl under strict noUnusedLocals); `bash scripts/check-tsc.sh` exited 1 with `FAIL: tsc errors increased (3138 to 3140)`. Cleanup restored baseline to 3138 with `OK: tsc errors unchanged at 3138`. |
