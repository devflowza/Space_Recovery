import { supabase } from './supabaseClient';

export interface InventoryCaseAssignment {
  id: string;
  inventory_item_id: string;
  case_id: string;
  assigned_at: string;
  assigned_by: string | null;
  unassigned_at: string | null;
  unassigned_by: string | null;
  is_active: boolean;
  usage_result: 'working' | 'defective' | 'partially_working' | 'pending' | null;
  usage_notes: string | null;
  defect_reason: string | null;
  parts_used: Record<string, boolean> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentWithDetails extends InventoryCaseAssignment {
  inventory_item?: {
    id: string;
    name: string;
    inventory_code: string;
    model: string;
    serial_number: string;
    brand?: { name: string };
  };
  case?: {
    id: string;
    case_no: string;
    title: string;
    status: string;
  };
  assigned_by_profile?: {
    id: string;
    full_name: string;
  };
  unassigned_by_profile?: {
    id: string;
    full_name: string;
  };
}

export interface CaseOption {
  id: string;
  case_no: string;
  title: string;
  status: string;
  priority: string;
  customer_name?: string;
}

export async function getCasesForAssignment(): Promise<CaseOption[]> {
  // First get the status IDs for cases that are in active states
  const { data: statusData, error: statusError } = await supabase
    .from('case_statuses')
    .select('name')
    .in('type', ['received', 'diagnosis', 'waiting-approval', 'in-progress'])
    .eq('is_active', true);

  if (statusError) {
    console.error('Error fetching active case statuses:', statusError);
    throw statusError;
  }

  const activeStatusNames = (statusData || []).map(s => s.name);

  const { data, error } = await supabase
    .from('cases')
    .select(`
      id,
      case_no,
      title,
      status,
      priority,
      customers_enhanced:customer_id (
        customer_name
      )
    `)
    .in('status', activeStatusNames)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching cases for assignment:', error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    case_no: item.case_no,
    title: item.title || 'Untitled Case',
    status: item.status,
    priority: item.priority,
    customer_name: item.customers_enhanced?.customer_name || undefined,
  }));
}

export async function checkItemAvailability(itemId: string): Promise<{
  available: boolean;
  reason?: string;
  currentAssignment?: AssignmentWithDetails;
}> {
  const { data: activeAssignment, error: assignmentError } = await supabase
    .from('inventory_case_assignments')
    .select(`
      *,
      case:cases (id, case_no, title, status)
    `)
    .eq('inventory_item_id', itemId)
    .eq('is_active', true)
    .maybeSingle();

  if (assignmentError) {
    console.error('Error checking item availability:', assignmentError);
    throw assignmentError;
  }

  if (activeAssignment) {
    return {
      available: false,
      reason: `This item is currently assigned to case ${activeAssignment.case?.case_no}`,
      currentAssignment: activeAssignment as AssignmentWithDetails,
    };
  }

  const { data: item, error: itemError } = await supabase
    .from('inventory_items')
    .select('quantity_available, status_type:inventory_status_types(name)')
    .eq('id', itemId)
    .single();

  if (itemError) {
    console.error('Error fetching item details:', itemError);
    throw itemError;
  }

  if (item.quantity_available <= 0) {
    return {
      available: false,
      reason: 'No available quantity in stock',
    };
  }

  return { available: true };
}

export async function assignInventoryToCase(
  inventoryItemId: string,
  caseId: string,
  notes?: string
): Promise<AssignmentWithDetails> {
  const availability = await checkItemAvailability(inventoryItemId);

  if (!availability.available) {
    throw new Error(availability.reason || 'Item is not available for assignment');
  }

  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('inventory_case_assignments')
    .insert({
      inventory_item_id: inventoryItemId,
      case_id: caseId,
      assigned_by: user?.user?.id,
      usage_result: 'pending',
      notes: notes || null,
      is_active: true,
    })
    .select(`
      *,
      inventory_item:inventory_items (
        id, name, inventory_code, model, serial_number,
        brand:brands (name)
      ),
      case:cases (id, case_no, title, status),
      assigned_by_profile:profiles!inventory_case_assignments_assigned_by_fkey (id, full_name)
    `)
    .single();

  if (error) {
    console.error('Error assigning inventory to case:', error);
    throw error;
  }

  return data as AssignmentWithDetails;
}

