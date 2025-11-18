import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const REMINDER_INTERVAL_MINUTES = 60;
const MAX_REMINDER_WINDOW_HOURS = 72;

interface EventRequest {
  id: string;
  event_type: string;
  event_location: string;
  event_date: string | null;
  talent_type_needed?: string | null;
  hidden_by_talents?: string[] | null;
  accepted_by_talents?: string[] | null;
  declined_by_talents?: string[] | null;
}

interface TalentProfile {
  id: string;
  user_id: string | null;
  location?: string | null;
  act?: string | null;
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

    const { data: eventRequests, error: eventRequestError } = await supabase
      .from("event_requests")
      .select(
        "id, event_type, event_location, event_date, talent_type_needed, hidden_by_talents, accepted_by_talents, declined_by_talents, created_at, status"
      )
      .eq("status", "pending")
      .gte("created_at", maxWindowStart);

    if (eventRequestError) {
      throw eventRequestError;
    }

    if (!eventRequests?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending event requests needing reminders",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let remindersSent = 0;
    let candidatesEvaluated = 0;

    for (const request of eventRequests as EventRequest[]) {
      const { data: talents, error: talentError } = await supabase
        .from("talent_profiles")
        .select("id, user_id, location, act")
        .eq("location", request.event_location);

      if (talentError) {
        console.error(
          "Failed to load talents for request:",
          request.id,
          talentError.message
        );
        continue;
      }

      for (const talent of (talents as TalentProfile[]) || []) {
        if (!talent.user_id) continue;
        candidatesEvaluated += 1;

        if (request.hidden_by_talents?.includes(talent.user_id)) continue;
        if (request.accepted_by_talents?.includes(talent.user_id)) continue;
        if (request.declined_by_talents?.includes(talent.user_id)) continue;

        if (
          request.talent_type_needed &&
          talent.act &&
          !talent.act
            .toLowerCase()
            .includes(request.talent_type_needed.toLowerCase())
        ) {
          continue;
        }

        const { data: recentNotification } = await supabase
          .from("notification_history")
          .select("id")
          .eq("user_id", talent.user_id)
          .eq("event_request_id", request.id)
          .gte("created_at", reminderWindowStart)
          .limit(1)
          .maybeSingle();

        if (recentNotification) {
          continue;
        }

        const reminderTitle = "Reminder: Respond to event request";
        const requestDate = request.event_date
          ? new Date(request.event_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "upcoming date";
        const reminderBody = `Please respond to the ${request.event_type} request in ${request.event_location} scheduled for ${requestDate}.`;

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
                url: `/talent-dashboard?eventRequestId=${request.id}`,
                bookingId: request.id,
                eventRequestId: request.id,
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
    console.error("Error in send-event-request-reminders:", error);
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
