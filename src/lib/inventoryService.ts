import { supabase } from './supabaseClient';

// TypeScript Interfaces
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
  inventory_code: string | null;
  item_type: string;
  device_type_id: string | null;
  brand_id: string | null;
  model: string | null;
  serial_number: string | null;
  capacity_id: string | null;
  name: string;
  description: string | null;
  firmware_version: string | null;
  pcb_number: string | null;
  manufacture_date: string | null;
  supplier_name: string | null;
  supplier_contact: string | null;
  purchase_date: string | null;
  acquisition_cost: number;
  acquisition_date: string | null;
  quantity_purchased: number;
  quantity_available: number;
  quantity_in_use: number;
  storage_location_id: string | null;
  storage_notes: string | null;
  status_type_id: string | null;
  condition_type_id: string | null;
  tags: string[] | null;
  image_url: string | null;
  notes: string | null;
  last_verified_date: string | null;
  last_verified_by: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryStatusHistory {
  id: string;
  inventory_item_id: string;
  old_status_id: string | null;
  new_status_id: string | null;
  old_condition_id: string | null;
  new_condition_id: string | null;
  changed_by: string | null;
  change_reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  transaction_type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: string | null;
  reference_id: string | null;
  performed_by: string | null;
  reason: string | null;
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

// Master Data Functions
export async function getInventoryCategories() {
  const { data, error } = await supabase
    .from('inventory_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching inventory categories:', error);
    throw error;
  }
  return data as InventoryItemCategory[];
}

export async function getInventoryStatusTypes() {
  const { data, error } = await supabase
    .from('inventory_status_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching inventory status types:', error);
    throw error;
  }
  return data as InventoryStatusType[];
}

export async function getInventoryConditionTypes() {
  const { data, error } = await supabase
    .from('inventory_condition_types')
    .select('*')
    .eq('is_active', true)
    .order('rating', { ascending: false });

  if (error) throw error;
  return data as InventoryConditionType[];
}

