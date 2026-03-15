export const ROLES = ['admin', 'technician', 'sales', 'accounts', 'hr'] as const;
export type Role = typeof ROLES[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  technician: 'Technician',
  sales: 'Sales',
  accounts: 'Accounts',
  hr: 'HR',
};

export const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-rose-50 text-rose-700 border-rose-200',
  technician: 'bg-teal-50 text-teal-700 border-teal-200',
  sales: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  accounts: 'bg-amber-50 text-amber-700 border-amber-200',
  hr: 'bg-sky-50 text-sky-700 border-sky-200',
};

export const CASE_ACCESS_LEVELS = ['restricted', 'full'] as const;
export type CaseAccessLevel = typeof CASE_ACCESS_LEVELS[number];

export const STATUS_VALUES = ['active', 'inactive', 'pending'] as const;
export type UserStatus = typeof STATUS_VALUES[number];
