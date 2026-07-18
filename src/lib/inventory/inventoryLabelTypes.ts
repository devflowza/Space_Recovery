/**
 * Minimal shape needed by inventoryLabelPrint — covers both the full
 * getInventoryItemById result and the list-page row shape.
 */
export interface InventoryItemWithDetails {
  id: string;
  item_number?: string | null;
  name?: string | null;
  model?: string | null;
  barcode?: string | null;
  qr_value?: string | null;
  created_at?: string | null;
  brand?: { name: string } | null;
  device_type?: { name: string } | null;
  capacity?: { name: string } | null;
  storage_location?: { name: string } | null;
}
