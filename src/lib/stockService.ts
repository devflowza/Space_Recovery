import { supabase } from './supabaseClient';
import type { Database } from '../types/database.types';
import { sanitizeFilterValue, isValidUuid } from './postgrestSanitizer';

type StockItem = Database['public']['Tables']['stock_items']['Row'];
type StockItemInsert = Database['public']['Tables']['stock_items']['Insert'];
type StockItemUpdate = Database['public']['Tables']['stock_items']['Update'];
type StockCategory = Database['public']['Tables']['stock_categories']['Row'];
type StockCategoryInsert = Database['public']['Tables']['stock_categories']['Insert'];
type StockTransaction = Database['public']['Tables']['stock_transactions']['Row'];
type StockTransactionInsert = Database['public']['Tables']['stock_transactions']['Insert'];
type StockSale = Database['public']['Tables']['stock_sales']['Row'];
type StockSaleInsert = Database['public']['Tables']['stock_sales']['Insert'];
type StockSaleItem = Database['public']['Tables']['stock_sale_items']['Row'];
type StockSaleItemInsert = Database['public']['Tables']['stock_sale_items']['Insert'];
type StockSerialNumber = Database['public']['Tables']['stock_serial_numbers']['Row'];
type StockAdjustmentSession = Database['public']['Tables']['stock_adjustment_sessions']['Row'];
type StockAdjustmentSessionInsert = Database['public']['Tables']['stock_adjustment_sessions']['Insert'];
type StockAdjustmentSessionItem = Database['public']['Tables']['stock_adjustment_session_items']['Row'];

export type {
  StockItem,
  StockItemInsert,
  StockItemUpdate,
  StockCategory,
  StockTransaction,
  StockSale,
  StockSaleItem,
  StockSerialNumber,
  StockAdjustmentSession,
  StockAdjustmentSessionItem,
};

export interface StockItemWithCategory extends StockItem {
  stock_categories?: StockCategory | null;
}

export interface StockSaleWithDetails extends StockSale {
  customers_enhanced?: { id: string; customer_name: string | null; email: string | null; phone: string | null } | null;
  cases?: { id: string; case_no: string | null; title: string | null } | null;
  stock_sale_items?: Array<StockSaleItem & { stock_items?: Pick<StockItem, 'id' | 'name' | 'brand' | 'sku'> | null }>;
}

export interface StockStats {
  totalItems: number;
  totalSaleableItems: number;
  totalInternalItems: number;
  stockValue: number;
  saleableValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  salesToday: number;
  revenueToday: number;
}

export interface StockSaleCreateData {
  customer_id: string;
  case_id?: string | null;
  company_id?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  items: Array<{
    stock_item_id: string;
    quantity: number;
    unit_price: number;
    cost_price?: number | null;
    serial_number?: string | null;
    warranty_start_date?: string | null;
    warranty_end_date?: string | null;
  }>;
}

export interface StockFilters {
  type?: 'internal' | 'saleable' | 'both';
  category_id?: string;
  lowStock?: boolean;
  search?: string;
  is_active?: boolean;
}

export interface StockTransactionFilters {
  itemId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export interface SalesFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  customer_id?: string;
  case_id?: string;
}

// ============================================================
// Stock Categories
// ============================================================

