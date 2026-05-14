# Schema Discipline Cleanup — Progress Log

Each cleanup PR appends a row after merge. The baseline starts at 3138 and ratchets downward to 0 by end of Phase 5.

| Date | Phase | Merged | tsc count |
|------|-------|--------|-----------|
| 2026-05-14 | 0 (baseline) | — | 3138 |
| 2026-05-14 | 0 complete | Triage worksheet (top-30 classified, 10-sample validated) | 3138 |
| 2026-05-14 | 1 complete | check-tsc.sh + CI workflow + npm script + ratchet fire drill + branch protection (enabled via gh CLI) | 3138 |
| 2026-05-14 | 2 | CloneDriveModal + 3 consumer files | 3085 |
| 2026-05-14 | 2 | DeviceRoleSelector (B7 sweep, zero importers) | 3084 |
| 2026-05-14 | 3 | App.tsx lazy-import (B1) | 2999 |
| 2026-05-14 | 3 | Document component types — B1 cluster (5 files: InvoiceDocument.tsx, QuoteDocument.tsx, ReportDocument.tsx, PaymentReceiptDocument.tsx, pdf/PaymentReceiptDocument.ts) | 2783 |
| 2026-05-14 | 3 | stockService.ts — B3 sweep (222 → 0 errors). Column renames + null handling + 5 dead-table sections stubbed (stock_returns, stock_reservations, stock_transfers, stock_item_locations, stock_cost_layers). Each stub has TODO(B8) for migration-or-delete. | 2560 |
