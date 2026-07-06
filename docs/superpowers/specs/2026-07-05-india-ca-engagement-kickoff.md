# India Pack — CA Engagement Kickoff (Phase 4, D7)

**Purpose:** engage a qualified Indian CA **now** (in parallel with the WP-S2..S6 build) so
external validation does not stall the publish gate. India flips to `statutory_ready`
only after a CA signs off the statutory fixtures (D7 hard gate). The **final** review
package arrives at WP-S7: fixture JSONs + rendered PDFs (tax invoice, credit note,
receipt voucher) + a deferrals-and-treatments memo for signed ratification. The signed
memo's hash is recorded in the pack's `_meta.external_validation` before dual-control
publish.

> This brief captures the **seeded data as authored in WP-S1b** (all live on the canonical
> project, IN pack **draft v1**, unpublished). It exists so the CA can start review early;
> nothing here gates any live tenant yet (requirements fire only after publish+pinning).

---

## 1. Scope of engagement

- **Validate the statutory arithmetic fixtures** (delivered at WP-S3): intra-state
  CGST+SGST, inter-state IGST, inclusive B2C 18/118 back-out, **head-level Section 170
  rounding** with the "Round off" line, UTGST (e.g. Chandigarh), credit-note reversal,
  advance-then-invoice netting.
- **Validate rendered document layouts** against CGST Rules 46 / 49 / 50 / 51 / 53 / 55
  (tax invoice, credit note, receipt/refund voucher, delivery challan).
- **Ratify the named deferrals** (spec §7) and implemented treatments (advance netting;
  Bill-of-Supply wholly-exempt guard) via signed memo.

---

## 2. Pinned semantics under review (spec §3 — decided; the CA validates)

1. **Head-level rounding (Section 170).** Tax is rounded per tax head per document
   (`tax.rounding_policy = {mode: half_up, level: head, cash_increment: 1}`); the document
   carries an explicit **"Round off"** line to whole rupees.
2. **Equal dual-levy.** For an intra-state supply the CGST and SGST heads are equal
   (e.g. on ₹4,237.29 taxable @ 18% slab → CGST 381.36 / SGST 381.36 before head rounding).
3. **Rule 46(b) numbering.** Document numbers ≤ 16 chars with a **short-form FY** token
   (`{FY}` renders `26-27`), leaving SEQ headroom to 6 digits (`INV/26-27/000001`).
4. **State-code set.** 36 active GST state/UT codes; **96 (Foreign Country) and 97 (Other
   Territory) ARE seeded** as place-of-supply-only rows; **25 (Daman & Diu, merged into 26)
   and 28 (old AP, bifurcated → 37) are absent.**
5. **UTGST labels.** The five legislature-less UTs (Chandigarh, A&N, Lakshadweep, DNH&DD,
   Ladakh) carry an SGST-code / **`UTGST`**-label 9% row.
6. **`zero` = nil-rated DOMESTIC supply.** LUT/export zero-rating is a **named deferral**
   (spec §7); `exempt` = wholly-exempt (raises the Bill-of-Supply guard in WP-S4).
7. **B2C ≥ ₹50,000 conditional.** Unregistered-buyer invoices of ₹50,000 or more must carry
   the buyer name/address + place of supply (Rule 46 proviso).
8. **Rule 50/51 vouchers + advance netting.** Receipt/refund voucher rules and
   advance-then-invoice netting (implemented treatment, ratify in the memo).

---

## 3. Seeded data for early review (live on the IN pack draft v1)

### 3.1 GST state codes (38 rows — 36 active GST + 2 place-of-supply-only)

| GST | Code | Name | Type |
|----|------|------|------|
| 01 | IN-JK | Jammu and Kashmir | union_territory |
| 02 | IN-HP | Himachal Pradesh | state |
| 03 | IN-PB | Punjab | state |
| 04 | IN-CH | Chandigarh | union_territory |
| 05 | IN-UK | Uttarakhand | state |
| 06 | IN-HR | Haryana | state |
| 07 | IN-DL | Delhi | union_territory |
| 08 | IN-RJ | Rajasthan | state |
| 09 | IN-UP | Uttar Pradesh | state |
| 10 | IN-BR | Bihar | state |
| 11 | IN-SK | Sikkim | state |
| 12 | IN-AR | Arunachal Pradesh | state |
| 13 | IN-NL | Nagaland | state |
| 14 | IN-MN | Manipur | state |
| 15 | IN-MZ | Mizoram | state |
| 16 | IN-TR | Tripura | state |
| 17 | IN-ML | Meghalaya | state |
| 18 | IN-AS | Assam | state |
| 19 | IN-WB | West Bengal | state |
| 20 | IN-JH | Jharkhand | state |
| 21 | IN-OR | Odisha | state |
| 22 | IN-CT | Chhattisgarh | state |
| 23 | IN-MP | Madhya Pradesh | state |
| 24 | IN-GJ | Gujarat | state |
| 26 | IN-DH | Dadra and Nagar Haveli and Daman and Diu | union_territory |
| 27 | IN-MH | Maharashtra | state |
| 29 | IN-KA | Karnataka | state |
| 30 | IN-GA | Goa | state |
| 31 | IN-LD | Lakshadweep | union_territory |
| 32 | IN-KL | Kerala | state |
| 33 | IN-TN | Tamil Nadu | state |
| 34 | IN-PY | Puducherry | union_territory |
| 35 | IN-AN | Andaman and Nicobar Islands | union_territory |
| 36 | IN-TG | Telangana | state |
| 37 | IN-AP | Andhra Pradesh | state |
| 38 | IN-LA | Ladakh | union_territory |
| 96 | IN-FC | Foreign Country | gst_special (place-of-supply only, non-GSTIN) |
| 97 | IN-OT | Other Territory | gst_special (place-of-supply only, non-GSTIN) |

