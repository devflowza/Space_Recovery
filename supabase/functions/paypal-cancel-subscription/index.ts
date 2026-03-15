import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const requestBody: CancelSubscriptionRequest = await req.json();
    const { tenantId, reason } = requestBody;

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
