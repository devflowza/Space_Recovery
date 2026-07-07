// INV-01 v1.1 mandatory-core field map (IRN READINESS, Phase 4 D3). Each IRP
// schema field is mapped to the xSuite issuance surface that already holds it.
// Source column names are `keyof` the GENERATED Database rows, so a rename or
// drop fails `npm run typecheck`; inv01Completeness.test.ts asserts coverage.
// This module is DATA ONLY — the in_irn payload builder is a named deferral.
import type { Database } from '../../../types/database.types';

type InvoiceColumn = keyof Database['public']['Tables']['invoices']['Row'];
type LineItemColumn = keyof Database['public']['Tables']['invoice_line_items']['Row'];
type TaxLineColumn = keyof Database['public']['Tables']['document_tax_lines']['Row'];
type SubdivisionColumn = keyof Database['public']['Tables']['geo_subdivisions']['Row'];

export type Inv01Source =
  | { kind: 'constant'; value: string }
  | { kind: 'invoice_column'; column: InvoiceColumn }
  | { kind: 'line_item_column'; column: LineItemColumn }
  | { kind: 'tax_line_column'; column: TaxLineColumn; componentCode?: 'CGST' | 'SGST' | 'IGST' }
  | { kind: 'subdivision_column'; column: SubdivisionColumn; via: InvoiceColumn }
  | { kind: 'company_settings'; path: string }
  | { kind: 'derived'; from: string[]; rule: string }
  | { kind: 'gap'; note: string }; // asserted EMPTY by inv01Completeness.test.ts

export interface Inv01FieldEntry {
  field: string;
  source: Inv01Source;
}

