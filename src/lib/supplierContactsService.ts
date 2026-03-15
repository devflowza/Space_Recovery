import { supabase } from './supabaseClient';
import type { Database } from '../types/database.types';

type SupplierContact = Database['public']['Tables']['supplier_contacts']['Row'];
type SupplierContactInsert = Database['public']['Tables']['supplier_contacts']['Insert'];
type SupplierContactUpdate = Database['public']['Tables']['supplier_contacts']['Update'];

export async function fetchSupplierContacts(supplierId: string) {
  const { data, error } = await supabase
    .from('supplier_contacts')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as SupplierContact[];
}

export async function createSupplierContact(
  contactData: Omit<SupplierContactInsert, 'id' | 'created_at' | 'updated_at'>,
  userId: string
) {
  const { data, error } = await supabase
    .from('supplier_contacts')
    .insert({
      ...contactData,
      created_by: userId,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as SupplierContact;
}

export async function updateSupplierContact(
  id: string,
  contactData: SupplierContactUpdate,
  userId: string
) {
  const { data, error } = await supabase
    .from('supplier_contacts')
    .update({
      ...contactData,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as SupplierContact;
}

export async function deleteSupplierContact(id: string) {
  const { error } = await supabase
    .from('supplier_contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
