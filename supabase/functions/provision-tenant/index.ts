import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ProvisionTenantRequest {
  name: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
  planId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: ProvisionTenantRequest = await req.json();

    const { name, slug, adminEmail, adminPassword, adminFullName, planId } = requestData;

    if (!name || !slug || !adminEmail || !adminPassword || !adminFullName || !planId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingTenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant slug already exists' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name,
        slug,
        plan_id: planId,
        status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminFullName,
        tenant_id: tenant.id,
        role: 'admin',
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        tenant_id: tenant.id,
        role: 'admin',
        full_name: adminFullName,
        is_active: true,
      })
      .eq('id', authData.user.id);

    if (profileError) throw profileError;

    const { error: onboardingError } = await supabase
      .from('onboarding_progress')
      .insert({
        tenant_id: tenant.id,
        user_id: authData.user.id,
        steps_completed: [],
        current_step: 'company_info',
      });

    if (onboardingError) throw onboardingError;

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenant.id,
        user_id: authData.user.id,
        message: 'Tenant provisioned successfully',
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Tenant provisioning error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
