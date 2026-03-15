import { supabase } from './supabaseClient';
import type { Database } from '../types/database.types';

type SupplierDocument = Database['public']['Tables']['supplier_documents']['Row'];
type SupplierDocumentInsert = Database['public']['Tables']['supplier_documents']['Insert'];

export async function fetchSupplierDocuments(supplierId: string) {
  const { data, error } = await supabase
    .from('supplier_documents')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data as SupplierDocument[];
}

export async function uploadSupplierDocument(
  supplierId: string,
  file: File,
  metadata: {
    title: string;
    category?: string;
    description?: string;
  },
  userId: string
) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${supplierId}/${Date.now()}.${fileExt}`;
  const filePath = `supplier-documents/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('supplier_documents')
    .insert({
      supplier_id: supplierId,
      title: metadata.title,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      category: metadata.category || null,
      description: metadata.description || null,
      uploaded_by: userId,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as SupplierDocument;
}

export async function downloadSupplierDocument(filePath: string) {
  const { data, error } = await supabase.storage
    .from('documents')
    .download(filePath);

  if (error) throw error;
  return data;
}

export async function deleteSupplierDocument(id: string, filePath: string) {
  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([filePath]);

  if (storageError) throw storageError;

  const { error } = await supabase
    .from('supplier_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
