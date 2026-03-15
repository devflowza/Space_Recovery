/*
  # Seed Plan Features
  
  Seeds feature flags for Starter, Professional, and Enterprise plans.
  Features include limits, capabilities, and highlighted premium features.
*/

-- Seed plan features for existing plans
INSERT INTO plan_features (plan_id, feature_key, feature_name, feature_name_ar, is_enabled, limit_value, limit_type, display_order, is_highlighted)
SELECT 
  p.id,
  f.feature_key,
  f.feature_name,
  f.feature_name_ar,
  f.is_enabled,
  f.limit_value,
  f.limit_type,
  f.display_order,
  f.is_highlighted
FROM subscription_plans p
CROSS JOIN (VALUES
  -- Starter features
  ('starter', 'case_management', 'Case Management', 'إدارة الحالات', true, NULL, 'boolean', 1, true),
  ('starter', 'basic_invoicing', 'Basic Invoicing', 'الفواتير الأساسية', true, NULL, 'boolean', 2, false),
  ('starter', 'customer_portal', 'Customer Portal', 'بوابة العملاء', true, NULL, 'boolean', 3, false),
  ('starter', 'email_support', 'Email Support', 'دعم البريد الإلكتروني', true, NULL, 'boolean', 4, false),
  ('starter', 'max_users', 'Up to 5 Team Members', 'حتى 5 أعضاء الفريق', true, 5, 'count', 5, false),
  ('starter', 'max_cases_per_month', 'Up to 50 Cases/month', 'حتى 50 حالة/شهر', true, 50, 'count', 6, false),
  ('starter', 'storage_gb', '10 GB Storage', '10 جيجابايت تخزين', true, 10, 'gb', 7, false),
  
  -- Professional features (includes starter)
  ('professional', 'case_management', 'Advanced Case Management', 'إدارة الحالات المتقدمة', true, NULL, 'boolean', 1, true),
  ('professional', 'basic_invoicing', 'Advanced Invoicing & Quotes', 'الفواتير والعروض المتقدمة', true, NULL, 'boolean', 2, false),
  ('professional', 'customer_portal', 'Customer Portal', 'بوابة العملاء', true, NULL, 'boolean', 3, false),
  ('professional', 'advanced_reports', 'Advanced Reports', 'التقارير المتقدمة', true, NULL, 'boolean', 4, true),
  ('professional', 'api_access', 'API Access', 'الوصول للواجهة البرمجية', true, NULL, 'boolean', 5, true),
  ('professional', 'bulk_import', 'Bulk Import/Export', 'استيراد/تصدير مجمع', true, NULL, 'boolean', 6, false),
  ('professional', 'multi_branch', 'Up to 3 Branches', 'حتى 3 فروع', true, 3, 'count', 7, false),
  ('professional', 'inventory_management', 'Inventory Management', 'إدارة المخزون', true, NULL, 'boolean', 8, false),
  ('professional', 'priority_support', 'Priority Email Support', 'دعم بريد إلكتروني أولوي', true, NULL, 'boolean', 9, false),
  ('professional', 'max_users', 'Up to 20 Team Members', 'حتى 20 عضو فريق', true, 20, 'count', 10, false),
  ('professional', 'max_cases_per_month', 'Up to 200 Cases/month', 'حتى 200 حالة/شهر', true, 200, 'count', 11, false),
  ('professional', 'storage_gb', '50 GB Storage', '50 جيجابايت تخزين', true, 50, 'gb', 12, false),
  
  -- Enterprise features (includes professional + more)
  ('enterprise', 'case_management', 'Enterprise Case Management', 'إدارة الحالات للمؤسسات', true, NULL, 'boolean', 1, true),
  ('enterprise', 'basic_invoicing', 'Advanced Invoicing & Quotes', 'الفواتير والعروض المتقدمة', true, NULL, 'boolean', 2, false),
  ('enterprise', 'customer_portal', 'Custom Branded Portal', 'بوابة مخصصة بعلامتك التجارية', true, NULL, 'boolean', 3, true),
  ('enterprise', 'advanced_reports', 'Advanced Reports & Analytics', 'التقارير والتحليلات المتقدمة', true, NULL, 'boolean', 4, true),
  ('enterprise', 'api_access', 'API Access', 'الوصول للواجهة البرمجية', true, NULL, 'boolean', 5, true),
  ('enterprise', 'bulk_import', 'Bulk Import/Export', 'استيراد/تصدير مجمع', true, NULL, 'boolean', 6, false),
  ('enterprise', 'multi_branch', 'Unlimited Branches', 'فروع غير محدودة', true, NULL, 'count', 7, false),
  ('enterprise', 'inventory_management', 'Advanced Inventory', 'إدارة مخزون متقدمة', true, NULL, 'boolean', 8, false),
  ('enterprise', 'white_labeling', 'White Labeling', 'العلامة البيضاء', true, NULL, 'boolean', 9, true),
  ('enterprise', 'sso', 'SSO Integration', 'تكامل SSO', true, NULL, 'boolean', 10, true),
  ('enterprise', 'custom_workflows', 'Custom Workflows', 'سير عمل مخصص', true, NULL, 'boolean', 11, false),
  ('enterprise', 'dedicated_support', 'Dedicated Support Manager', 'مدير دعم مخصص', true, NULL, 'boolean', 12, true),
  ('enterprise', 'sla_guarantee', '99.9% SLA Guarantee', 'ضمان SLA 99.9%', true, NULL, 'boolean', 13, false),
  ('enterprise', 'priority_onboarding', 'Priority Onboarding', 'تأهيل أولوي', true, NULL, 'boolean', 14, false),
  ('enterprise', 'max_users', 'Unlimited Team Members', 'أعضاء فريق غير محدود', true, NULL, 'count', 15, false),
  ('enterprise', 'max_cases_per_month', 'Unlimited Cases', 'حالات غير محدودة', true, NULL, 'count', 16, false),
  ('enterprise', 'storage_gb', 'Unlimited Storage', 'تخزين غير محدود', true, NULL, 'gb', 17, false)
) AS f(plan_code, feature_key, feature_name, feature_name_ar, is_enabled, limit_value, limit_type, display_order, is_highlighted)
WHERE p.code = f.plan_code
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  feature_name_ar = EXCLUDED.feature_name_ar,
  limit_value = EXCLUDED.limit_value,
  limit_type = EXCLUDED.limit_type,
  is_highlighted = EXCLUDED.is_highlighted;
