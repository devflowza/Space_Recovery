/*
  # Stock Module — Number Sequences & Constraint Update

  ## Summary
  Updates the number_sequences scope check constraint to allow new stock-related
  sequence scopes (stock_sale, stock_adjustment), then inserts those sequences.

  ## Changes
  - Drops and recreates number_sequences_scope_check to include stock_sale and stock_adjustment
  - Inserts stock_sale and stock_adjustment sequences
*/

ALTER TABLE number_sequences DROP CONSTRAINT IF EXISTS number_sequences_scope_check;

ALTER TABLE number_sequences ADD CONSTRAINT number_sequences_scope_check CHECK (
  scope = ANY (ARRAY[
    'case', 'invoice', 'quote', 'customer', 'expense', 'asset', 'proforma_invoice',
    'inventory', 'transfer', 'deposit', 'company', 'supplier', 'stock', 'purchase_order',
    'employee', 'user', 'document', 'clone_drive', 'report', 'report_evaluation',
    'report_service', 'report_server', 'report_malware', 'report_forensic',
    'report_data_destruction', 'report_prevention', 'payment',
    'stock_sale', 'stock_adjustment'
  ])
);

INSERT INTO number_sequences (scope, prefix, padding, last_number, annual_reset, current_year)
VALUES
  ('stock_sale', 'SSALE#', 5, 0, true, EXTRACT(YEAR FROM CURRENT_DATE)::integer),
  ('stock_adjustment', 'SADJ#', 4, 0, true, EXTRACT(YEAR FROM CURRENT_DATE)::integer)
ON CONFLICT (scope) DO NOTHING;
