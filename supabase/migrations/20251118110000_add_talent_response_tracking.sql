-- Track per-talent responses on event requests so we can gate chat access
-- and suppress push reminders once a talent accepts or declines.

ALTER TABLE public.event_requests
ADD COLUMN IF NOT EXISTS accepted_by_talents UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS declined_by_talents UUID[] DEFAULT '{}';

COMMENT ON COLUMN public.event_requests.accepted_by_talents IS
'Array of talent user_ids who accepted this event request';

COMMENT ON COLUMN public.event_requests.declined_by_talents IS
'Array of talent user_ids who declined this event request';

-- Index the new array columns to keep containment checks fast.
CREATE INDEX IF NOT EXISTS event_requests_accepted_talents_idx
  ON public.event_requests
  USING GIN (accepted_by_talents);

CREATE INDEX IF NOT EXISTS event_requests_declined_talents_idx
  ON public.event_requests
  USING GIN (declined_by_talents);

