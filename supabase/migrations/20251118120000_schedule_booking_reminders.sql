-- Enable required extensions for scheduled tasks (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule hourly reminders for pending bookings
-- This runs at minute 5 of every hour (5 minutes after event request reminders)
SELECT cron.schedule(
  'hourly-booking-reminders',
  '5 * * * *', -- Run at minute 5 every hour
  $$
  SELECT
    net.http_post(
      url:='https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-booking-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eGl6dXBjY3dldWtyeGZkcW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5Mjk4ODQsImV4cCI6MjA2ODUwNTg4NH0.KiikwI4cv2x4o0bPavrHtofHD8_VdK7INEAWdHsNRpE"}'::jsonb,
      body:=concat('{"scheduled_time": "', now(), '"}')::jsonb
    ) AS request_id;
  $$
);

