import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || Deno.env.get('ALLOWED_ORIGIN') || 'https://xsuite.space,https://space-recovery.pages.dev').split(',').map(o => o.trim());

function getAllowedOrigin(req: Request): string {
  const origin = req.headers.get('Origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown';
}

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  const { data } = await supabase.rpc('check_rate_limit', {
    p_key: key,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });
  return data === true;
}

function rateLimitResponse(corsHeaders: Record<string, string>, retryAfter: number) {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}

function makeCorsHeaders(req: Request) {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(req),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  };
}

interface ProvisionTenantRequest {
  name: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
  planId: string;
  countryId: string;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = makeCorsHeaders(req);

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

    const ip = getClientIP(req);
    const authHeader = req.headers.get('Authorization');

    if (authHeader) {
      // Admin-provisioned flow: validate platform admin
      const userClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!callerProfile || !['owner', 'admin'].includes(callerProfile.role)) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const rateLimitKey = `provision-tenant:${ip}:${user.id}`;
      const allowed = await checkRateLimit(supabase, rateLimitKey, 1, 60);
      if (!allowed) {
        return rateLimitResponse(corsHeaders, 60);
      }
    } else {
      // Self-service signup flow: stricter rate limiting by IP only
      const rateLimitKey = `provision-tenant-signup:${ip}`;
      const allowed = await checkRateLimit(supabase, rateLimitKey, 3, 3600);
      if (!allowed) {
        return rateLimitResponse(corsHeaders, 3600);
      }
    }

    const requestData: ProvisionTenantRequest = await req.json();

    const { name, slug, adminEmail, adminPassword, adminFullName, planId, countryId } = requestData;

    if (!name || !slug || !adminEmail || !adminPassword || !adminFullName || !planId || !countryId) {
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
        country_id: countryId,
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
        role: 'owner',
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        tenant_id: tenant.id,
        role: 'owner',
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
        error: 'An internal error occurred. Please try again later.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
