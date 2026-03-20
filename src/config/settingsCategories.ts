import {
  HardDrive,
  Settings as SettingsIcon,
  DollarSign,
  FileText,
  Shield,
  Globe,
  List,
  Building2,
  Database,
  ShoppingCart,
  ShieldCheck,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export type MasterDataTable =
  | 'device_types'
  | 'brands'
  | 'capacities'
  | 'accessories'
  | 'device_interfaces'
  | 'device_made_in'
  | 'device_encryption'
  | 'device_platter_no'
  | 'device_head_no'
  | 'inventory_locations'
  | 'interfaces'
  | 'service_types'
  | 'service_problems'
  | 'service_locations'
  | 'case_priorities'
  | 'case_statuses'
  | 'device_conditions'
  | 'device_roles'
  | 'customer_groups'
  | 'industries'
  | 'countries'
  | 'cities'
  | 'expense_categories'
  | 'quote_statuses'
  | 'invoice_statuses'
  | 'payment_methods'
  | 'inventory_categories'
  | 'inventory_status_types'
  | 'inventory_condition_types'
  | 'supplier_categories'
  | 'supplier_payment_terms'
  | 'purchase_order_statuses';

export interface SettingsCategory {
  id: string;
  title: string;
  icon: LucideIcon;
  backgroundColor: string;
  borderColor: string;
  tables: MasterDataTable[];
  actionLabel: string;
  description?: string;
}

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: 'device-media',
    title: 'Device & Media',
    icon: HardDrive,
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    tables: [
      'device_types',
      'brands',
      'capacities',
      'accessories',
      'device_interfaces',
      'interfaces',
      'device_made_in',
      'device_encryption',
      'device_platter_no',
      'device_head_no',
      'inventory_locations',
      'inventory_categories',
      'inventory_status_types',
      'inventory_condition_types',
    ],
    actionLabel: 'Manage Categories',
    description: 'Manage storage device specifications and inventory settings',
  },
  {
    id: 'case-service',
    title: 'Case & Service',
    icon: SettingsIcon,
    backgroundColor: '#10b981',
    borderColor: '#10b981',
    tables: ['service_types', 'service_problems', 'case_priorities', 'case_statuses', 'service_locations', 'device_conditions', 'device_roles'],
    actionLabel: 'Manage Categories',
    description: 'Manage service types, case priorities, and status workflows',
  },
  {
    id: 'client-financial',
    title: 'Client & Financial',
    icon: DollarSign,
    backgroundColor: '#a855f7',
    borderColor: '#a855f7',
    tables: [
      'customer_groups',
      'industries',
      'countries',
      'cities',
      'expense_categories',
      'quote_statuses',
      'invoice_statuses',
      'payment_methods',
    ],
    actionLabel: 'Manage Categories',
    description: 'Manage customer groups and financial configurations',
  },
  {
    id: 'procurement',
    title: 'Procurement',
    icon: ShoppingCart,
    backgroundColor: '#f97316',
    borderColor: '#f97316',
    tables: [
      'supplier_categories',
      'supplier_payment_terms',
      'purchase_order_statuses',
    ],
    actionLabel: 'Manage Categories',
    description: 'Manage supplier categories, payment terms, and purchase order statuses',
  },
  {
    id: 'general-settings',
    title: 'General Settings',
    icon: Building2,
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
    tables: [],
    actionLabel: 'Manage Settings',
    description: 'Configure company information, contact details, and branding',
  },
  {
    id: 'system-numbers',
    title: 'System & Numbers',
    icon: List,
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
    tables: [],
    actionLabel: 'Manage Sequences',
    description: 'Configure automatic numbering sequences for all entities',
  },
  {
    id: 'templates',
    title: 'Templates',
    icon: FileText,
    backgroundColor: '#ec4899',
    borderColor: '#ec4899',
    tables: [],
    actionLabel: 'Manage Categories',
    description: 'Email templates, document templates, and print layouts',
  },
  {
    id: 'report-sections',
    title: 'Report Sections',
    icon: FileText,
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
    tables: [],
    actionLabel: 'Manage Sections',
    description: 'Professional report section library and content presets',
  },
  {
    id: 'client-portal',
    title: 'Client Portal',
    icon: Shield,
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
    tables: [],
    actionLabel: 'Go to Page',
    description: 'Configure client portal access and features',
  },
  {
    id: 'localization',
    title: 'Localization',
    icon: Globe,
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
    tables: [],
    actionLabel: 'Go to Page',
    description: 'Language, timezone, currency, and regional settings',
  },
  {
    id: 'import-export',
    title: 'Import / Export',
    icon: Database,
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
    tables: [],
    actionLabel: 'Go to Page',
    description: 'Migrate data from legacy ERP systems or export current data',
  },
  {
    id: 'gdpr',
    title: 'GDPR & Compliance',
    icon: Shield,
    backgroundColor: '#059669',
    borderColor: '#059669',
    tables: [],
    actionLabel: 'Go to Page',
    description: 'Data subject requests, exports, retention policies, and compliance tools',
  },
  {
    id: 'security',
    title: 'Security',
    icon: ShieldCheck,
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
    tables: [],
    actionLabel: 'Manage Security',
    description: 'Two-factor authentication, session management, and security policies',
  },
];

export const TABLE_LABELS: Record<MasterDataTable, string> = {
  device_types: 'Device Types',
  brands: 'Brands',
  capacities: 'Capacities',
  accessories: 'Accessories',
  device_interfaces: 'Device Interface',
  interfaces: 'Interfaces',
  device_made_in: 'Device Made In',
  device_encryption: 'Device Encryption',
  device_platter_no: 'Device Platter No',
  device_head_no: 'Device Head No',
  inventory_locations: 'Inventory Locations',
  service_types: 'Service Types',
  service_problems: 'Device Problems',
  case_priorities: 'Case Priorities',
  case_statuses: 'Case Statuses',
  service_locations: 'Service Locations',
  device_conditions: 'Device Conditions',
  device_roles: 'Device Roles',
  customer_groups: 'Customer Groups',
  industries: 'Industries',
  countries: 'Countries',
  cities: 'Cities',
  expense_categories: 'Expense Categories',
  quote_statuses: 'Quote Statuses',
  invoice_statuses: 'Invoice Statuses',
  payment_methods: 'Client Payment Methods',
  inventory_categories: 'Inventory Categories',
  inventory_status_types: 'Inventory Status Types',
  inventory_condition_types: 'Inventory Condition Types',
  supplier_categories: 'Supplier Categories',
  supplier_payment_terms: 'Supplier Payment Terms',
  purchase_order_statuses: 'Purchase Order Statuses',
};
