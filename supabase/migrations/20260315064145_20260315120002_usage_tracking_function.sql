/*
  # Usage Tracking Function
  
  Creates a database function to calculate tenant storage usage
  from case attachments and other uploaded files.
*/

CREATE OR REPLACE FUNCTION get_tenant_storage_bytes(p_tenant_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_bytes bigint := 0;
BEGIN
  SELECT COALESCE(SUM(file_size), 0)
  INTO v_total_bytes
  FROM case_attachments
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
  
  RETURN v_total_bytes;
END;
$$;
