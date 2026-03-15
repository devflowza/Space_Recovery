-- Update salary_components constraints to support new component types

ALTER TABLE salary_components DROP CONSTRAINT IF EXISTS salary_components_component_type_check;
ALTER TABLE salary_components ADD CONSTRAINT salary_components_component_type_check
CHECK (component_type = ANY (ARRAY['earning'::text, 'allowance'::text, 'deduction'::text, 'bonus'::text]));

ALTER TABLE salary_components DROP CONSTRAINT IF EXISTS salary_components_calculation_type_check;
ALTER TABLE salary_components ADD CONSTRAINT salary_components_calculation_type_check
CHECK (calculation_type = ANY (ARRAY['fixed'::text, 'percentage'::text, 'formula'::text]));
