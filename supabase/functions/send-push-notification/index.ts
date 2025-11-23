// FILE: supabase/functions/send-push-notification/index.ts
// FINAL CORRECTED VERSION (vibrateTimings "s" format fix)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import admin from "npm:firebase-admin@11.11.1"; // Fixed import

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---
// 1. Initialize Firebase Admin
// ---
try {
  if (admin.apps.length === 0) {
    const serviceAccount = JSON.parse(
      Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON")!
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin Initialized.");
  }
} catch (e) {
  const err = e as Error;
  console.error("Firebase Admin initialization error:", err.message);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("!!!!!!!!!! FUNCTION WAS INVOKED !!!!!!!!!!");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, title, body, url, bookingId, eventRequestId } =
      await req.json();
    console.log("Sending push notification to user:", userId);

    // Check if this is a reminder and if user has already responded
    if (eventRequestId) {
      const { data: eventRequest, error: eventRequestError } = await supabase
        .from("event_requests")
        .select("accepted_by_talents, declined_by_talents")
        .eq("id", eventRequestId)
        .maybeSingle();

      if (eventRequestError) {
        console.error(
          "Unable to fetch event request response state:",
          eventRequestError.message
        );
      } else if (eventRequest) {
        const responded =
          (eventRequest.accepted_by_talents || []).includes(userId) ||
          (eventRequest.declined_by_talents || []).includes(userId);

        if (responded) {
          console.log(
            `Skipping reminder because user ${userId} already responded to event request ${eventRequestId}`
          );
          return new Response(
            JSON.stringify({
              success: true,
              skipped: true,
              reason: "talent_already_responded",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
      }
    }

    // Check if this is a booking reminder and if user has already responded
    if (bookingId) {
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("status")
        .eq("id", bookingId)
        .maybeSingle();

      if (bookingError) {
        console.error(
          "Unable to fetch booking response state:",
          bookingError.message
        );
      } else if (booking) {
        // If booking status is not pending or pending_approval, talent has responded
        const hasResponded =
          booking.status !== "pending" && booking.status !== "pending_approval";

        if (hasResponded) {
          console.log(
            `Skipping reminder because user ${userId} already responded to booking ${bookingId} (status: ${booking.status})`
          );
          return new Response(
            JSON.stringify({
              success: true,
              skipped: true,
              reason: "talent_already_responded",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
      }
    }

    // ---
    // 2. Read the 'profiles' table for the token
    // ---
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("push_token")
      .eq("id", userId)
      .single();

    if (userError || !userData || !userData.push_token) {
      console.error(
        "Error fetching token or no token found:",
        userError?.message
      );
      return new Response(
        JSON.stringify({
          success: false,
          message: "No push token found for user",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    const token = userData.push_token;
    console.log(`!!!!!!!!!! FOUND TOKEN: ${token} !!!!!!!!!!`);

    // ---
    // 3. Store notification in history
    // ---
    try {
      await supabase.from("notification_history").insert({
        user_id: userId,
        title: title,
        body: body,
        url: url || "/",
        booking_id: bookingId || null,
        event_request_id: eventRequestId || null,
        notification_type: "push",
      });
      console.log("Notification stored in history");
    } catch (err) {
      console.error("Failed to store notification history:", err);
    }

    // ---
    // 4. Build the "Notification" Message
    // ---
    const message = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: {
        url: url || "/",
        bookingId: String(bookingId || ""),
        eventRequestId: String(eventRequestId || ""),
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: "default",
          },
        },
      },
      android: {
        priority: "high", // Required for notifications when app is closed
        notification: {
          sound: "default",
          channelId: "default_channel",
          //
          // ▼▼▼ THIS IS THE FIX (Changed format to "0.3s") ▼▼▼
          //
          vibrateTimings: ["0.3s", "0.1s", "0.15s"],
        },
      },
    };

    // ---
    // 5. Send the message using Firebase Admin
    // ---
    console.log(
      "!!!!!!!!!! SENDING THIS TO FIREBASE: !!!!!!!!!!",
      JSON.stringify(message)
    );

    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:", response);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent", response }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const err = error as Error;
    console.error("Error in send-push-notification:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
