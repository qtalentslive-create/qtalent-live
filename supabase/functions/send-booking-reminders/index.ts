import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const REMINDER_INTERVAL_MINUTES = 60;
const MAX_REMINDER_WINDOW_HOURS = 72;

interface Booking {
  id: string;
  talent_id: string | null;
  event_type: string;
  event_location: string;
  event_date: string | null;
  status: string;
  created_at: string;
}

interface TalentProfile {
  id: string;
  user_id: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const reminderWindowStart = new Date(
      now.getTime() - REMINDER_INTERVAL_MINUTES * 60 * 1000
    ).toISOString();
    const maxWindowStart = new Date(
      now.getTime() - MAX_REMINDER_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString();

    // Fetch pending bookings that need talent response
    // Status should be "pending" or "pending_approval" and talent_id must be set
    const { data: bookings, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, talent_id, event_type, event_location, event_date, status, created_at"
      )
      .in("status", ["pending", "pending_approval"])
      .not("talent_id", "is", null)
      .gte("created_at", maxWindowStart);

    if (bookingError) {
      throw bookingError;
    }

    if (!bookings?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending bookings needing reminders",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let remindersSent = 0;
    let candidatesEvaluated = 0;

    for (const booking of bookings as Booking[]) {
      if (!booking.talent_id) continue;

      // Get the talent profile to get user_id
      const { data: talent, error: talentError } = await supabase
        .from("talent_profiles")
        .select("id, user_id")
        .eq("id", booking.talent_id)
        .maybeSingle();

      if (talentError) {
        console.error(
          "Failed to load talent for booking:",
          booking.id,
          talentError.message
        );
        continue;
      }

      if (!talent || !talent.user_id) {
        continue;
      }

      candidatesEvaluated += 1;

      // Check if talent has already responded (status changed from pending)
      // We check if there's a recent notification that indicates they've been reminded
      // and if the booking status is still pending, they haven't responded
      const { data: recentNotification } = await supabase
        .from("notification_history")
        .select("id")
        .eq("user_id", talent.user_id)
        .eq("booking_id", booking.id)
        .gte("created_at", reminderWindowStart)
        .limit(1)
        .maybeSingle();

      if (recentNotification) {
        continue;
      }

      // Check if booking status is still pending (talent hasn't responded)
      // If status changed to accepted/declined, skip reminder
      const { data: currentBooking } = await supabase
        .from("bookings")
        .select("status")
        .eq("id", booking.id)
        .maybeSingle();

      if (
        !currentBooking ||
        (currentBooking.status !== "pending" &&
          currentBooking.status !== "pending_approval")
      ) {
        continue;
      }

      const reminderTitle = "Reminder: Respond to booking request";
      const bookingDate = booking.event_date
        ? new Date(booking.event_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "upcoming date";
      const reminderBody = `Please respond to the ${booking.event_type} booking in ${booking.event_location} scheduled for ${bookingDate}.`;

      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/send-push-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              userId: talent.user_id,
              title: reminderTitle,
              body: reminderBody,
              url: `/talent-dashboard?bookingId=${booking.id}`,
              bookingId: booking.id,
              reminder: true,
            }),
          }
        );

        if (!response.ok) {
          const text = await response.text();
          console.error(
            "Failed to send reminder push:",
            response.status,
            text
          );
        } else {
          remindersSent += 1;
        }
      } catch (pushError) {
        console.error("Error invoking push notification:", pushError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent,
        candidatesEvaluated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-booking-reminders:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message ?? "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

