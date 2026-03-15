import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PayPalAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalSubscriptionRequest {
  tenantId: string;
  planId: string;
  billingInterval: 'month' | 'year';
  returnUrl?: string;
  cancelUrl?: string;
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

  const data: PayPalAccessTokenResponse = await response.json();
  return data.access_token;
}

Deno.serve(async (req: Request) => {
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

    const requestBody: PayPalSubscriptionRequest = await req.json();
    const { tenantId, planId, billingInterval, returnUrl, cancelUrl } = requestBody;

    if (!tenantId || !planId || !billingInterval) {
      throw new Error("Missing required fields: tenantId, planId, billingInterval");
    }

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("name, contact_email")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error("Tenant not found");
    }

    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      throw new Error("Plan not found");
    }

    const paypalPlanId = billingInterval === 'month'
      ? plan.paypal_plan_monthly_id
      : plan.paypal_plan_yearly_id;

    if (!paypalPlanId) {
      throw new Error(`PayPal plan ID not configured for ${plan.code} (${billingInterval})`);
    }

    const accessToken = await getPayPalAccessToken(
      paypalClientId,
      paypalClientSecret,
      paypalApiUrl
    );

    const defaultReturnUrl = `${req.headers.get("origin") || "http://localhost:5173"}/settings/billing?success=true`;
    const defaultCancelUrl = `${req.headers.get("origin") || "http://localhost:5173"}/settings/billing?cancelled=true`;

    const subscriptionPayload = {
      plan_id: paypalPlanId,
      subscriber: {
        name: {
          given_name: tenant.name.split(' ')[0] || tenant.name,
          surname: tenant.name.split(' ').slice(1).join(' ') || tenant.name,
        },
        email_address: tenant.contact_email || "noreply@xsuite.app",
      },
      custom_id: tenantId,
      application_context: {
        brand_name: "xSuite",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
        },
        return_url: returnUrl || defaultReturnUrl,
        cancel_url: cancelUrl || defaultCancelUrl,
      },
    };

    const idempotencyKey = `${tenantId}-${Date.now()}`;

    const createResponse = await fetch(`${paypalApiUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": idempotencyKey,
      },
      body: JSON.stringify(subscriptionPayload),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`PayPal subscription creation failed: ${errorText}`);
    }

    const subscriptionData = await createResponse.json();

    const { error: upsertError } = await supabase
      .from("tenant_subscriptions")
      .upsert({
        tenant_id: tenantId,
        plan_id: planId,
        status: 'pending',
        billing_interval: billingInterval,
        paypal_subscription_id: subscriptionData.id,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id',
      });

    if (upsertError) {
      console.error("Failed to save subscription:", upsertError);
    }

    const approvalUrl = subscriptionData.links?.find(
      (link: any) => link.rel === 'approve'
    )?.href;

    return new Response(
      JSON.stringify({
        subscriptionId: subscriptionData.id,
        approvalUrl,
        status: subscriptionData.status,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating PayPal subscription:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
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
