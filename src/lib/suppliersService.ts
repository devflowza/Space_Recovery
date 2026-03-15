import { supabase } from './supabaseClient';
import type { Database } from '../types/database.types';

type Supplier = Database['public']['Tables']['suppliers']['Row'];
type SupplierInsert = Database['public']['Tables']['suppliers']['Insert'];
type SupplierUpdate = Database['public']['Tables']['suppliers']['Update'];
type SupplierCategory = Database['public']['Tables']['supplier_categories']['Row'];
type SupplierPaymentTerm = Database['public']['Tables']['supplier_payment_terms']['Row'];

export interface SupplierWithRelations extends Supplier {
  category?: SupplierCategory;
  payment_term?: SupplierPaymentTerm;
}

export interface SupplierStats {
  total: number;
  active: number;
  pendingApproval: number;
  newThisMonth: number;
}

export interface FetchSuppliersParams {
  search?: string;
  category_id?: number;
  payment_terms_id?: number;
  is_active?: boolean;
  is_approved?: boolean;
  limit?: number;
  offset?: number;
  minRating?: number;
}

export async function fetchSuppliers(params: FetchSuppliersParams = {}) {
  const {
    search,
    category_id,
    payment_terms_id,
    is_active,
    is_approved,
    limit = 50,
    offset = 0,
    minRating,
  } = params;

  let query = supabase
    .from('suppliers')
    .select(`
      *,
      category:supplier_categories(id, name, color),
      payment_term:supplier_payment_terms(id, name, days)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`supplier_name.ilike.%${search}%,supplier_number.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  if (category_id !== undefined) {
    query = query.eq('category_id', category_id);
  }

  if (payment_terms_id !== undefined) {
    query = query.eq('payment_terms_id', payment_terms_id);
  }

  if (is_active !== undefined) {
    query = query.eq('is_active', is_active);
  }

  if (is_approved !== undefined) {
    query = query.eq('is_approved', is_approved);
  }

  if (minRating !== undefined && minRating > 0) {
    query = query.gte('reliability_score', minRating);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    suppliers: data as SupplierWithRelations[],
    total: count || 0,
  };
}

export async function fetchSupplierById(id: string) {
  const { data, error } = await supabase
    .from('suppliers')
    .select(`
      *,
      category:supplier_categories(id, name, description, color),
      payment_term:supplier_payment_terms(id, name, days, description)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as SupplierWithRelations | null;
}

export async function createSupplier(
  supplierData: Omit<SupplierInsert, 'id' | 'supplier_number' | 'created_at' | 'updated_at'>,
  userId: string
) {
  const { data: nextNumber, error: numberError } = await supabase
    .rpc('get_next_supplier_number');

  if (numberError) throw numberError;

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      ...supplierData,
      supplier_number: nextNumber,
      created_by: userId,
    })
    .select(`
      *,
      category:supplier_categories(id, name),
      payment_term:supplier_payment_terms(id, name, days)
    `)
    .single();

  if (error) throw error;
  return data as SupplierWithRelations;
}

export async function updateSupplier(
  id: string,
  supplierData: SupplierUpdate,
  userId: string
) {
  const { data, error } = await supabase
    .from('suppliers')
    .update({
      ...supplierData,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      category:supplier_categories(id, name),
      payment_term:supplier_payment_terms(id, name, days)
    `)
    .single();

  if (error) throw error;
  return data as SupplierWithRelations;
}

export async function toggleSupplierStatus(id: string, isActive: boolean, userId: string) {
  return updateSupplier(id, { is_active: isActive }, userId);
}

export async function deleteSupplier(id: string) {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getSupplierStats(): Promise<SupplierStats> {
  const [totalResult, activeResult, pendingResult, newResult] = await Promise.all([
    supabase.from('suppliers').select('id', { count: 'exact', head: true }),
    supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    supabase.from('suppliers').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString()),
  ]);

  return {
    total: totalResult.count || 0,
    active: activeResult.count || 0,
    pendingApproval: pendingResult.count || 0,
    newThisMonth: newResult.count || 0,
  };
}

export async function updateSupplierPerformanceMetrics(supplierId: string) {
  const { error } = await supabase.rpc('update_supplier_performance_metrics', {
    p_supplier_id: supplierId,
  });

  if (error) throw error;
}

export async function fetchSupplierCategories() {
  const { data, error } = await supabase
    .from('supplier_categories')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data as SupplierCategory[];
}

export async function fetchSupplierPaymentTerms() {
  const { data, error } = await supabase
    .from('supplier_payment_terms')
    .select('*')
    .eq('is_active', true)
    .order('days');

  if (error) throw error;
  return data as SupplierPaymentTerm[];
}
