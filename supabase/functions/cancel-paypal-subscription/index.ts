import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
// Helper to safely get environment variables
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
    console.log("Cancel PayPal subscription request received");
    // ✅ Initialize Supabase client
    const supabase = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );
    // ✅ Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid authentication");
    // ✅ Parse subscription ID from request
    const { subscriptionId } = await req.json();
    if (!subscriptionId) throw new Error("No subscription ID provided");
    console.log(
      "Cancelling subscription:",
      subscriptionId,
      "for user:",
      user.id
    );
    // ✅ Fetch user's profile
    const { data: profile, error: profileError } = await supabase
      .from("talent_profiles")
      .select("provider, is_pro_subscriber")
      .eq("user_id", user.id)
      .eq("paypal_subscription_id", subscriptionId)
      .maybeSingle();
    if (profileError) throw new Error("Failed to verify subscription");
    if (!profile) throw new Error("Subscription not found for this user");
    if (profile.provider === "manual")
      throw new Error(
        "Cannot cancel admin-granted subscriptions via this method."
      );
    // ➡️ BEGIN PAYPAL ENVIRONMENT SWITCH
    // ⚠️ IMPORTANT: This is where you choose your PayPal environment.
    // Set the PAYPAL_ENV secret in Supabase to either:
    // - "sandbox" for testing (no real money)
    // - "live" for real payments
    // Example: PAYPAL_ENV = "sandbox"  <-- change here when you want to switch
    const PAYPAL_ENV = getEnv("PAYPAL_ENV");
    const isSandbox = PAYPAL_ENV !== "live";
    const PAYPAL_CLIENT_ID = isSandbox
      ? getEnv("PAYPAL_SANDBOX_CLIENT_ID")
      : getEnv("PAYPAL_LIVE_CLIENT_ID");
    const PAYPAL_CLIENT_SECRET = isSandbox
      ? getEnv("PAYPAL_SANDBOX_CLIENT_SECRET")
      : getEnv("PAYPAL_LIVE_CLIENT_SECRET");
    const PAYPAL_API_BASE = isSandbox
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";
    // ⬅️ END PAYPAL ENVIRONMENT SWITCH
    console.log("Verified PayPal credentials, proceeding with cancellation");
    // ✅ Get PayPal access token
    const tokenResponse = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(
          `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
        )}`,
      },
      body: "grant_type=client_credentials",
    });
    if (!tokenResponse.ok) throw new Error("Failed to get PayPal access token");
    const tokenData = await tokenResponse.json();
    // ✅ Cancel the subscription via PayPal API
    const cancelResponse = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Customer requested cancellation",
        }),
      }
    );
    if (!cancelResponse.ok)
      throw new Error("Failed to cancel subscription with PayPal");
    console.log("PayPal subscription cancelled successfully");
    // ✅ Update user's talent profile in Supabase
    const { error: updateError } = await supabase
      .from("talent_profiles")
      .update({
        subscription_status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("paypal_subscription_id", subscriptionId);
    if (updateError)
      throw new Error("Failed to update subscription status in database");
    // ✅ Create user notification
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: user.id,
          type: "subscription_cancelled",
          title: "Subscription Cancelled",
          message:
            "Your Pro subscription has been cancelled. You will retain Pro access until the end of your current billing period.",
        },
      ]);
    if (notificationError)
      console.error("Error creating notification:", notificationError);
    console.log("Successfully cancelled subscription for user:", user.id);
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
