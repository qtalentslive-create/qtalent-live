import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
// Helper to get environment variable safely
const getEnv = (key) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  try {
    const supabase = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );
    // ✅ Check user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid authentication");
    const { plan_id, returnTo = "web" } = await req.json();
    if (!plan_id) throw new Error("plan_id is required");
    // ➡️ BEGIN PAYPAL ENVIRONMENT SWITCH
    // Change here to 'sandbox' for testing without paying real money
    // Change here to 'live' when you are ready to accept real payments
    const PAYPAL_ENV = getEnv("PAYPAL_ENV");
    const isSandbox = PAYPAL_ENV === "live"; //<-- SET THIS TO "sandbox" OR "live"///////////////////////////////////////////////////////////////////////<------------------
    // Automatically select credentials based on environment
    const PAYPAL_CLIENT_ID = isSandbox
      ? getEnv("PAYPAL_SANDBOX_CLIENT_ID")
      : getEnv("PAYPAL_LIVE_CLIENT_ID");
    const PAYPAL_CLIENT_SECRET = isSandbox
      ? getEnv("PAYPAL_SANDBOX_CLIENT_SECRET")
      : getEnv("PAYPAL_LIVE_CLIENT_SECRET");
    // PayPal API base URL changes depending on environment
    const PAYPAL_API_BASE = isSandbox
      ? "https://api-m.sandbox.paypal.com" // Sandbox testing
      : "https://api-m.paypal.com"; // Live payments
    // ⬅️ END PAYPAL ENVIRONMENT SWITCH
    // ✅ Get PayPal access token
    const tokenRes = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(
          `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
        )}`,
      },
      body: "grant_type=client_credentials",
    });
    if (!tokenRes.ok)
      throw new Error(
        `Failed to get PayPal access token: ${await tokenRes.text()}`
      );
    const { access_token } = await tokenRes.json();
    // ✅ Build return/cancel URLs
    const siteUrl = getEnv("PUBLIC_SITE_URL") || "https://qtalent.live";
    const returnUrl = new URL("/subscription-success", siteUrl);
    returnUrl.searchParams.set("returnTo", returnTo);
    const cancelUrl = new URL("/subscription-cancelled", siteUrl);
    cancelUrl.searchParams.set("returnTo", returnTo);
    // ✅ Build subscription payload
    const subscriptionPayload = {
      plan_id,
      custom_id: user.id,
      application_context: {
        brand_name: "QTalent",
        locale: "en-US",
        user_action: "SUBSCRIBE_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: returnUrl.toString(),
        cancel_url: cancelUrl.toString(),
      },
    };
    // ✅ Create the subscription on PayPal
    const subscriptionRes = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(subscriptionPayload),
      }
    );
    if (!subscriptionRes.ok)
      throw new Error(
        `Failed to create PayPal subscription: ${await subscriptionRes.text()}`
      );
    const subscriptionData = await subscriptionRes.json();
    const approvalUrl = subscriptionData.links?.find(
      (link) => link.rel === "approve"
    )?.href;
    if (!approvalUrl) throw new Error("PayPal did not return an approval URL");
    return new Response(
      JSON.stringify({
        success: true,
        approvalUrl,
        subscriptionId: subscriptionData.id,
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
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