export async function markAssignmentAsDefective(
  assignmentId: string,
  defectReason: string,
  usageNotes?: string
): Promise<AssignmentWithDetails> {
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('inventory_case_assignments')
    .update({
      is_active: false,
      usage_result: 'defective',
      defect_reason: defectReason,
      usage_notes: usageNotes || null,
      unassigned_at: new Date().toISOString(),
      unassigned_by: user?.user?.id,
    })
    .eq('id', assignmentId)
    .select(`
      *,
      inventory_item:inventory_items (
        id, name, inventory_code, model, serial_number,
        brand:brands (name)
      ),
      case:cases (id, case_no, title, status),
      assigned_by_profile:profiles!inventory_case_assignments_assigned_by_fkey (id, full_name),
      unassigned_by_profile:profiles!inventory_case_assignments_unassigned_by_fkey (id, full_name)
    `)
    .single();

  if (error) {
    console.error('Error marking assignment as defective:', error);
    throw error;
  }

  return data as AssignmentWithDetails;
}

export async function markAssignmentAsWorking(
  assignmentId: string,
  usageNotes?: string
): Promise<AssignmentWithDetails> {
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('inventory_case_assignments')
    .update({
      is_active: false,
      usage_result: 'working',
      usage_notes: usageNotes || null,
      unassigned_at: new Date().toISOString(),
      unassigned_by: user?.user?.id,
    })
    .eq('id', assignmentId)
    .select(`
      *,
      inventory_item:inventory_items (
        id, name, inventory_code, model, serial_number,
        brand:brands (name)
      ),
      case:cases (id, case_no, title, status),
      assigned_by_profile:profiles!inventory_case_assignments_assigned_by_fkey (id, full_name),
      unassigned_by_profile:profiles!inventory_case_assignments_unassigned_by_fkey (id, full_name)
    `)
    .single();

  if (error) {
    console.error('Error marking assignment as working:', error);
    throw error;
  }

  return data as AssignmentWithDetails;
}

export async function getInventoryItemAssignments(
  inventoryItemId: string
): Promise<AssignmentWithDetails[]> {
  const { data, error } = await supabase
    .from('inventory_case_assignments')
    .select(`
      *,
      case:cases (id, case_no, title, status),
      assigned_by_profile:profiles!inventory_case_assignments_assigned_by_fkey (id, full_name),
      unassigned_by_profile:profiles!inventory_case_assignments_unassigned_by_fkey (id, full_name)
    `)
    .eq('inventory_item_id', inventoryItemId)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Error fetching inventory item assignments:', error);
    throw error;
  }

  return (data || []) as AssignmentWithDetails[];
}

export async function getCaseAssignments(caseId: string): Promise<AssignmentWithDetails[]> {
  const { data, error } = await supabase
    .from('inventory_case_assignments')
    .select(`
      *,
      inventory_item:inventory_items (
        id, name, inventory_code, model, serial_number,
        brand:brands (name),
        capacity:capacities (name),
        status_type:inventory_status_types (name, color_code)
      ),
      assigned_by_profile:profiles!inventory_case_assignments_assigned_by_fkey (id, full_name),
      unassigned_by_profile:profiles!inventory_case_assignments_unassigned_by_fkey (id, full_name)
    `)
    .eq('case_id', caseId)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Error fetching case assignments:', error);
    throw error;
  }

  return (data || []) as AssignmentWithDetails[];
}

export async function getActiveAssignment(
  inventoryItemId: string
): Promise<AssignmentWithDetails | null> {
  const { data, error } = await supabase
    .from('inventory_case_assignments')
    .select(`
      *,
      inventory_item:inventory_items (
        id, name, inventory_code, model, serial_number,
        brand:brands (name)
      ),
      case:cases (id, case_no, title, status, priority),
      assigned_by_profile:profiles!inventory_case_assignments_assigned_by_fkey (id, full_name)
    `)
    .eq('inventory_item_id', inventoryItemId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active assignment:', error);
    throw error;
  }

  return data as AssignmentWithDetails | null;
}

export async function unassignInventoryItem(
  assignmentId: string,
  notes?: string
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('inventory_case_assignments')
    .update({
      is_active: false,
      unassigned_at: new Date().toISOString(),
      unassigned_by: user?.user?.id,
      usage_notes: notes || null,
    })
    .eq('id', assignmentId);

  if (error) {
    console.error('Error unassigning inventory item:', error);
    throw error;
  }
}
