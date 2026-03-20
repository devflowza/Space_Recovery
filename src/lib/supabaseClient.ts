import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Connection pooling is managed by Supabase infrastructure (PgBouncer in transaction mode).
// The REST API (PostgREST) and Realtime connections are automatically pooled.
// Edge functions use per-request clients with persistSession: false (stateless, no pool leaks).
// For direct Postgres connections (e.g., migrations), use the pooler connection string
// from Supabase Dashboard > Settings > Database > Connection Pooling.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'xsuite-web',
    },
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