**CA check:** confirm the active set (36) and that 25/28 are correctly excluded and 96/97
are correctly place-of-supply-only. WP-S3's GSTIN validator uses the 36 non-`gst_special` rows.

### 3.2 Rate rows (10) — 18% slab only (other slabs are a named deferral, spec §7)

| Head label | Category | Rate % | applies_to | Scope |
|-----------|----------|-------:|-----------|-------|
| CGST | standard | 9 | gst_slab_18 | country |
| SGST | standard | 9 | gst_slab_18 | country |
| IGST | standard | 18 | gst_slab_18 | country |
| IGST | zero | 0 | — | country (nil-rated domestic) |
| IGST | exempt | 0 | — | country (wholly exempt) |
| UTGST | standard | 9 | gst_slab_18 | Chandigarh (04) |
| UTGST | standard | 9 | gst_slab_18 | A&N Islands (35) |
| UTGST | standard | 9 | gst_slab_18 | Lakshadweep (31) |
| UTGST | standard | 9 | gst_slab_18 | DNH & DD (26) |
| UTGST | standard | 9 | gst_slab_18 | Ladakh (38) |

**CA check:** equal dual-levy (CGST=SGST=UTGST at 9, IGST 18); UTGST rows carry the SGST
*code* with a `UTGST` *print label*; `zero` vs `exempt` treatment.

### 3.3 UQC mappings (9 active Rec-20 units)

| Internal code | UQC | Note |
|--------------|-----|------|
| C62 | NOS | number/each |
| HUR | HRS | hour — **flag if GSTN requires a different UQC** |
| DAY | DAY | day — **flag if GSTN requires a different UQC** |
| WEE | OTH | week (no GSTN UQC) → OTH |
| MON | OTH | month (no GSTN UQC) → OTH |
| ANN | OTH | year (no GSTN UQC) → OTH |
| E48 | OTH | service unit (no GSTN UQC) → OTH |
| E34 | OTH | gigabyte (no GSTN UQC) → OTH |
| E35 | OTH | terabyte (no GSTN UQC) → OTH |

**CA check:** the five `OTH` fallbacks and the `HRS`/`DAY` mappings — confirm the GSTN
portal accepts these on GSTR-1 HSN summary (this is a data-recovery lab, so service +
time + data-size units dominate).

### 3.4 Document number formats (5)

| Scope | Template | Rendered (FY 2026-27) |
|-------|----------|-----------------------|
| invoices | INV/{FY}/{SEQ:4} | INV/26-27/0001 |
| credit_note | CRN/{FY}/{SEQ:4} | CRN/26-27/0001 |
| receipt_voucher | RCV/{FY}/{SEQ:4} | RCV/26-27/0001 |
| refund_voucher | RFV/{FY}/{SEQ:4} | RFV/26-27/0001 |
| delivery_challan | DC/{FY}/{SEQ:4} | DC/26-27/0001 |

All fiscal-year reset, anchor **04-01**, max length 16.

### 3.5 Issuance requirement rows (10 — CGST Rule 46 / 53 gate)

| Doc | Field | Conditional? |
|-----|-------|-------------|
| invoice | buyer_tax_number (GSTIN) | B2B only |
| invoice | buyer_address | B2C ≥ ₹50,000 |
| invoice | place_of_supply_subdivision_id | always |
| invoice | line.item_code (HSN/SAC) | always |
| invoice | line.unit_code (UQC) | always |
| credit_note | buyer_tax_number (GSTIN) | B2B only |
| credit_note | place_of_supply_subdivision_id | always |
| credit_note | line.item_code (HSN/SAC) | always |
| credit_note | line.unit_code (UQC) | always |
| credit_note | original_invoice_ref | always (Section 34 / Rule 53) |

Voucher requirement rows are deliberately deferred to WP-L4.

---

## 4. Timeline & owner action

- **NOW (owner):** select + engage a qualified Indian CA; share this brief. Record the
  CA's name/credential below once engaged — WP-S7's `_meta.external_validation` requires them.
- **WP-S3 merge:** statutory arithmetic fixture JSONs available (`_meta.external_validation:
  pending`).
- **WP-S7:** full package (fixtures + rendered PDFs + deferrals memo) → CA signs the memo →
  hash recorded → dual-control publish flips IN to `statutory_ready`.

This WP (S1b) does **not** block on the CA; only WP-S7's final publish steps do.

### CA engagement record (owner fills in)

- **CA name / firm:** _______________________
- **Membership no. (ICAI):** _______________________
- **Engaged on:** _______________________
- **Notes / scope confirmations:** _______________________