// Inventory Items CRUD
export async function getInventoryItems(filters?: {
  category_id?: string;
  status_type_id?: string;
  condition_type_id?: string;
  location_id?: string;
  search?: string;
}) {
  let query = supabase
    .from('inventory_items')
    .select(`
      *,
      category:inventory_item_categories(id, name, color_code),
      status_type:inventory_status_types(id, name, color_code, is_available_status),
      condition_type:inventory_condition_types(id, rating, name, color_code),
      device_type:device_types(id, name),
      brand:brands(id, name),
      capacity:capacities(id, name, gb_value),
      storage_location:inventory_locations(id, name),
      interface:interfaces(id, name)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters?.status_type_id) {
    query = query.eq('status_type_id', filters.status_type_id);
  }

  if (filters?.condition_type_id) {
    query = query.eq('condition_type_id', filters.condition_type_id);
  }

  if (filters?.location_id) {
    query = query.eq('storage_location_id', filters.location_id);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,` +
      `inventory_code.ilike.%${filters.search}%,` +
      `serial_number.ilike.%${filters.search}%,` +
      `model.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching inventory items:', error);
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
    .select('model, status_type:inventory_status_types(name, is_available_status)')
    .eq('is_active', true)
    .in('model', modelNumbers);

  if (error) {
    console.error('Error fetching available stock counts:', error);
    return items.map(item => ({ ...item, similarCount: 0 }));
  }

  const stockCounts: Record<string, number> = {};

  availableItems?.forEach((item: any) => {
    // Count all items except those that are explicitly unavailable (Disposed, Defective)
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
      category:inventory_item_categories(id, name, color_code),
      status_type:inventory_status_types(id, name, color_code),
      condition_type:inventory_condition_types(id, rating, name, color_code),
      device_type:device_types(id, name),
      brand:brands(id, name),
      capacity:capacities(id, name, gb_value),
      storage_location:inventory_locations(id, name),
      created_by_profile:profiles!inventory_items_created_by_fkey(id, full_name),
      last_verified_by_profile:profiles!inventory_items_last_verified_by_fkey(id, full_name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching inventory item by ID:', error);
    throw error;
  }
  return data;
}

export async function createInventoryItem(item: Partial<InventoryItem>) {
  const { data, error } = await supabase
    .from('inventory_items')
    .insert([item])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>) {
  const { data, error } = await supabase
    .from('inventory_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Status History
export async function getInventoryStatusHistory(itemId: string) {
  const { data, error } = await supabase
    .from('inventory_status_history')
    .select(`
      *,
      old_status_type:inventory_status_types!inventory_status_history_old_status_type_id_fkey(id, name, color_code),
      new_status_type:inventory_status_types!inventory_status_history_new_status_type_id_fkey(id, name, color_code),
      changed_by_profile:profiles(id, full_name)
    `)
    .eq('inventory_item_id', itemId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('Error fetching inventory status history:', error);
    return [];
  }
  return data || [];
}

// Transactions
export async function getInventoryTransactions(itemId: string) {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select(`
      *,
      performed_by_profile:profiles(id, full_name),
      from_location:inventory_locations!inventory_transactions_from_location_id_fkey(id, name),
      to_location:inventory_locations!inventory_transactions_to_location_id_fkey(id, name)
    `)
    .eq('inventory_item_id', itemId)
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('Error fetching inventory transactions:', error);
    return [];
  }
  return data || [];
}

export async function createInventoryTransaction(transaction: Partial<InventoryTransaction>) {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .insert([transaction])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Quantity Adjustments
export async function adjustInventoryQuantity(
  itemId: string,
  quantityChange: number,
  transactionType: 'receipt' | 'issue' | 'adjustment' | 'return' | 'transfer' | 'write_off',
  reason: string,
  notes?: string
) {
  // Get current quantity
  const { data: item, error: fetchError } = await supabase
    .from('inventory_items')
    .select('quantity_available')
    .eq('id', itemId)
    .single();

  if (fetchError) throw fetchError;

  const quantityBefore = item.quantity_available;
  const quantityAfter = quantityBefore + quantityChange;

  // Create transaction record
  const { data: user } = await supabase.auth.getUser();

  await createInventoryTransaction({
    inventory_item_id: itemId,
    transaction_type: transactionType,
    quantity_change: quantityChange,
    quantity_before: quantityBefore,
    quantity_after: quantityAfter,
    reference_type: 'manual',
    performed_by: user?.user?.id,
    reason: reason,
    notes: notes,
  });

  // Update quantity
  const { data, error: updateError } = await supabase
    .from('inventory_items')
    .update({ quantity_available: quantityAfter })
    .eq('id', itemId)
    .select()
    .single();

  if (updateError) throw updateError;
  return data;
}

// Photos
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
    .single();

  if (error) throw error;
  return data as InventoryPhoto;
}

export async function deleteInventoryPhoto(photoId: string) {
  const { error } = await supabase
    .from('inventory_photos')
    .delete()
    .eq('id', photoId);

  if (error) throw error;
}

// Reports and Analytics
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

// Inventory Statistics
export async function getInventoryStatistics() {
  const { data: items, error } = await supabase
    .from('inventory_items')
    .select('quantity_available, quantity_in_use, acquisition_cost, status_type_id')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching inventory statistics:', error);
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
  const totalInStock = items.reduce((sum, item) => sum + (item.quantity_available || 0), 0);
  const totalInUse = items.reduce((sum, item) => sum + (item.quantity_in_use || 0), 0);
  const totalValue = items.reduce((sum, item) => {
    return sum + ((item.acquisition_cost || 0) * (item.quantity_available || 0));
  }, 0);

  return {
    totalItems,
    totalInStock,
    totalInUse,
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
      quantity_available,
      quantity_in_use,
      acquisition_cost,
      device_type:device_types(name),
      category:inventory_item_categories(name)
    `)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching inventory insights:', error);
    throw error;
  }

  let hddCount = 0;
  let ssdCount = 0;
  let pcbCount = 0;
  let totalValue = 0;
  let totalInUse = 0;

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
    const deviceTypeName = item.device_type?.name?.toLowerCase() || '';
    const categoryName = item.category?.name?.toLowerCase() || '';
    const quantity = item.quantity_available || 0;
    const inUse = item.quantity_in_use || 0;
    const cost = item.acquisition_cost || 0;

    totalValue += (cost * quantity);
    totalInUse += inUse;

    if (
      deviceTypeName.includes('hdd') ||
      categoryName.includes('hard drive') ||
      categoryName.includes('hard disk')
    ) {
      hddCount += quantity;
    } else if (
      deviceTypeName.includes('ssd') ||
      deviceTypeName.includes('nvme') ||
      deviceTypeName.includes('m.2') ||
      categoryName.includes('ssd') ||
      categoryName.includes('solid state')
    ) {
      ssdCount += quantity;
    }

    if (
      categoryName.includes('pcb') ||
      deviceTypeName.includes('pcb') ||
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
    totalInUse,
  };
}
