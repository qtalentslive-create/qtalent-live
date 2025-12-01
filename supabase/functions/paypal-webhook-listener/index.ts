import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
// Helper to get environment variable and throw if missing
const getEnv = (key) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
};
// ✅ Live-only PayPal configuration
const PAYPAL_CLIENT_ID = getEnv("PAYPAL_LIVE_CLIENT_ID");
const PAYPAL_CLIENT_SECRET = getEnv("PAYPAL_LIVE_CLIENT_SECRET");
const PAYPAL_WEBHOOK_ID = getEnv("PAYPAL_LIVE_WEBHOOK_ID");
const PAYPAL_API_BASE = "https://api-m.paypal.com";
// Supabase client
const SUPABASE_URL = getEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
serve(async (req) => {
  console.log("PayPal webhook received:", req.method);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  try {
    const webhookEvent = await req.json();
    console.log(`PayPal Environment: LIVE`);
    console.log("Webhook Event Type:", webhookEvent.event_type);
    console.log("Webhook Event ID:", webhookEvent.id);
    // 1️⃣ Get PayPal access token
    const tokenRes = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(
          `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
        )}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!tokenRes.ok)
      throw new Error(`PayPal auth failed: ${await tokenRes.text()}`);
    const { access_token } = await tokenRes.json();
    // 2️⃣ Verify webhook signature
    if (PAYPAL_WEBHOOK_ID) {
      const verifyPayload = {
        transmission_id: req.headers.get("PAYPAL-TRANSMISSION-ID"),
        transmission_time: req.headers.get("PAYPAL-TRANSMISSION-TIME"),
        cert_url: req.headers.get("PAYPAL-CERT-URL"),
        auth_algo: req.headers.get("PAYPAL-AUTH-ALGO"),
        transmission_sig: req.headers.get("PAYPAL-TRANSMISSION-SIG"),
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: webhookEvent,
      };
      const verifyRes = await fetch(
        `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`,
          },
          body: JSON.stringify(verifyPayload),
        }
      );
      if (!verifyRes.ok)
        throw new Error(
          `Webhook verification call failed: ${await verifyRes.text()}`
        );
      const verification = await verifyRes.json();
      if (verification.verification_status !== "SUCCESS") {
        return new Response(
          JSON.stringify({
            error: "Invalid webhook signature",
          }),
          {
            status: 401,
            headers: corsHeaders,
          }
        );
      }
    } else {
      console.log("Skipping webhook verification (no webhook ID provided)");
    }
    // 3️⃣ Process subscription/payment events (keep all your existing logic)
    const eventType = webhookEvent.event_type;
    const subscription = webhookEvent.resource;
    let customId =
      subscription?.custom_id ||
      subscription?.custom ||
      subscription?.subscriber?.custom_id ||
      subscription?.application_context?.custom_id;
    // Handle activation
    if (
      eventType.includes("SUBSCRIPTION.ACTIVATED") ||
      eventType === "PAYMENT.SALE.COMPLETED"
    ) {
      if (!customId) throw new Error("No user ID found in subscription event");
      // Find user
      const { data: user, error: userError } = await supabase
        .from("talent_profiles")
        .select("*")
        .eq("user_id", customId)
        .single();
      if (userError || !user) throw new Error(`User not found: ${customId}`);
      // Determine period end
      const planId = subscription.plan_id || "basic_plan";
      const periodEndDate = planId.toLowerCase().includes("month")
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      // Update user subscription
      const updateData = {
        subscription_status: "active",
        paypal_subscription_id: subscription.id,
        plan_id: planId,
        current_period_end: periodEndDate.toISOString(),
        is_pro_subscriber: true,
        subscription_started_at: new Date().toISOString(),
        will_renew: true,
        cancelled_at: null,
        cancellation_reason: null,
      };
      const { error: updateError } = await supabase
        .from("talent_profiles")
        .update(updateData)
        .eq("user_id", customId);
      if (updateError) throw updateError;
      // Notify user
      await supabase.from("notifications").insert({
        user_id: customId,
        type: "subscription_activated",
        title: "Pro Subscription Activated! 🎉",
        message: "Welcome to Pro! You can now enjoy all premium features.",
      });
      return new Response(
        JSON.stringify({
          success: true,
          user_id: customId,
          subscription_id: subscription.id,
        }),
        {
          headers: corsHeaders,
        }
      );
    }
    // Handle cancellation
    if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") {
      const { data: user, error: findError } = await supabase
        .from("talent_profiles")
        .select("*")
        .eq("paypal_subscription_id", subscription.id)
        .single();
      if (!user || findError)
        throw new Error(`User not found for subscription: ${subscription.id}`);
      await supabase
        .from("talent_profiles")
        .update({
          subscription_status: "cancelled",
          is_pro_subscriber: false,
          cancelled_at: new Date().toISOString(),
        })
        .eq("paypal_subscription_id", subscription.id);
      await supabase.from("notifications").insert({
        user_id: user.user_id,
        type: "subscription_cancelled",
        title: "Subscription Cancelled",
        message: "Your Pro subscription has been cancelled.",
      });
      return new Response(
        JSON.stringify({
          success: true,
          subscription_id: subscription.id,
        }),
        {
          headers: corsHeaders,
        }
      );
    }
    // Default response for unhandled events
    return new Response(
      JSON.stringify({
        success: true,
        message: "Event received but not processed",
        event_type: eventType,
      }),
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
