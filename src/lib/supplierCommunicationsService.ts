import { supabase } from './supabaseClient';
import type { Database } from '../types/database.types';

type SupplierCommunication = Database['public']['Tables']['supplier_communications']['Row'];
type SupplierCommunicationInsert = Database['public']['Tables']['supplier_communications']['Insert'];
type SupplierCommunicationUpdate = Database['public']['Tables']['supplier_communications']['Update'];

export async function fetchSupplierCommunications(supplierId: string) {
  const { data, error } = await supabase
    .from('supplier_communications')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('communication_date', { ascending: false });

  if (error) throw error;
  return data as SupplierCommunication[];
}

export async function createSupplierCommunication(
  communicationData: Omit<SupplierCommunicationInsert, 'id' | 'created_at'>,
  userId: string
) {
  const { data, error } = await supabase
    .from('supplier_communications')
    .insert({
      ...communicationData,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SupplierCommunication;
}

export async function updateSupplierCommunication(
  id: string,
  communicationData: SupplierCommunicationUpdate
) {
  const { data, error } = await supabase
    .from('supplier_communications')
    .update(communicationData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SupplierCommunication;
}

export async function markFollowUpCompleted(id: string) {
  return updateSupplierCommunication(id, { follow_up_completed: true });
}

export async function deleteSupplierCommunication(id: string) {
  const { error } = await supabase
    .from('supplier_communications')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getPendingFollowUps(supplierId?: string) {
  let query = supabase
    .from('supplier_communications')
    .select('*, supplier:suppliers(id, supplier_name)')
    .eq('follow_up_completed', false)
    .not('follow_up_date', 'is', null)
    .lte('follow_up_date', new Date().toISOString().split('T')[0])
    .order('follow_up_date', { ascending: true });

  if (supplierId) {
    query = query.eq('supplier_id', supplierId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}
