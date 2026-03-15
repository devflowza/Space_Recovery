import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const getTenantId = (): string | null => {
  return localStorage.getItem('tenant_id');
};

export const setTenantId = (tenantId: string | null): void => {
  if (tenantId) {
    localStorage.setItem('tenant_id', tenantId);
  } else {
    localStorage.removeItem('tenant_id');
  }
};

export const clearTenantId = (): void => {
  localStorage.removeItem('tenant_id');
};
