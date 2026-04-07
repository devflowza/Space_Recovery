import { supabase } from './supabaseClient';
import { logger } from './logger';

export interface InventoryItemCategory {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  color_code: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryStatusType {
  id: string;
  name: string;
  description: string | null;
  color_code: string;
  is_available_status: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface InventoryConditionType {
  id: string;
  rating: number;
  name: string;
  description: string | null;
  color_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  category_id: string | null;
  item_category_id: string | null;
  item_number: string | null;
  brand_id: string | null;
  model: string | null;
  serial_number: string | null;
  capacity_id: string | null;
  interface_id: string | null;
  name: string;
  description: string | null;
  firmware_version: string | null;
  pcb_number: string | null;
  head_map: string | null;
  supplier_id: string | null;
  purchase_date: string | null;
  purchase_price: number;
  quantity: number;
  min_quantity: number;
  location_id: string | null;
  status_id: string | null;
  condition_id: string | null;
  notes: string | null;
  photos: string[] | null;
  is_donor: boolean;
  donor_parts_available: Record<string, unknown> | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface InventoryStatusHistory {
  id: string;
  item_id: string;
  old_status_id: string | null;
  new_status_id: string | null;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  transaction_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface InventoryPhoto {
  id: string;
  inventory_item_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  is_primary: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export async function getInventoryCategories() {
  const { data, error } = await supabase
    .from('master_inventory_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    logger.error('Error fetching inventory categories:', error);
    throw error;
  }
  return data as InventoryItemCategory[];
}

export async function getInventoryStatusTypes() {
  const { data, error } = await supabase
    .from('master_inventory_status_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    logger.error('Error fetching inventory status types:', error);
    throw error;
  }
  return data as InventoryStatusType[];
}

export async function getInventoryConditionTypes() {
  const { data, error } = await supabase
    .from('master_inventory_condition_types')
    .select('*')
    .eq('is_active', true)
    .order('rating', { ascending: false });

  if (error) throw error;
  return data as InventoryConditionType[];
}

export async function getInventoryItems(filters?: {
  category_id?: string;
  status_id?: string;
  condition_id?: string;
  location_id?: string;
  search?: string;
}) {
  let query = supabase
    .from('inventory_items')
    .select(`
      *,
      category:master_inventory_categories(id, name, color_code),
      status_type:master_inventory_status_types(id, name, color_code, is_available_status),
      condition_type:master_inventory_condition_types(id, rating, name, color_code),
      brand:catalog_device_brands(id, name),
      capacity:catalog_device_capacities(id, name, gb_value),
      storage_location:inventory_locations(id, name),
      interface:catalog_interfaces(id, name)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters?.status_id) {
    query = query.eq('status_id', filters.status_id);
  }

  if (filters?.condition_id) {
    query = query.eq('condition_id', filters.condition_id);
  }

  if (filters?.location_id) {
    query = query.eq('location_id', filters.location_id);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,` +
      `item_number.ilike.%${filters.search}%,` +
      `serial_number.ilike.%${filters.search}%,` +
      `model.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching inventory items:', error);
    throw error;
  }

  const items = data || [];
  return await enrichItemsWithStockCount(items);
}

export async function enrichItemsWithStockCount(items: any[]) {
  if (items.length === 0) return items;

  const modelNumbers = items
    .map(item => item.model)
    .filter(model => model && model.trim() !== '');

  if (modelNumbers.length === 0) {
    return items.map(item => ({ ...item, similarCount: 0 }));
  }

  const { data: availableItems, error } = await supabase
    .from('inventory_items')
    .select('model, status_type:master_inventory_status_types(name, is_available_status)')
    .is('deleted_at', null)
    .in('model', modelNumbers);

  if (error) {
    logger.error('Error fetching available stock counts:', error);
    return items.map(item => ({ ...item, similarCount: 0 }));
  }

  const stockCounts: Record<string, number> = {};

  availableItems?.forEach((item: any) => {
    const statusName = item.status_type?.name?.toLowerCase() || '';
    const isExcluded = statusName.includes('disposed') || statusName.includes('defective');

    if (item.model && !isExcluded) {
      stockCounts[item.model] = (stockCounts[item.model] || 0) + 1;
    }
  });

  return items.map(item => ({
    ...item,
    similarCount: item.model ? (stockCounts[item.model] || 0) : 0
  }));
}

export async function getInventoryItemById(id: string) {
  const { data, error } = await supabase
    .from('inventory_items')
    .select(`
      *,
      category:master_inventory_categories(id, name, color_code),
      status_type:master_inventory_status_types(id, name, color_code),
      condition_type:master_inventory_condition_types(id, rating, name, color_code),
      brand:catalog_device_brands(id, name),
      capacity:catalog_device_capacities(id, name, gb_value),
      storage_location:inventory_locations(id, name),
      interface:catalog_interfaces(id, name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching inventory item by ID:', error);
    throw error;
  }
  return data;
}

export async function createInventoryItem(item: Partial<InventoryItem>) {
  const { data, error } = await supabase
    .from('inventory_items')
    .insert([item])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>) {
  const { data, error } = await supabase
    .from('inventory_items')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase
    .from('inventory_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function getInventoryStatusHistory(itemId: string) {
  const { data, error } = await supabase
    .from('inventory_status_history')
    .select(`
      *,
      old_status:master_inventory_status_types!inventory_status_history_old_status_id_fkey(id, name, color_code),
      new_status:master_inventory_status_types!inventory_status_history_new_status_id_fkey(id, name, color_code)
    `)
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching inventory status history:', error);
    return [];
  }
  return data || [];
}

export async function getInventoryTransactions(itemId: string) {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching inventory transactions:', error);
    return [];
  }
  return data || [];
}

export async function createInventoryTransaction(transaction: Partial<InventoryTransaction>) {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .insert([transaction])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function adjustInventoryQuantity(
  itemId: string,
  quantityChange: number,
  transactionType: 'receipt' | 'issue' | 'adjustment' | 'return' | 'transfer' | 'write_off',
  reason: string,
  notes?: string
) {
  const { data: item, error: fetchError } = await supabase
    .from('inventory_items')
    .select('quantity')
    .eq('id', itemId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const quantityBefore = item?.quantity || 0;
  const quantityAfter = quantityBefore + quantityChange;

  const { data: user } = await supabase.auth.getUser();

  await createInventoryTransaction({
    item_id: itemId,
    transaction_type: transactionType,
    quantity: quantityChange,
    reference_type: 'manual',
    performed_by: user?.user?.id,
    notes: [reason, notes].filter(Boolean).join(' - '),
  });

  const { data, error: updateError } = await supabase
    .from('inventory_items')
    .update({ quantity: quantityAfter })
    .eq('id', itemId)
    .select()
    .maybeSingle();

  if (updateError) throw updateError;
  return data;
}

export async function getInventoryPhotos(itemId: string) {
  const { data, error } = await supabase
    .from('inventory_photos')
    .select('*')
    .eq('inventory_item_id', itemId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as InventoryPhoto[];
}

export async function addInventoryPhoto(photo: Partial<InventoryPhoto>) {
  const { data, error } = await supabase
    .from('inventory_photos')
    .insert([photo])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as InventoryPhoto;
}

export async function deleteInventoryPhoto(photoId: string) {
  const { error } = await supabase
    .from('inventory_photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', photoId);

  if (error) throw error;
}

export async function getInventoryValueByCategory() {
  const { data, error } = await supabase
    .from('inventory_value_by_category')
    .select('*');

  if (error) throw error;
  return data;
}

export async function calculateTotalInventoryValue() {
  const { data, error } = await supabase.rpc('calculate_total_inventory_value');

  if (error) throw error;
  return data as number;
}

export async function getInventoryStatistics() {
  const { data: items, error } = await supabase
    .from('inventory_items')
    .select('quantity, purchase_price, status_id')
    .is('deleted_at', null);

  if (error) {
    logger.error('Error fetching inventory statistics:', error);
    throw error;
  }

  if (!items) {
    return {
      totalItems: 0,
      totalInStock: 0,
      totalInUse: 0,
      totalValue: 0,
    };
  }

  const totalItems = items.length;
  const totalInStock = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalValue = items.reduce((sum, item) => {
    return sum + ((item.purchase_price || 0) * (item.quantity || 0));
  }, 0);

  return {
    totalItems,
    totalInStock,
    totalInUse: 0,
    totalValue,
  };
}

export interface InventoryInsights {
  hddCount: number;
  ssdCount: number;
  pcbCount: number;
  totalValue: number;
  totalInUse: number;
}

export async function getInventoryInsights(): Promise<InventoryInsights> {
  const { data: items, error } = await supabase
    .from('inventory_items')
    .select(`
      id,
      quantity,
      purchase_price,
      category:master_inventory_categories(name)
    `)
    .is('deleted_at', null);

  if (error) {
    logger.error('Error fetching inventory insights:', error);
    throw error;
  }

  let hddCount = 0;
  let ssdCount = 0;
  let pcbCount = 0;
  let totalValue = 0;

  if (!items) {
    return {
      hddCount: 0,
      ssdCount: 0,
      pcbCount: 0,
      totalValue: 0,
      totalInUse: 0,
    };
  }

  items.forEach((item: any) => {
    const categoryName = item.category?.name?.toLowerCase() || '';
    const quantity = item.quantity || 0;
    const cost = item.purchase_price || 0;

    totalValue += (cost * quantity);

    if (
      categoryName.includes('hard drive') ||
      categoryName.includes('hard disk') ||
      categoryName.includes('hdd')
    ) {
      hddCount += quantity;
    } else if (
      categoryName.includes('ssd') ||
      categoryName.includes('nvme') ||
      categoryName.includes('m.2') ||
      categoryName.includes('solid state')
    ) {
      ssdCount += quantity;
    }

    if (
      categoryName.includes('pcb') ||
      categoryName.includes('circuit board')
    ) {
      pcbCount += quantity;
    }
  });

  return {
    hddCount,
    ssdCount,
    pcbCount,
    totalValue,
    totalInUse: 0,
  };
}
