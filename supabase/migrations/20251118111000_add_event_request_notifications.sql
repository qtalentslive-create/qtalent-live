-- Allow notification history to track event-request-specific pushes.

ALTER TABLE public.notification_history
ADD COLUMN IF NOT EXISTS event_request_id UUID;

CREATE INDEX IF NOT EXISTS idx_notification_history_event_request
  ON public.notification_history(event_request_id);