export const INV01_MANDATORY_FIELDS: readonly Inv01FieldEntry[] = [
  { field: 'Version', source: { kind: 'constant', value: '1.1' } },
  { field: 'TranDtls.TaxSch', source: { kind: 'constant', value: 'GST' } },
  { field: 'TranDtls.SupTyp', source: { kind: 'derived', from: ['invoices.buyer_tax_number'], rule: "B2B when a buyer GSTIN is present, else B2C (e-invoicing itself applies to B2B only)" } },
  { field: 'DocDtls.Typ', source: { kind: 'derived', from: ['invoices.invoice_type'], rule: "tax invoice → 'INV'; the credit_notes table (same snapshot shape) maps to 'CRN'" } },
  { field: 'DocDtls.No', source: { kind: 'invoice_column', column: 'invoice_number' } },
  { field: 'DocDtls.Dt', source: { kind: 'derived', from: ['invoices.invoice_date'], rule: 'rendered as dd/MM/yyyy (IRP date format)' } },
  { field: 'SellerDtls.Gstin', source: { kind: 'invoice_column', column: 'seller_tax_number' } },
  { field: 'SellerDtls.LglNm', source: { kind: 'company_settings', path: 'basic_info.legal_name' } },
  { field: 'SellerDtls.Addr1', source: { kind: 'company_settings', path: 'location.address_line1' } },
  { field: 'SellerDtls.Loc', source: { kind: 'company_settings', path: 'location.city' } },
  { field: 'SellerDtls.Pin', source: { kind: 'company_settings', path: 'location.postal_code' } },
  { field: 'SellerDtls.Stcd', source: { kind: 'derived', from: ['invoices.seller_tax_number'], rule: 'GSTIN characters 1-2 (the state code is embedded in the stamped seller GSTIN)' } },
  { field: 'BuyerDtls.Gstin', source: { kind: 'invoice_column', column: 'buyer_tax_number' } },
  { field: 'BuyerDtls.LglNm', source: { kind: 'derived', from: ['invoices.buyer_address', 'customers_enhanced.customer_name', 'companies.company_name'], rule: 'issuance snapshot name, falling back to the linked customer/company record' } },
  { field: 'BuyerDtls.Addr1', source: { kind: 'derived', from: ['invoices.buyer_address'], rule: 'frozen snapshot JSON line1' } },
  { field: 'BuyerDtls.Loc', source: { kind: 'derived', from: ['invoices.buyer_address'], rule: 'frozen snapshot JSON city' } },
  { field: 'BuyerDtls.Pin', source: { kind: 'derived', from: ['invoices.buyer_address'], rule: 'frozen snapshot JSON postal_code' } },
  { field: 'BuyerDtls.Stcd', source: { kind: 'derived', from: ['invoices.buyer_tax_number', 'invoices.place_of_supply_subdivision_id'], rule: 'GSTIN characters 1-2; unregistered buyer → the place-of-supply state code (Sec 12(2), S2 derivation)' } },
  { field: 'BuyerDtls.Pos', source: { kind: 'subdivision_column', column: 'tax_authority_code', via: 'place_of_supply_subdivision_id' } },
  { field: 'ItemList.SlNo', source: { kind: 'line_item_column', column: 'sort_order' } },
  { field: 'ItemList.PrdDesc', source: { kind: 'line_item_column', column: 'description' } },
  { field: 'ItemList.IsServc', source: { kind: 'derived', from: ['invoice_line_items.item_code'], rule: "'Y' when the HSN/SAC starts with 99 (services chapter), else 'N'" } },
  { field: 'ItemList.HsnCd', source: { kind: 'line_item_column', column: 'item_code' } },
  { field: 'ItemList.Qty', source: { kind: 'line_item_column', column: 'quantity' } },
  { field: 'ItemList.Unit', source: { kind: 'line_item_column', column: 'unit_code' } },
  { field: 'ItemList.UnitPrice', source: { kind: 'line_item_column', column: 'unit_price' } },
  { field: 'ItemList.TotAmt', source: { kind: 'line_item_column', column: 'total' } },
  { field: 'ItemList.AssAmt', source: { kind: 'tax_line_column', column: 'taxable_base' } },
  { field: 'ItemList.GstRt', source: { kind: 'derived', from: ['document_tax_lines.rate'], rule: 'sum of per-line component rates (CGST 9 + SGST 9 = 18, or IGST 18) — the slab rate, never a synthetic form-rate row' } },
  { field: 'ItemList.IgstAmt', source: { kind: 'tax_line_column', column: 'tax_amount', componentCode: 'IGST' } },
  { field: 'ItemList.CgstAmt', source: { kind: 'tax_line_column', column: 'tax_amount', componentCode: 'CGST' } },
  { field: 'ItemList.SgstAmt', source: { kind: 'tax_line_column', column: 'tax_amount', componentCode: 'SGST' } },
  { field: 'ItemList.TotItemVal', source: { kind: 'derived', from: ['document_tax_lines.taxable_base', 'document_tax_lines.tax_amount'], rule: 'per-line taxable base + all stored component amounts' } },
  { field: 'ValDtls.AssVal', source: { kind: 'derived', from: ['document_tax_lines.taxable_base'], rule: 'document rollup taxable base — CGST/SGST pairs share ONE base (dedup, never doubled; the S6 GSTR seam owns the same assertion)' } },
  { field: 'ValDtls.CgstVal', source: { kind: 'tax_line_column', column: 'tax_amount', componentCode: 'CGST' } },
  { field: 'ValDtls.SgstVal', source: { kind: 'tax_line_column', column: 'tax_amount', componentCode: 'SGST' } },
  { field: 'ValDtls.IgstVal', source: { kind: 'tax_line_column', column: 'tax_amount', componentCode: 'IGST' } },
  { field: 'ValDtls.RndOffAmt', source: { kind: 'derived', from: ['document_tax_lines.tax_treatment'], rule: "the persisted Section 170 'Round off' adjustment line (out_of_scope treatment at grand total, S3) — invoice, ledger and return tie" } },
  { field: 'ValDtls.TotInvVal', source: { kind: 'invoice_column', column: 'total_amount' } },
];
