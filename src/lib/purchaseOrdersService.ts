import { supabase } from './supabaseClient';
import type { Database } from '../types/database.types';

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];
type PurchaseOrderInsert = Database['public']['Tables']['purchase_orders']['Insert'];
type PurchaseOrderUpdate = Database['public']['Tables']['purchase_orders']['Update'];
type PurchaseOrderItem = Database['public']['Tables']['purchase_order_items']['Row'];
type PurchaseOrderItemInsert = Database['public']['Tables']['purchase_order_items']['Insert'];
type PurchaseOrderStatus = Database['public']['Tables']['purchase_order_statuses']['Row'];

export interface PurchaseOrderWithRelations extends PurchaseOrder {
  supplier?: {
    id: string;
    supplier_name: string;
    supplier_number: string;
  };
  status_info?: PurchaseOrderStatus;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderStats {
  draft: number;
  approved: number;
  ordered: number;
  received: number;
}

export interface FetchPurchaseOrdersParams {
  search?: string;
  supplier_id?: string;
  status_id?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function fetchPurchaseOrders(params: FetchPurchaseOrdersParams = {}) {
  const {
    search,
    supplier_id,
    status_id,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = params;

  let query = supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(id, supplier_name, supplier_number),
      status_info:purchase_order_statuses(id, name, color)
    `, { count: 'exact' })
    .order('order_date', { ascending: false });

  if (search) {
    query = query.or(`po_number.ilike.%${search}%,notes.ilike.%${search}%`);
  }

  if (supplier_id) {
    query = query.eq('supplier_id', supplier_id);
  }

  if (status_id !== undefined) {
    query = query.eq('status_id', status_id);
  }

  if (startDate) {
    query = query.gte('order_date', startDate);
  }

  if (endDate) {
    query = query.lte('order_date', endDate);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    purchaseOrders: data as PurchaseOrderWithRelations[],
    total: count || 0,
  };
}

export async function fetchPurchaseOrderById(id: string) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(id, supplier_name, supplier_number, email, phone),
      status_info:purchase_order_statuses(id, name, color),
      items:purchase_order_items(*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as PurchaseOrderWithRelations | null;
}

export async function createPurchaseOrder(
  poData: Omit<PurchaseOrderInsert, 'id' | 'po_number' | 'created_at' | 'updated_at'>,
  items: Omit<PurchaseOrderItemInsert, 'id' | 'po_id' | 'created_at' | 'updated_at'>[],
  userId: string
) {
  const { data: nextNumber, error: numberError } = await supabase
    .rpc('get_next_po_number');

  if (numberError) throw numberError;

  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      ...poData,
      po_number: nextNumber,
      created_by: userId,
    })
    .select()
    .maybeSingle();

  if (poError) throw poError;

  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(
        items.map((item, index) => ({
          ...item,
          po_id: po.id,
          line_number: index + 1,
        }))
      );

    if (itemsError) throw itemsError;
  }

  return fetchPurchaseOrderById(po.id);
}

export async function updatePurchaseOrder(
  id: string,
  poData: PurchaseOrderUpdate,
  userId: string
) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .update({
      ...poData,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as PurchaseOrder;
}

export async function approvePurchaseOrder(id: string, userId: string) {
  const { data: statuses } = await supabase
    .from('purchase_order_statuses')
    .select('id')
    .eq('name', 'Approved')
    .maybeSingle();

  return updatePurchaseOrder(id, {
    status_id: statuses?.id || null,
    approved_by: userId,
    approved_at: new Date().toISOString(),
  }, userId);
}

export async function markPurchaseOrderOrdered(id: string, userId: string) {
  const { data: statuses } = await supabase
    .from('purchase_order_statuses')
    .select('id')
    .eq('name', 'Ordered')
    .maybeSingle();

  return updatePurchaseOrder(id, {
    status_id: statuses?.id || null,
  }, userId);
}

export async function receivePurchaseOrder(id: string, userId: string) {
  const { data: statuses } = await supabase
    .from('purchase_order_statuses')
    .select('id')
    .eq('name', 'Received')
    .maybeSingle();

  return updatePurchaseOrder(id, {
    status_id: statuses?.id || null,
    received_by: userId,
    received_at: new Date().toISOString(),
    actual_delivery_date: new Date().toISOString().split('T')[0],
  }, userId);
}

export async function deletePurchaseOrder(id: string) {
  const { error } = await supabase
    .from('purchase_orders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function getPurchaseOrderStats(): Promise<PurchaseOrderStats> {
  const { data: statuses } = await supabase
    .from('purchase_order_statuses')
    .select('id, name');

  const draftId = statuses?.find(s => s.name === 'Draft')?.id;
  const approvedId = statuses?.find(s => s.name === 'Approved')?.id;
  const orderedId = statuses?.find(s => s.name === 'Ordered')?.id;
  const receivedId = statuses?.find(s => s.name === 'Received')?.id;

  const [draftResult, approvedResult, orderedResult, receivedResult] = await Promise.all([
    draftId ? supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('status_id', draftId) : { count: 0 },
    approvedId ? supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('status_id', approvedId) : { count: 0 },
    orderedId ? supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('status_id', orderedId) : { count: 0 },
    receivedId ? supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('status_id', receivedId) : { count: 0 },
  ]);

  return {
    draft: draftResult.count || 0,
    approved: approvedResult.count || 0,
    ordered: orderedResult.count || 0,
    received: receivedResult.count || 0,
  };
}

export async function fetchPurchaseOrderStatuses() {
  const { data, error } = await supabase
    .from('purchase_order_statuses')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return data as PurchaseOrderStatus[];
}

export async function updatePurchaseOrderItems(
  poId: string,
  items: Omit<PurchaseOrderItemInsert, 'id' | 'po_id' | 'created_at' | 'updated_at'>[]
) {
  await supabase
    .from('purchase_order_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('po_id', poId);

  if (items.length > 0) {
    const { error } = await supabase
      .from('purchase_order_items')
      .insert(
        items.map((item, index) => ({
          ...item,
          po_id: poId,
          line_number: index + 1,
        }))
      );

    if (error) throw error;
  }
}