export async function getStockCategories(type?: 'internal' | 'saleable'): Promise<StockCategory[]> {
  let query = supabase
    .from('stock_categories')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (type) {
    query = query.eq('category_type', type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createStockCategory(data: StockCategoryInsert): Promise<StockCategory> {
  const { data: result, error } = await supabase
    .from('stock_categories')
    .insert(data)
    .select()
    .maybeSingle();
  if (error) throw error;
  return result;
}

export async function updateStockCategory(id: string, data: Partial<StockCategoryInsert>): Promise<StockCategory> {
  const { data: result, error } = await supabase
    .from('stock_categories')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return result;
}

export async function deleteStockCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('stock_categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// Stock Items
// ============================================================

export async function getStockItems(filters?: StockFilters): Promise<StockItemWithCategory[]> {
  let query = supabase
    .from('stock_items')
    .select('*, stock_categories(*)')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (filters?.type && filters.type !== 'both') {
    const t = sanitizeFilterValue(filters.type);
    query = query.or(`item_type.eq.${t},item_type.eq.both`);
  }
  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }
  if (filters?.search) {
    const s = sanitizeFilterValue(filters.search);
    query = query.or(
      `name.ilike.%${s}%,brand.ilike.%${s}%,sku.ilike.%${s}%,model.ilike.%${s}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  let items = (data ?? []) as StockItemWithCategory[];

  if (filters?.lowStock) {
    items = items.filter(
      (item) => item.current_quantity <= item.minimum_quantity
    );
  }

  return items;
}

export async function getStockItem(id: string): Promise<StockItemWithCategory | null> {
  const { data, error } = await supabase
    .from('stock_items')
    .select('*, stock_categories(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as StockItemWithCategory | null;
}

export async function getSaleableItems(): Promise<StockItemWithCategory[]> {
  const { data, error } = await supabase
    .from('stock_items')
    .select('*, stock_categories(*)')
    .or('item_type.eq.saleable,item_type.eq.both')
    .is('deleted_at', null)
    .eq('is_active', true)
    .gt('current_quantity', 0)
    .order('is_featured', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as StockItemWithCategory[];
}

export async function getLowStockItems(): Promise<StockItemWithCategory[]> {
  const { data, error } = await supabase
    .from('stock_items')
    .select('*, stock_categories(*)')
    .is('deleted_at', null)
    .eq('is_active', true);
  if (error) throw error;

  const items = (data ?? []) as StockItemWithCategory[];
  return items.filter((item) => item.current_quantity <= item.minimum_quantity);
}

export async function createStockItem(data: StockItemInsert): Promise<StockItem> {
  const sku = await supabase.rpc('get_next_number', { p_scope: 'stock' });

  const { data: result, error } = await supabase
    .from('stock_items')
    .insert({ ...data, sku: sku.data ?? data.sku })
    .select()
    .maybeSingle();
  if (error) throw error;
  return result;
}

export async function updateStockItem(id: string, data: StockItemUpdate): Promise<StockItem> {
  const existing = await getStockItem(id);

  if (
    existing &&
    (data.cost_price !== undefined || data.selling_price !== undefined)
  ) {
    const priceChanges: Array<{
      stock_item_id: string;
      price_type: string;
      old_price: number | null;
      new_price: number | null;
      effective_date: string;
    }> = [];

    if (data.cost_price !== undefined && data.cost_price !== existing.cost_price) {
      priceChanges.push({
        stock_item_id: id,
        price_type: 'cost',
        old_price: existing.cost_price,
        new_price: data.cost_price,
        effective_date: new Date().toISOString(),
      });
    }
    if (data.selling_price !== undefined && data.selling_price !== existing.selling_price) {
      priceChanges.push({
        stock_item_id: id,
        price_type: 'selling',
        old_price: existing.selling_price,
        new_price: data.selling_price,
        effective_date: new Date().toISOString(),
      });
    }
    if (priceChanges.length > 0) {
      await supabase.from('stock_price_history').insert(priceChanges);
    }
  }

  const { data: result, error } = await supabase
    .from('stock_items')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return result;
}

export async function deleteStockItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('stock_items')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id);
  if (error) throw error;
}

export async function reserveStock(itemId: string, quantity: number, caseId?: string): Promise<void> {
  const item = await getStockItem(itemId);
  if (!item) throw new Error('Stock item not found');

  const available = item.current_quantity - item.reserved_quantity;
  if (available < quantity) throw new Error('Insufficient stock available to reserve');

  const { error: updateError } = await supabase
    .from('stock_items')
    .update({ reserved_quantity: item.reserved_quantity + quantity })
    .eq('id', itemId);
  if (updateError) throw updateError;

  await supabase.from('stock_transactions').insert({
    stock_item_id: itemId,
    transaction_type: 'reserved',
    quantity,
    previous_quantity: item.current_quantity,
    new_quantity: item.current_quantity,
    case_id: caseId ?? null,
    transaction_date: new Date().toISOString(),
  });
}

export async function releaseReservedStock(itemId: string, quantity: number): Promise<void> {
  const item = await getStockItem(itemId);
  if (!item) throw new Error('Stock item not found');

  const newReserved = Math.max(0, item.reserved_quantity - quantity);

  const { error } = await supabase
    .from('stock_items')
    .update({ reserved_quantity: newReserved })
    .eq('id', itemId);
  if (error) throw error;

  await supabase.from('stock_transactions').insert({
    stock_item_id: itemId,
    transaction_type: 'released',
    quantity,
    previous_quantity: item.current_quantity,
    new_quantity: item.current_quantity,
    transaction_date: new Date().toISOString(),
  });
}

// ============================================================
// Stock Transactions
// ============================================================

export async function getStockTransactions(filters?: StockTransactionFilters): Promise<StockTransaction[]> {
  let query = supabase
    .from('stock_transactions')
    .select('*')
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false });

  if (filters?.itemId) query = query.eq('stock_item_id', filters.itemId);
  if (filters?.type) query = query.eq('transaction_type', filters.type);
  if (filters?.startDate) query = query.gte('transaction_date', filters.startDate);
  if (filters?.endDate) query = query.lte('transaction_date', filters.endDate);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function recordStockReceipt(
  itemId: string,
  quantity: number,
  options?: {
    poId?: string;
    cost?: number;
    serialNumbers?: string[];
    notes?: string;
  }
): Promise<void> {
  const item = await getStockItem(itemId);
  if (!item) throw new Error('Stock item not found');

  const newQty = item.current_quantity + quantity;

  const { error: updateError } = await supabase
    .from('stock_items')
    .update({ current_quantity: newQty, updated_at: new Date().toISOString() })
    .eq('id', itemId);
  if (updateError) throw updateError;

  await supabase.from('stock_transactions').insert({
    stock_item_id: itemId,
    transaction_type: 'received',
    quantity,
    previous_quantity: item.current_quantity,
    new_quantity: newQty,
    purchase_order_id: options?.poId ?? null,
    unit_cost: options?.cost ?? item.cost_price,
    notes: options?.notes ?? null,
    transaction_date: new Date().toISOString(),
  });

  if (options?.serialNumbers && options.serialNumbers.length > 0) {
    const serials = options.serialNumbers.map((sn) => ({
      stock_item_id: itemId,
      serial_number: sn,
      status: 'in_stock' as const,
      purchase_order_id: options.poId ?? null,
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_cost: options.cost ?? null,
    }));
    await supabase.from('stock_serial_numbers').insert(serials);
  }
}

export async function recordStockUsage(
  itemId: string,
  quantity: number,
  caseId: string,
  notes?: string
): Promise<void> {
  const item = await getStockItem(itemId);
  if (!item) throw new Error('Stock item not found');
  if (item.current_quantity < quantity) throw new Error('Insufficient stock');

  const newQty = item.current_quantity - quantity;

  const { error: updateError } = await supabase
    .from('stock_items')
    .update({ current_quantity: newQty, updated_at: new Date().toISOString() })
    .eq('id', itemId);
  if (updateError) throw updateError;

  await supabase.from('stock_transactions').insert({
    stock_item_id: itemId,
    transaction_type: 'used',
    quantity: -quantity,
    previous_quantity: item.current_quantity,
    new_quantity: newQty,
    case_id: caseId,
    unit_cost: item.cost_price,
    notes: notes ?? null,
    transaction_date: new Date().toISOString(),
  });
}

// ============================================================
// Stock Sales
// ============================================================

export async function getStockSales(filters?: SalesFilters): Promise<StockSaleWithDetails[]> {
  let query = supabase
    .from('stock_sales')
    .select(`
      *,
      customers_enhanced(id, customer_name, email, phone),
      cases(id, case_no, title),
      stock_sale_items(*, stock_items(id, name, brand, sku))
    `)
    .is('deleted_at', null)
    .order('sale_date', { ascending: false });

  if (filters?.status) query = query.eq('payment_status', filters.status);
  if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id);
  if (filters?.case_id) query = query.eq('case_id', filters.case_id);
  if (filters?.startDate) query = query.gte('sale_date', filters.startDate);
  if (filters?.endDate) query = query.lte('sale_date', filters.endDate);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as StockSaleWithDetails[];
}

export async function getStockSale(id: string): Promise<StockSaleWithDetails | null> {
  const { data, error } = await supabase
    .from('stock_sales')
    .select(`
      *,
      customers_enhanced(id, customer_name, email, phone),
      cases(id, case_no, title),
      stock_sale_items(*, stock_items(id, name, brand, sku, image_url))
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as StockSaleWithDetails | null;
}

export async function getSalesByCase(caseId: string): Promise<StockSaleWithDetails[]> {
  return getStockSales({ case_id: caseId });
}

export async function getSalesByCustomer(customerId: string): Promise<StockSaleWithDetails[]> {
  return getStockSales({ customer_id: customerId });
}

export async function createStockSale(data: StockSaleCreateData): Promise<StockSale> {
  const saleNumberResult = await supabase.rpc('get_next_number', { p_scope: 'stock_sale' });
  const saleNumber = saleNumberResult.data;

  let subtotal = 0;
  let taxAmount = 0;
  const itemsWithTotals = data.items.map((item) => {
    const lineTotal = item.quantity * item.unit_price;
    subtotal += lineTotal;
    return { ...item, line_total: lineTotal };
  });

  let discountAmount = 0;
  if (data.discount_type === 'percentage' && data.discount_value) {
    discountAmount = (subtotal * data.discount_value) / 100;
  } else if (data.discount_type === 'fixed' && data.discount_value) {
    discountAmount = data.discount_value;
  }

  const totalAmount = subtotal - discountAmount + taxAmount;

  const saleInsert: StockSaleInsert = {
    sale_number: saleNumber,
    customer_id: data.customer_id,
    case_id: data.case_id ?? null,
    company_id: data.company_id ?? null,
    payment_method: data.payment_method ?? null,
    notes: data.notes ?? null,
    discount_type: data.discount_type ?? null,
    discount_value: data.discount_value ?? null,
    subtotal,
    tax_amount: taxAmount,
    discount_amount: discountAmount,
    total_amount: totalAmount,
    payment_status: data.payment_method === 'added_to_invoice' ? 'pending' : 'paid',
  };

  const { data: sale, error: saleError } = await supabase
    .from('stock_sales')
    .insert(saleInsert)
    .select()
    .maybeSingle();
  if (saleError) throw saleError;

  const saleItemsInsert: StockSaleItemInsert[] = itemsWithTotals.map((item) => ({
    sale_id: sale.id,
    stock_item_id: item.stock_item_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    cost_price: item.cost_price ?? null,
    discount_amount: 0,
    tax_amount: 0,
    line_total: item.line_total,
    serial_number: item.serial_number ?? null,
    warranty_start_date: item.warranty_start_date ?? null,
    warranty_end_date: item.warranty_end_date ?? null,
  }));

  const { error: itemsError } = await supabase.from('stock_sale_items').insert(saleItemsInsert);
  if (itemsError) throw itemsError;

  const itemIds = data.items.map((item) => item.stock_item_id);
  const { data: stockItemsData } = await supabase
    .from('stock_items')
    .select('*')
    .in('id', itemIds)
    .is('deleted_at', null);
  const stockItemsMap = new Map((stockItemsData ?? []).map((si) => [si.id, si]));

  for (const item of data.items) {
    const stockItem = stockItemsMap.get(item.stock_item_id);
    if (!stockItem) continue;

    const newQty = stockItem.current_quantity - item.quantity;
    await supabase
      .from('stock_items')
      .update({ current_quantity: Math.max(0, newQty), updated_at: new Date().toISOString() })
      .eq('id', item.stock_item_id);

    await supabase.from('stock_transactions').insert({
      stock_item_id: item.stock_item_id,
      transaction_type: 'sold',
      quantity: -item.quantity,
      previous_quantity: stockItem.current_quantity,
      new_quantity: Math.max(0, newQty),
      sale_id: sale.id,
      customer_id: data.customer_id,
      case_id: data.case_id ?? null,
      unit_cost: item.cost_price ?? stockItem.cost_price,
      unit_price: item.unit_price,
      transaction_date: new Date().toISOString(),
    });

    if (item.serial_number) {
      await supabase
        .from('stock_serial_numbers')
        .update({
          status: 'sold',
          sale_id: sale.id,
          sold_to_customer_id: data.customer_id,
          sold_date: new Date().toISOString().split('T')[0],
        })
        .eq('stock_item_id', item.stock_item_id)
        .eq('serial_number', item.serial_number);
    }
  }

  return sale;
}

export async function updateStockSale(id: string, data: Partial<StockSaleInsert>): Promise<StockSale> {
  const { data: result, error } = await supabase
    .from('stock_sales')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return result;
}

export async function cancelStockSale(id: string): Promise<void> {
  const sale = await getStockSale(id);
  if (!sale) throw new Error('Sale not found');

  if (sale.stock_sale_items) {
    const cancelItemIds = sale.stock_sale_items.map((item: StockSaleItem) => item.stock_item_id);
    const { data: cancelStockItemsData } = await supabase
      .from('stock_items')
      .select('*')
      .in('id', cancelItemIds)
      .is('deleted_at', null);
    const cancelStockItemsMap = new Map((cancelStockItemsData ?? []).map((si) => [si.id, si]));

    for (const item of sale.stock_sale_items) {
      const stockItem = cancelStockItemsMap.get(item.stock_item_id);
      if (!stockItem) continue;

      const newQty = stockItem.current_quantity + item.quantity;
      await supabase
        .from('stock_items')
        .update({ current_quantity: newQty, updated_at: new Date().toISOString() })
        .eq('id', item.stock_item_id);

      await supabase.from('stock_transactions').insert({
        stock_item_id: item.stock_item_id,
        transaction_type: 'returned',
        quantity: item.quantity,
        previous_quantity: stockItem.current_quantity,
        new_quantity: newQty,
        sale_id: id,
        notes: `Returned from cancelled sale ${sale.sale_number}`,
        transaction_date: new Date().toISOString(),
      });

      if (item.serial_number) {
        await supabase
          .from('stock_serial_numbers')
          .update({ status: 'in_stock', sale_id: null, sold_to_customer_id: null, sold_date: null })
          .eq('stock_item_id', item.stock_item_id)
          .eq('serial_number', item.serial_number);
      }
    }
  }

  await supabase
    .from('stock_sales')
    .update({ payment_status: 'refunded', deleted_at: new Date().toISOString() })
    .eq('id', id);
}

export async function addSaleToInvoice(saleId: string, invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from('stock_sales')
    .update({ invoice_id: invoiceId, payment_method: 'added_to_invoice', updated_at: new Date().toISOString() })
    .eq('id', saleId);
  if (error) throw error;
}

// ============================================================
// Serial Numbers
// ============================================================

export async function getSerialNumbers(itemId: string): Promise<StockSerialNumber[]> {
  const { data, error } = await supabase
    .from('stock_serial_numbers')
    .select('*')
    .eq('stock_item_id', itemId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAvailableSerialNumbers(itemId: string): Promise<StockSerialNumber[]> {
  const { data, error } = await supabase
    .from('stock_serial_numbers')
    .select('*')
    .eq('stock_item_id', itemId)
    .eq('status', 'in_stock')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addSerialNumbers(itemId: string, serialNumbers: string[]): Promise<void> {
  const inserts = serialNumbers.map((sn) => ({
    stock_item_id: itemId,
    serial_number: sn,
    status: 'in_stock' as const,
  }));
  const { error } = await supabase.from('stock_serial_numbers').insert(inserts);
  if (error) throw error;
}

export async function markSerialAsSold(
  serialNumber: string,
  saleId: string,
  customerId: string
): Promise<void> {
  const { error } = await supabase
    .from('stock_serial_numbers')
    .update({
      status: 'sold',
      sale_id: saleId,
      sold_to_customer_id: customerId,
      sold_date: new Date().toISOString().split('T')[0],
    })
    .eq('serial_number', serialNumber);
  if (error) throw error;
}

// ============================================================
// Adjustments
// ============================================================

export async function getStockAdjustments(): Promise<StockAdjustmentSession[]> {
  const { data, error } = await supabase
    .from('stock_adjustment_sessions')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getStockAdjustment(
  id: string
): Promise<(StockAdjustmentSession & { items: StockAdjustmentSessionItem[] }) | null> {
  const { data, error } = await supabase
    .from('stock_adjustment_sessions')
    .select('*, stock_adjustment_session_items(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const d = data as StockAdjustmentSession & { stock_adjustment_session_items?: StockAdjustmentSessionItem[] };
  return { ...d, items: d.stock_adjustment_session_items ?? [] };
}

export async function createStockAdjustment(
  data: StockAdjustmentSessionInsert & {
    items: Array<{ stock_item_id: string; system_quantity: number; counted_quantity: number; notes?: string }>;
  }
): Promise<StockAdjustmentSession> {
  const numberResult = await supabase.rpc('get_next_number', { p_scope: 'stock_adjustment' });

  const { data: session, error: sessionError } = await supabase
    .from('stock_adjustment_sessions')
    .insert({ ...data, adjustment_number: numberResult.data })
    .select()
    .maybeSingle();
  if (sessionError) throw sessionError;

  if (data.items && data.items.length > 0) {
    const itemInserts = data.items.map((item) => ({
      session_id: session.id,
      stock_item_id: item.stock_item_id,
      system_quantity: item.system_quantity,
      counted_quantity: item.counted_quantity,
      notes: item.notes ?? null,
    }));
    const { error: itemsError } = await supabase
      .from('stock_adjustment_session_items')
      .insert(itemInserts);
    if (itemsError) throw itemsError;
  }

  return session;
}

export async function approveStockAdjustment(id: string, approvedBy: string): Promise<void> {
  const adjustment = await getStockAdjustment(id);
  if (!adjustment) throw new Error('Adjustment not found');

  for (const item of adjustment.items) {
    if (item.counted_quantity === null || item.system_quantity === null) continue;
    const variance = item.counted_quantity - item.system_quantity;
    if (variance === 0) continue;

    const stockItem = await getStockItem(item.stock_item_id);
    if (!stockItem) continue;

    const newQty = stockItem.current_quantity + variance;
    await supabase
      .from('stock_items')
      .update({ current_quantity: Math.max(0, newQty), updated_at: new Date().toISOString() })
      .eq('id', item.stock_item_id);

    await supabase.from('stock_transactions').insert({
      stock_item_id: item.stock_item_id,
      transaction_type: 'adjusted',
      quantity: variance,
      previous_quantity: stockItem.current_quantity,
      new_quantity: Math.max(0, newQty),
      notes: `Adjustment #${adjustment.adjustment_number}: ${adjustment.reason ?? ''}`,
      transaction_date: new Date().toISOString(),
    });
  }

  await supabase
    .from('stock_adjustment_sessions')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

// ============================================================
// Stats & Reports
// ============================================================

export async function getStockStats(): Promise<StockStats> {
  const [itemsResult, salesTodayResult] = await Promise.all([
    supabase.from('stock_items').select('*').is('deleted_at', null).eq('is_active', true),
    supabase
      .from('stock_sales')
      .select('total_amount')
      .is('deleted_at', null)
      .gte('sale_date', new Date().toISOString().split('T')[0]),
  ]);

  const items = (itemsResult.data ?? []) as StockItem[];
  const salesToday = salesTodayResult.data ?? [];

  const saleableItems = items.filter((i) => i.item_type === 'saleable' || i.item_type === 'both');
  const internalItems = items.filter((i) => i.item_type === 'internal' || i.item_type === 'both');

  const stockValue = items.reduce(
    (sum, i) => sum + (i.current_quantity * (i.cost_price ?? 0)),
    0
  );
  const saleableValue = saleableItems.reduce(
    (sum, i) => sum + (i.current_quantity * (i.selling_price ?? 0)),
    0
  );
  const lowStockCount = items.filter((i) => i.current_quantity <= i.minimum_quantity && i.current_quantity > 0).length;
  const outOfStockCount = items.filter((i) => i.current_quantity === 0).length;
  const revenueToday = salesToday.reduce((sum, s) => sum + (s.total_amount ?? 0), 0);

  return {
    totalItems: items.length,
    totalSaleableItems: saleableItems.length,
    totalInternalItems: internalItems.length,
    stockValue,
    saleableValue,
    lowStockCount,
    outOfStockCount,
    salesToday: salesToday.length,
    revenueToday,
  };
}

export async function getStockValuation(): Promise<Array<{ item: StockItem; costValue: number; sellValue: number; margin: number }>> {
  const items = await getStockItems();
  return items.map((item) => {
    const costValue = item.current_quantity * (item.cost_price ?? 0);
    const sellValue = item.current_quantity * (item.selling_price ?? item.cost_price ?? 0);
    const margin = item.cost_price && item.selling_price
      ? ((item.selling_price - item.cost_price) / item.selling_price) * 100
      : 0;
    return { item, costValue, sellValue, margin };
  });
}

export async function getSalesReport(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('stock_sales')
    .select('*, stock_sale_items(quantity, unit_price, cost_price, line_total)')
    .is('deleted_at', null)
    .gte('sale_date', startDate)
    .lte('sale_date', endDate)
    .order('sale_date', { ascending: false });
  if (error) throw error;

  const sales = data ?? [];
  const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount ?? 0), 0);
  const totalCost = sales.reduce((sum, s) => {
    const items = (s as unknown as { stock_sale_items?: Array<{ quantity: number; cost_price: number | null }> }).stock_sale_items ?? [];
    return sum + items.reduce((si, i) => si + (i.quantity * (i.cost_price ?? 0)), 0);
  }, 0);

  return { sales, totalRevenue, totalCost, totalProfit: totalRevenue - totalCost };
}

export async function getTopSellingItems(startDate: string, endDate: string, limit = 10) {
  const { data, error } = await supabase
    .from('stock_sale_items')
    .select('stock_item_id, quantity, line_total, stock_items(id, name, brand, sku)')
    .is('deleted_at', null);
  if (error) throw error;

  const map = new Map<string, { name: string; brand: string | null; sku: string | null; totalQty: number; totalRevenue: number }>();
  for (const item of data ?? []) {
    const si = item as unknown as {
      stock_item_id: string; quantity: number; line_total: number;
      stock_items?: { id: string; name: string; brand: string | null; sku: string | null } | null;
    };
    const key = si.stock_item_id;
    const existing = map.get(key);
    if (existing) {
      existing.totalQty += si.quantity;
      existing.totalRevenue += si.line_total;
    } else {
      map.set(key, {
        name: si.stock_items?.name ?? '',
        brand: si.stock_items?.brand ?? null,
        sku: si.stock_items?.sku ?? null,
        totalQty: si.quantity,
        totalRevenue: si.line_total,
      });
    }
  }

  return Array.from(map.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

export async function getLowStockCount(): Promise<number> {
  const items = await getLowStockItems();
  return items.length;
}

// ============================================================
// Integration Functions
// ============================================================

export interface StockTransactionWithItem extends StockTransaction {
  stock_items?: Pick<StockItem, 'id' | 'name' | 'brand' | 'sku'> | null;
  performed_by_profile?: { full_name: string | null } | null;
}

export async function getStockUsageByCase(caseId: string): Promise<StockTransactionWithItem[]> {
  const { data, error } = await supabase
    .from('stock_transactions')
    .select('*, stock_items(id, name, brand, sku)')
    .eq('case_id', caseId)
    .eq('transaction_type', 'used')
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as StockTransactionWithItem[];
}

export async function getRecommendedDevices(dataSizeGB: number): Promise<StockItemWithCategory[]> {
  const items = await getSaleableItems();
  if (dataSizeGB <= 0) return items.slice(0, 6);

  const scored = items.map((item) => {
    const capacityStr = (item.capacity ?? '').toLowerCase();
    let capacityGB = 0;
    if (capacityStr.includes('tb')) {
      capacityGB = parseFloat(capacityStr) * 1024;
    } else if (capacityStr.includes('gb')) {
      capacityGB = parseFloat(capacityStr);
    }
    const overhead = dataSizeGB * 1.2;
    const fits = capacityGB > 0 && capacityGB >= overhead;
    const diff = capacityGB > 0 ? Math.abs(capacityGB - overhead * 1.5) : Infinity;
    return { item, fits, diff };
  });

  const fitting = scored.filter((s) => s.fits).sort((a, b) => a.diff - b.diff);
  if (fitting.length > 0) return fitting.slice(0, 6).map((s) => s.item);
  return items.slice(0, 6);
}

export interface StockSaleItemWithWarranty extends StockSaleItem {
  stock_items?: Pick<StockItem, 'id' | 'name' | 'brand' | 'model'> | null;
  daysRemaining?: number;
}

export async function getCustomerWarranties(customerId: string): Promise<StockSaleItemWithWarranty[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('stock_sale_items')
    .select(`
      *,
      stock_items(id, name, brand, model),
      stock_sales!inner(customer_id)
    `)
    .is('deleted_at', null)
    .gte('warranty_end_date', today);
  if (error) throw error;

  const items = (data ?? []) as unknown as Array<StockSaleItemWithWarranty & { stock_sales?: { customer_id: string } }>;
  const filtered = items.filter((i) => i.stock_sales?.customer_id === customerId);

  return filtered.map((item) => {
    const end = item.warranty_end_date ? new Date(item.warranty_end_date) : null;
    const daysRemaining = end ? Math.ceil((end.getTime() - Date.now()) / 86400000) : undefined;
    return { ...item, daysRemaining };
  });
}

export async function getCustomerSerialNumbers(customerId: string): Promise<StockSerialNumber[]> {
  const { data, error } = await supabase
    .from('stock_serial_numbers')
    .select('*, stock_items(id, name, brand, model)')
    .eq('sold_to_customer_id', customerId)
    .is('deleted_at', null)
    .order('sold_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as StockSerialNumber[];
}

export interface TodaysSalesSummary {
  count: number;
  revenue: number;
  sales: StockSaleWithDetails[];
}

export async function getTodaysSales(): Promise<TodaysSalesSummary> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('stock_sales')
    .select('*, customers_enhanced(id, customer_name), stock_sale_items(*, stock_items(id, name, brand, sku))')
    .is('deleted_at', null)
    .gte('sale_date', today)
    .order('sale_date', { ascending: false });
  if (error) throw error;
  const sales = (data ?? []) as unknown as StockSaleWithDetails[];
  const revenue = sales.reduce((sum, s) => sum + (s.total_amount ?? 0), 0);
  return { count: sales.length, revenue, sales };
}

export interface StockValuationSummary {
  totalValue: number;
  internalValue: number;
  saleableValue: number;
  itemCount: number;
}

export async function getStockValuationSummary(): Promise<StockValuationSummary> {
  const { data, error } = await supabase
    .from('stock_items')
    .select('item_type, current_quantity, cost_price')
    .is('deleted_at', null)
    .eq('is_active', true);
  if (error) throw error;

  const items = data ?? [];
  let totalValue = 0;
  let internalValue = 0;
  let saleableValue = 0;

  for (const item of items) {
    const val = item.current_quantity * (item.cost_price ?? 0);
    totalValue += val;
    if (item.item_type === 'internal') internalValue += val;
    else if (item.item_type === 'saleable') saleableValue += val;
    else {
      internalValue += val / 2;
      saleableValue += val / 2;
    }
  }

  return { totalValue, internalValue, saleableValue, itemCount: items.length };
}

export interface ReceiveStockFromPOData {
  purchaseOrderId: string;
  items: Array<{
    poItemId: string;
    stockItemId: string;
    quantity: number;
    unitCost: number;
    serialNumbers?: string[];
  }>;
  receivedBy: string;
}

export async function receiveStockFromPO(data: ReceiveStockFromPOData): Promise<void> {
  for (const item of data.items) {
    if (item.quantity <= 0) continue;
    await recordStockReceipt(item.stockItemId, item.quantity, {
      poId: data.purchaseOrderId,
      cost: item.unitCost,
      serialNumbers: item.serialNumbers,
    });

    await supabase
      .from('purchase_order_items')
      .update({
        stock_item_id: item.stockItemId,
        received_quantity: item.quantity,
        received_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', item.poItemId);
  }
}

export async function getPortalCustomerPurchases(customerId: string): Promise<{
  sales: StockSaleWithDetails[];
  warranties: StockSaleItemWithWarranty[];
}> {
  const [sales, warranties] = await Promise.all([
    getSalesByCustomer(customerId),
    getCustomerWarranties(customerId),
  ]);
  return { sales, warranties };
}

// ============================================================
// Stock Returns
// ============================================================

export interface StockReturn {
  id: string;
  return_number: string;
  return_date: string | null;
  sale_id: string;
  customer_id: string;
  reason: string;
  status: string;
  refund_amount: number | null;
  refund_method: string | null;
  restock_items: boolean | null;
  notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface StockReturnItem {
  id: string;
  return_id: string;
  sale_item_id: string;
  stock_item_id: string;
  quantity: number;
  serial_number: string | null;
  condition: string;
  restock: boolean;
  refund_amount: number | null;
  notes: string | null;
  created_at: string | null;
}

export interface StockReturnWithDetails extends StockReturn {
  customers_enhanced?: { id: string; customer_name: string | null; email: string | null } | null;
  stock_sales?: { id: string; sale_number: string | null } | null;
  stock_return_items?: Array<StockReturnItem & {
    stock_items?: Pick<StockItem, 'id' | 'name' | 'brand' | 'sku'> | null;
  }>;
}

export interface CreateStockReturnInput {
  sale_id: string;
  customer_id: string;
  reason: string;
  refund_method?: string | null;
  restock_items?: boolean;
  notes?: string | null;
  items: Array<{
    sale_item_id: string;
    stock_item_id: string;
    quantity: number;
    serial_number?: string | null;
    condition?: string;
    restock?: boolean;
    refund_amount?: number | null;
    notes?: string | null;
  }>;
}

export interface StockReturnFilters {
  status?: string;
  customer_id?: string;
  sale_id?: string;
  startDate?: string;
  endDate?: string;
}

export async function getStockReturns(filters?: StockReturnFilters): Promise<StockReturnWithDetails[]> {
  let query = supabase
    .from('stock_returns')
    .select(`
      *,
      customers_enhanced(id, customer_name, email),
      stock_sales(id, sale_number),
      stock_return_items(*, stock_items(id, name, brand, sku))
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id);
  if (filters?.sale_id) query = query.eq('sale_id', filters.sale_id);
  if (filters?.startDate) query = query.gte('return_date', filters.startDate);
  if (filters?.endDate) query = query.lte('return_date', filters.endDate);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as StockReturnWithDetails[];
}

export async function getStockReturn(id: string): Promise<StockReturnWithDetails | null> {
  const { data, error } = await supabase
    .from('stock_returns')
    .select(`
      *,
      customers_enhanced(id, customer_name, email),
      stock_sales(id, sale_number),
      stock_return_items(*, stock_items(id, name, brand, sku))
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as StockReturnWithDetails | null;
}

export async function createStockReturn(data: CreateStockReturnInput): Promise<StockReturn> {
  const numberResult = await supabase.rpc('get_next_number', { p_scope: 'SRET' });
  const returnNumber = numberResult.data ?? `SRET-${Date.now()}`;

  const totalRefund = data.items.reduce((sum, item) => sum + (item.refund_amount ?? 0), 0);

  const { data: returnRecord, error: returnError } = await supabase
    .from('stock_returns')
    .insert({
      return_number: returnNumber,
      sale_id: data.sale_id,
      customer_id: data.customer_id,
      reason: data.reason,
      status: 'pending',
      refund_amount: totalRefund > 0 ? totalRefund : null,
      refund_method: data.refund_method ?? null,
      restock_items: data.restock_items ?? true,
      notes: data.notes ?? null,
    })
    .select()
    .maybeSingle();
  if (returnError) throw returnError;

  if (data.items.length > 0) {
    const itemInserts = data.items.map((item) => ({
      return_id: returnRecord.id,
      sale_item_id: item.sale_item_id,
      stock_item_id: item.stock_item_id,
      quantity: item.quantity,
      serial_number: item.serial_number ?? null,
      condition: item.condition ?? 'good',
      restock: item.restock ?? true,
      refund_amount: item.refund_amount ?? null,
      notes: item.notes ?? null,
    }));
    const { error: itemsError } = await supabase.from('stock_return_items').insert(itemInserts);
    if (itemsError) throw itemsError;
  }

  return returnRecord as unknown as StockReturn;
}

export async function processStockReturn(
  id: string,
  action: 'approve' | 'reject',
  processedBy: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('stock_returns')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      processed_by: processedBy,
      processed_at: new Date().toISOString(),
      notes: notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function completeStockReturn(id: string): Promise<void> {
  const returnRecord = await getStockReturn(id);
  if (!returnRecord) throw new Error('Return not found');
  if (returnRecord.status !== 'approved') throw new Error('Return must be approved before completing');

  const items = returnRecord.stock_return_items ?? [];

  for (const item of items) {
    if (!item.restock) continue;

    const stockItem = await getStockItem(item.stock_item_id);
    if (!stockItem) continue;

    const newQty = stockItem.current_quantity + item.quantity;
    await supabase
      .from('stock_items')
      .update({ current_quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', item.stock_item_id);

    await supabase.from('stock_transactions').insert({
      stock_item_id: item.stock_item_id,
      transaction_type: 'returned',
      quantity: item.quantity,
      previous_quantity: stockItem.current_quantity,
      new_quantity: newQty,
      sale_id: returnRecord.sale_id,
      notes: `Return #${returnRecord.return_number}`,
      transaction_date: new Date().toISOString(),
    });

    if (item.serial_number) {
      await supabase
        .from('stock_serial_numbers')
        .update({ status: 'in_stock', sale_id: null, sold_to_customer_id: null, sold_date: null })
        .eq('stock_item_id', item.stock_item_id)
        .eq('serial_number', item.serial_number);
    }
  }

  await supabase
    .from('stock_returns')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id);
}

// ============================================================
// Stock Reservations
// ============================================================

export interface StockReservation {
  id: string;
  stock_item_id: string;
  quantity: number;
  reservation_type: string;
  reference_id: string | null;
  reference_type: string | null;
  status: string;
  expires_at: string | null;
  notes: string | null;
  reserved_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface StockReservationWithItem extends StockReservation {
  stock_items?: Pick<StockItem, 'id' | 'name' | 'brand' | 'sku'> | null;
}

export interface CreateReservationInput {
  stock_item_id: string;
  quantity: number;
  reservation_type: 'quote' | 'case' | 'manual';
  reference_id?: string | null;
  reference_type?: 'quote' | 'case' | null;
  expires_at?: string | null;
  notes?: string | null;
  reserved_by?: string | null;
}

export async function createReservation(data: CreateReservationInput): Promise<StockReservation> {
  const item = await getStockItem(data.stock_item_id);
  if (!item) throw new Error('Stock item not found');

  const available = item.current_quantity - item.reserved_quantity;
  if (available < data.quantity) throw new Error('Insufficient stock available to reserve');

  const { error: updateError } = await supabase
    .from('stock_items')
    .update({ reserved_quantity: item.reserved_quantity + data.quantity })
    .eq('id', data.stock_item_id);
  if (updateError) throw updateError;

  const { data: reservation, error } = await supabase
    .from('stock_reservations')
    .insert({
      stock_item_id: data.stock_item_id,
      quantity: data.quantity,
      reservation_type: data.reservation_type,
      reference_id: data.reference_id ?? null,
      reference_type: data.reference_type ?? null,
      status: 'active',
      expires_at: data.expires_at ?? null,
      notes: data.notes ?? null,
      reserved_by: data.reserved_by ?? null,
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  return reservation as unknown as StockReservation;
}

export async function releaseReservation(id: string): Promise<void> {
  const { data: reservation, error: fetchError } = await supabase
    .from('stock_reservations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!reservation) throw new Error('Reservation not found');

  const item = await getStockItem(reservation.stock_item_id);
  if (item) {
    const newReserved = Math.max(0, item.reserved_quantity - reservation.quantity);
    await supabase
      .from('stock_items')
      .update({ reserved_quantity: newReserved })
      .eq('id', reservation.stock_item_id);
  }

  const { error } = await supabase
    .from('stock_reservations')
    .update({ status: 'released', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function fulfillReservation(id: string, saleId: string): Promise<void> {
  const { data: reservation, error: fetchError } = await supabase
    .from('stock_reservations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!reservation) throw new Error('Reservation not found');

  const item = await getStockItem(reservation.stock_item_id);
  if (item) {
    const newReserved = Math.max(0, item.reserved_quantity - reservation.quantity);
    await supabase
      .from('stock_items')
      .update({ reserved_quantity: newReserved })
      .eq('id', reservation.stock_item_id);
  }

  const { error } = await supabase
    .from('stock_reservations')
    .update({
      status: 'fulfilled',
      reference_id: saleId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function getReservationsForItem(stockItemId: string): Promise<StockReservation[]> {
  const { data, error } = await supabase
    .from('stock_reservations')
    .select('*')
    .eq('stock_item_id', stockItemId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as StockReservation[];
}

export async function getReservationsForQuote(quoteId: string): Promise<StockReservationWithItem[]> {
  const { data, error } = await supabase
    .from('stock_reservations')
    .select('*, stock_items(id, name, brand, sku)')
    .eq('reference_type', 'quote')
    .eq('reference_id', quoteId)
    .eq('status', 'active')
    .is('deleted_at', null);
  if (error) throw error;
  return (data ?? []) as unknown as StockReservationWithItem[];
}

export async function getAvailableQuantity(stockItemId: string): Promise<number> {
  const item = await getStockItem(stockItemId);
  if (!item) return 0;
  return Math.max(0, item.current_quantity - item.reserved_quantity);
}

export async function expireOldReservations(): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('stock_reservations')
    .select('id, stock_item_id, quantity')
    .eq('status', 'active')
    .lt('expires_at', now)
    .is('deleted_at', null);
  if (error) throw error;

  const reservations = data ?? [];
  for (const r of reservations) {
    await releaseReservation(r.id);
    await supabase
      .from('stock_reservations')
      .update({ status: 'expired', updated_at: now })
      .eq('id', r.id);
  }
  return reservations.length;
}

// ============================================================
// Barcode Lookup
// ============================================================

export async function getStockItemByBarcode(barcode: string): Promise<StockItemWithCategory | null> {
  const { data, error } = await supabase
    .from('stock_items')
    .select('*, stock_categories(*)')
    .eq('barcode', barcode)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as StockItemWithCategory | null;
}

export async function getSerialNumberByBarcode(barcode: string): Promise<StockSerialNumber | null> {
  const { data, error } = await supabase
    .from('stock_serial_numbers')
    .select('*')
    .eq('serial_number', barcode)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as StockSerialNumber | null;
}

// ============================================================
// Stock Alerts
// ============================================================

export interface StockAlert {
  id: string;
  alert_type: string;
  stock_item_id: string | null;
  serial_number_id: string | null;
  customer_id: string | null;
  message: string;
  severity: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string | null;
  expires_at: string | null;
}

export interface StockAlertWithItem extends StockAlert {
  stock_items?: Pick<StockItem, 'id' | 'name' | 'brand' | 'sku' | 'current_quantity' | 'minimum_quantity'> | null;
}

export async function getStockAlerts(filters?: { type?: string; isRead?: boolean }): Promise<StockAlertWithItem[]> {
  let query = supabase
    .from('stock_alerts')
    .select('*, stock_items(id, name, brand, sku, current_quantity, minimum_quantity)')
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false });

  if (filters?.type) query = query.eq('alert_type', filters.type);
  if (filters?.isRead !== undefined) query = query.eq('is_read', filters.isRead);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as StockAlertWithItem[];
}

export async function markAlertRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('stock_alerts')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function dismissAlert(id: string): Promise<void> {
  const { error } = await supabase
    .from('stock_alerts')
    .update({ is_dismissed: true })
    .eq('id', id);
  if (error) throw error;
}

export async function generateLowStockAlerts(): Promise<number> {
  const lowItems = await getLowStockItems();
  let count = 0;

  for (const item of lowItems) {
    const isOut = item.current_quantity === 0;
    const alertType = isOut ? 'out_of_stock' : 'low_stock';
    const severity = isOut ? 'critical' : 'warning';
    const message = isOut
      ? `${item.name} is out of stock`
      : `${item.name} is low on stock (${item.current_quantity} remaining, minimum: ${item.minimum_quantity})`;

    const { data: existing } = await supabase
      .from('stock_alerts')
      .select('id')
      .eq('stock_item_id', item.id)
      .eq('alert_type', alertType)
      .eq('is_dismissed', false)
      .maybeSingle();

    if (!existing) {
      await supabase.from('stock_alerts').insert({
        alert_type: alertType,
        stock_item_id: item.id,
        message,
        severity,
        is_read: false,
        is_dismissed: false,
      });
      count++;
    }
  }
  return count;
}

export async function generateWarrantyExpiryAlerts(daysAhead = 30): Promise<number> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const today = new Date().toISOString().split('T')[0];
  const future = futureDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('stock_serial_numbers')
    .select('id, stock_item_id, serial_number, warranty_end_date, stock_items(id, name, brand)')
    .is('deleted_at', null)
    .eq('status', 'sold')
    .gte('warranty_end_date', today)
    .lte('warranty_end_date', future);

  if (error) throw error;
  const items = (data ?? []) as unknown as Array<{
    id: string;
    stock_item_id: string;
    serial_number: string;
    warranty_end_date: string;
    stock_items?: { id: string; name: string; brand: string | null } | null;
  }>;

  let count = 0;
  for (const serial of items) {
    const daysLeft = Math.ceil(
      (new Date(serial.warranty_end_date).getTime() - Date.now()) / 86400000
    );
    const { data: existing } = await supabase
      .from('stock_alerts')
      .select('id')
      .eq('serial_number_id', serial.id)
      .eq('alert_type', 'warranty_expiring')
      .eq('is_dismissed', false)
      .maybeSingle();

    if (!existing) {
      await supabase.from('stock_alerts').insert({
        alert_type: 'warranty_expiring',
        stock_item_id: serial.stock_item_id,
        serial_number_id: serial.id,
        message: `Warranty for ${serial.stock_items?.name ?? 'item'} (S/N: ${serial.serial_number}) expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        severity: daysLeft <= 7 ? 'critical' : 'warning',
        is_read: false,
        is_dismissed: false,
      });
      count++;
    }
  }
  return count;
}

export async function getUnreadAlertCount(): Promise<number> {
  const { count, error } = await supabase
    .from('stock_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
    .eq('is_dismissed', false);
  if (error) return 0;
  return count ?? 0;
}

// ============================================================
// Stock Locations
// ============================================================

export interface StockLocation {
  id: string;
  name: string;
  code: string;
  description: string | null;
  address: string | null;
  is_active: boolean | null;
  is_default: boolean | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface StockItemLocation {
  id: string;
  stock_item_id: string;
  location_id: string;
  quantity: number;
  bin_number: string | null;
  created_at: string | null;
  updated_at: string | null;
  stock_locations?: StockLocation | null;
}

export interface StockTransfer {
  id: string;
  transfer_number: string;
  from_location_id: string;
  to_location_id: string;
  status: string;
  transfer_date: string | null;
  notes: string | null;
  created_by: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface StockTransferItem {
  id: string;
  transfer_id: string;
  stock_item_id: string;
  quantity: number;
  serial_numbers: string[] | null;
  notes: string | null;
  created_at: string | null;
  stock_items?: Pick<StockItem, 'id' | 'name' | 'brand' | 'sku'> | null;
}

export interface StockTransferWithDetails extends StockTransfer {
  from_location?: StockLocation | null;
  to_location?: StockLocation | null;
  stock_transfer_items?: StockTransferItem[];
}

export interface CreateTransferInput {
  from_location_id: string;
  to_location_id: string;
  notes?: string | null;
  created_by?: string | null;
  items: Array<{
    stock_item_id: string;
    quantity: number;
    serial_numbers?: string[];
    notes?: string | null;
  }>;
}

export async function getStockLocations(): Promise<StockLocation[]> {
  const { data, error } = await supabase
    .from('stock_locations')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as StockLocation[];
}

export async function createStockLocation(data: Omit<StockLocation, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<StockLocation> {
  const { data: result, error } = await supabase
    .from('stock_locations')
    .insert(data)
    .select()
    .maybeSingle();
  if (error) throw error;
  return result as unknown as StockLocation;
}

export async function updateStockLocation(id: string, data: Partial<StockLocation>): Promise<StockLocation> {
  const { data: result, error } = await supabase
    .from('stock_locations')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return result as unknown as StockLocation;
}

export async function getItemLocations(stockItemId: string): Promise<StockItemLocation[]> {
  const { data, error } = await supabase
    .from('stock_item_locations')
    .select('*, stock_locations(*)')
    .eq('stock_item_id', stockItemId)
    .order('quantity', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as StockItemLocation[];
}

export async function getStockTransfers(filters?: { status?: string; location_id?: string }): Promise<StockTransferWithDetails[]> {
  let query = supabase
    .from('stock_transfers')
    .select(`
      *,
      from_location:stock_locations!from_location_id(*),
      to_location:stock_locations!to_location_id(*),
      stock_transfer_items(*, stock_items(id, name, brand, sku))
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.location_id) {
    if (isValidUuid(filters.location_id)) {
      query = query.or(`from_location_id.eq.${filters.location_id},to_location_id.eq.${filters.location_id}`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as StockTransferWithDetails[];
}

export async function getStockTransfer(id: string): Promise<StockTransferWithDetails | null> {
  const { data, error } = await supabase
    .from('stock_transfers')
    .select(`
      *,
      from_location:stock_locations!from_location_id(*),
      to_location:stock_locations!to_location_id(*),
      stock_transfer_items(*, stock_items(id, name, brand, sku))
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as StockTransferWithDetails | null;
}

export async function createStockTransfer(data: CreateTransferInput): Promise<StockTransfer> {
  const numberResult = await supabase.rpc('get_next_number', { p_scope: 'STFR' });
  const transferNumber = numberResult.data ?? `STFR-${Date.now()}`;

  const { data: transfer, error: transferError } = await supabase
    .from('stock_transfers')
    .insert({
      transfer_number: transferNumber,
      from_location_id: data.from_location_id,
      to_location_id: data.to_location_id,
      status: 'draft',
      notes: data.notes ?? null,
      created_by: data.created_by ?? null,
    })
    .select()
    .maybeSingle();
  if (transferError) throw transferError;

  if (data.items.length > 0) {
    const itemInserts = data.items.map((item) => ({
      transfer_id: transfer.id,
      stock_item_id: item.stock_item_id,
      quantity: item.quantity,
      serial_numbers: item.serial_numbers ?? null,
      notes: item.notes ?? null,
    }));
    const { error: itemsError } = await supabase.from('stock_transfer_items').insert(itemInserts);
    if (itemsError) throw itemsError;
  }

  return transfer as unknown as StockTransfer;
}

export async function completeStockTransfer(id: string, completedBy: string): Promise<void> {
  const transfer = await getStockTransfer(id);
  if (!transfer) throw new Error('Transfer not found');

  const items = transfer.stock_transfer_items ?? [];

  for (const item of items) {
    const { data: fromLoc } = await supabase
      .from('stock_item_locations')
      .select('*')
      .eq('stock_item_id', item.stock_item_id)
      .eq('location_id', transfer.from_location_id)
      .maybeSingle();

    if (fromLoc) {
      const newFromQty = Math.max(0, (fromLoc.quantity as number) - item.quantity);
      await supabase
        .from('stock_item_locations')
        .update({ quantity: newFromQty, updated_at: new Date().toISOString() })
        .eq('id', fromLoc.id);
    }

    const { data: toLoc } = await supabase
      .from('stock_item_locations')
      .select('*')
      .eq('stock_item_id', item.stock_item_id)
      .eq('location_id', transfer.to_location_id)
      .maybeSingle();

    if (toLoc) {
      await supabase
        .from('stock_item_locations')
        .update({
          quantity: (toLoc.quantity as number) + item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', toLoc.id);
    } else {
      await supabase.from('stock_item_locations').insert({
        stock_item_id: item.stock_item_id,
        location_id: transfer.to_location_id,
        quantity: item.quantity,
      });
    }
  }

  await supabase
    .from('stock_transfers')
    .update({
      status: 'completed',
      completed_by: completedBy,
      completed_at: new Date().toISOString(),
      transfer_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

export async function cancelStockTransfer(id: string): Promise<void> {
  const { error } = await supabase
    .from('stock_transfers')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// Bulk Operations
// ============================================================

export async function bulkUpdatePrices(
  updates: Array<{ id: string; costPrice?: number; sellingPrice?: number }>
): Promise<number> {
  let count = 0;
  for (const update of updates) {
    const data: StockItemUpdate = { updated_at: new Date().toISOString() };
    if (update.costPrice !== undefined) data.cost_price = update.costPrice;
    if (update.sellingPrice !== undefined) data.selling_price = update.sellingPrice;
    await updateStockItem(update.id, data);
    count++;
  }
  return count;
}

export async function bulkAdjustQuantities(
  adjustments: Array<{ id: string; newQuantity: number; reason: string }>
): Promise<number> {
  let count = 0;
  for (const adj of adjustments) {
    const item = await getStockItem(adj.id);
    if (!item) continue;

    const variance = adj.newQuantity - item.current_quantity;
    await supabase
      .from('stock_items')
      .update({ current_quantity: adj.newQuantity, updated_at: new Date().toISOString() })
      .eq('id', adj.id);

    if (variance !== 0) {
      await supabase.from('stock_transactions').insert({
        stock_item_id: adj.id,
        transaction_type: 'adjusted',
        quantity: variance,
        previous_quantity: item.current_quantity,
        new_quantity: adj.newQuantity,
        notes: adj.reason,
        transaction_date: new Date().toISOString(),
      });
    }
    count++;
  }
  return count;
}

export function exportStockItemsCSV(items: StockItemWithCategory[]): string {
  const headers = ['SKU', 'Name', 'Brand', 'Model', 'Category', 'Type', 'Barcode', 'Cost Price', 'Selling Price', 'Current Qty', 'Reserved Qty', 'Min Qty', 'Capacity', 'Warranty Months'];
  const rows = items.map((item) => [
    item.sku ?? '',
    item.name,
    item.brand ?? '',
    item.model ?? '',
    item.stock_categories?.name ?? '',
    item.item_type ?? '',
    item.barcode ?? '',
    String(item.cost_price ?? 0),
    String(item.selling_price ?? 0),
    String(item.current_quantity),
    String(item.reserved_quantity),
    String(item.minimum_quantity),
    item.capacity ?? '',
    String(item.warranty_months ?? 0),
  ]);
  return [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
}

// ============================================================
// Stock Valuation Methods (Cost Layers for FIFO/LIFO)
// ============================================================

export interface StockCostLayer {
  id: string;
  stock_item_id: string;
  quantity: number;
  unit_cost: number;
  remaining_quantity: number;
  purchase_order_id: string | null;
  received_at: string | null;
  created_at: string | null;
}

export async function addCostLayer(
  stockItemId: string,
  quantity: number,
  unitCost: number,
  poId?: string
): Promise<void> {
  const { error } = await supabase.from('stock_cost_layers').insert({
    stock_item_id: stockItemId,
    quantity,
    unit_cost: unitCost,
    remaining_quantity: quantity,
    purchase_order_id: poId ?? null,
    received_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function calculateItemCost(
  stockItemId: string,
  quantity: number,
  method: 'fifo' | 'lifo' | 'average' = 'average'
): Promise<number> {
  if (method === 'average') {
    const item = await getStockItem(stockItemId);
    if (!item || !item.cost_price) return 0;
    return item.cost_price * quantity;
  }

  const { data, error } = await supabase
    .from('stock_cost_layers')
    .select('*')
    .eq('stock_item_id', stockItemId)
    .gt('remaining_quantity', 0)
    .order('received_at', { ascending: method === 'fifo' });
  if (error) throw error;

  const layers = (data ?? []) as StockCostLayer[];
  let remaining = quantity;
  let totalCost = 0;

  for (const layer of layers) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, layer.remaining_quantity);
    totalCost += take * layer.unit_cost;
    remaining -= take;
  }

  return totalCost;
}
