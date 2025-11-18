-- Ensure scheduling extensions are available
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule hourly reminders for pending event requests
SELECT cron.schedule(
  'hourly-event-request-reminders',
  '0 * * * *', -- Run at minute 0 every hour
  $$
  SELECT
    net.http_post(
      url:='https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-event-request-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eGl6dXBjY3dldWtyeGZkcW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5Mjk4ODQsImV4cCI6MjA2ODUwNTg4NH0.KiikwI4cv2x4o0bPavrHtofHD8_VdK7INEAWdHsNRpE"}'::jsonb,
      body:=concat('{"scheduled_time": "', now(), '"}')::jsonb
    ) AS request_id;
  $$
);

