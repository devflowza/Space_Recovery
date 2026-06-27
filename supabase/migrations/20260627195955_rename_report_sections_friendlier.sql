-- Document Studio (2026-06-27): friendlier, canonical report section names
-- (owner decision). The section library is the single source the editor + Studio
-- read; the PDF resolves titles by section_key + the DOCUMENT_TRANSLATIONS i18n
-- system (all 13 languages). Data-only update to system rows; reversible.

UPDATE report_section_library SET section_name = 'Diagnostic Findings', updated_at = now()
  WHERE section_key = 'findings' AND is_system = true;

UPDATE report_section_library SET section_name = 'Proposed Solution', updated_at = now()
  WHERE section_key = 'recommendations' AND is_system = true;

UPDATE report_section_library SET section_name = 'Certificate of Destruction', updated_at = now()
  WHERE section_key = 'destruction_certificate' AND is_system = true;
