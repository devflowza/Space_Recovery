REVOKE EXECUTE ON FUNCTION public.tenant_module_enabled(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_tenant_module_entitlements() FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_tenant_module_entitlements(uuid) FROM anon, authenticated;
