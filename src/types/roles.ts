export const ROLES = ['owner', 'admin', 'technician', 'sales', 'accounts', 'hr'] as const;
export type Role = typeof ROLES[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  technician: 'Technician',
  sales: 'Sales',
  accounts: 'Accounts',
  hr: 'HR',
};

export const ROLE_COLORS: Record<Role, string> = {
  owner: 'bg-cat-6/10 text-cat-6 border-cat-6/20',
  admin: 'bg-cat-8/10 text-cat-8 border-cat-8/20',
  technician: 'bg-cat-2/10 text-cat-2 border-cat-2/20',
  sales: 'bg-cat-3/10 text-cat-3 border-cat-3/20',
  accounts: 'bg-cat-4/10 text-cat-4 border-cat-4/20',
  hr: 'bg-cat-7/10 text-cat-7 border-cat-7/20',
};

export const CASE_ACCESS_LEVELS = ['restricted', 'full'] as const;
export type CaseAccessLevel = typeof CASE_ACCESS_LEVELS[number];

export const STATUS_VALUES = ['active', 'inactive', 'pending'] as const;
export type UserStatus = typeof STATUS_VALUES[number];
