-- Check if trigger fired for recent event requests
-- This will help us see if the database trigger is actually executing

-- First, let's check the Postgres logs for trigger execution
-- Note: You'll need to check the Supabase Dashboard → Logs → Postgres Logs for this
-- But we can also check if there are any notification_history entries created

-- Check if notification_history has entries for these event requests
SELECT 
  nh.id,
  nh.user_id,
  nh.title,
  nh.body,
  nh.url,
  nh.booking_id,
  nh.notification_type,
  nh.created_at
FROM notification_history nh
WHERE nh.created_at >= '2025-11-05 00:00:00'
ORDER BY nh.created_at DESC
LIMIT 20;

-- Check if there are matching talents for the recent event requests
-- This will help us understand if emails should have been sent
SELECT 
  er.id as event_request_id,
  er.booker_name,
  er.event_location,
  er.talent_type_needed,
  COUNT(tp.user_id) as matching_talents_count,
  ARRAY_AGG(tp.user_id) as matching_talent_user_ids
FROM event_requests er
LEFT JOIN talent_profiles tp ON (
  tp.location = er.event_location
  AND (
    er.talent_type_needed IS NULL 
    OR LOWER(tp.act::text) = LOWER(er.talent_type_needed)
    OR LOWER(tp.act::text) LIKE '%' || LOWER(er.talent_type_needed) || '%'
  )
)
WHERE er.id IN (
  '986a52e3-5d92-4396-a08a-8a81666c3be7',
  '5e98c6c6-79d1-4776-9c99-09199024348a',
  '3f408723-1101-4b58-a19c-b9c48a090839',
  '513efb93-a9f5-4609-b31f-ed1436306306',
  '313b4389-0f25-4eb5-9b45-bd12fe6fe5b8'
)
GROUP BY er.id, er.booker_name, er.event_location, er.talent_type_needed;

