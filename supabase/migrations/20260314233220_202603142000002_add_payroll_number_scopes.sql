-- Add loan and payroll_bank_file scopes to number_sequences

ALTER TABLE number_sequences DROP CONSTRAINT IF EXISTS number_sequences_scope_check;

ALTER TABLE number_sequences ADD CONSTRAINT number_sequences_scope_check
CHECK (scope = ANY (ARRAY[
  'case'::text, 'invoice'::text, 'quote'::text, 'customer'::text, 
  'expense'::text, 'asset'::text, 'proforma_invoice'::text, 'inventory'::text, 
  'transfer'::text, 'deposit'::text, 'company'::text, 'supplier'::text, 
  'stock'::text, 'purchase_order'::text, 'employee'::text, 'user'::text, 
  'document'::text, 'clone_drive'::text, 'report'::text, 'report_evaluation'::text, 
  'report_service'::text, 'report_server'::text, 'report_malware'::text, 
  'report_forensic'::text, 'report_data_destruction'::text, 'report_prevention'::text, 
  'payment'::text, 'stock_sale'::text, 'stock_adjustment'::text,
  'loan'::text, 'payroll_bank_file'::text
]));

-- Add loan sequence
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM number_sequences WHERE scope = 'loan') THEN
    INSERT INTO number_sequences (scope, prefix, padding, last_number, annual_reset, current_year)
    VALUES ('loan', 'LOAN', 5, 0, true, EXTRACT(YEAR FROM CURRENT_DATE)::integer);
  END IF;
END $$;

-- Add payroll bank file sequence
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM number_sequences WHERE scope = 'payroll_bank_file') THEN
    INSERT INTO number_sequences (scope, prefix, padding, last_number, annual_reset, current_year)
    VALUES ('payroll_bank_file', 'PBF', 4, 0, true, EXTRACT(YEAR FROM CURRENT_DATE)::integer);
  END IF;
END $$;
