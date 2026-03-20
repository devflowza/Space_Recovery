import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || Deno.env.get('ALLOWED_ORIGIN') || 'https://xsuite.space,https://space-recovery.pages.dev').split(',').map(o => o.trim());

function getAllowedOrigin(req: Request): string {
  const origin = req.headers.get('Origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
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

function rateLimitResponse(headers: Record<string, string>, retryAfter: number) {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: { ...headers, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
    }
  );
}

function makeCorsHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(req),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };
}

interface CancelSubscriptionRequest {
  tenantId: string;
  reason?: string;
}

async function getPayPalAccessToken(
  clientId: string,
  clientSecret: string,
  apiUrl: string
): Promise<string> {
  const auth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(`${apiUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = makeCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalMode = Deno.env.get("PAYPAL_MODE") || "sandbox";

    if (!paypalClientId || !paypalClientSecret) {
      throw new Error("PayPal credentials not configured");
    }

    const paypalApiUrl = paypalMode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!callerProfile || !["owner", "admin"].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: 2 requests per 60 seconds per user
    const rateLimitKey = `paypal-cancel:${user.id}`;
    const rlAllowed = await checkRateLimit(supabase, rateLimitKey, 2, 60);
    if (!rlAllowed) {
      return rateLimitResponse(corsHeaders, 60);
    }

    const requestBody: CancelSubscriptionRequest = await req.json();
    const { tenantId, reason } = requestBody;

    // Verify the caller owns the tenant
    if (callerProfile.tenant_id && callerProfile.tenant_id !== tenantId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Cannot cancel subscription for another tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tenantId) {
      throw new Error("Missing required field: tenantId");
    }

    const { data: subscription, error: subError } = await supabase
      .from("tenant_subscriptions")
      .select("paypal_subscription_id, status")
      .eq("tenant_id", tenantId)
      .single();

    if (subError || !subscription) {
      throw new Error("Subscription not found");
    }

    if (!subscription.paypal_subscription_id) {
      throw new Error("No PayPal subscription found for this tenant");
    }

    if (subscription.status === 'cancelled') {
      throw new Error("Subscription is already cancelled");
    }

    const accessToken = await getPayPalAccessToken(
      paypalClientId,
      paypalClientSecret,
      paypalApiUrl
    );

    const cancelPayload = {
      reason: reason || "Customer requested cancellation",
    };

    const cancelResponse = await fetch(
      `${paypalApiUrl}/v1/billing/subscriptions/${subscription.paypal_subscription_id}/cancel`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cancelPayload),
      }
    );

    if (!cancelResponse.ok && cancelResponse.status !== 204) {
      const errorText = await cancelResponse.text();
      throw new Error(`PayPal cancellation failed: ${errorText}`);
    }

    const { error: updateError } = await supabase
      .from("tenant_subscriptions")
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason || "Customer requested cancellation",
      })
      .eq("tenant_id", tenantId);

    if (updateError) {
      console.error("Failed to update subscription:", updateError);
    }

    await supabase
      .from("tenants")
      .update({ subscription_status: 'cancelled' })
      .eq("id", tenantId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription cancelled successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error cancelling PayPal subscription:", error);
    return new Response(
      JSON.stringify({
        error: "An internal error occurred. Please try again later.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
