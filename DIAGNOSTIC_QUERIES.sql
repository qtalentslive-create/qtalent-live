-- Diagnostic Queries to Check Event Request Email Setup
-- Run these in Supabase SQL Editor to debug issues

-- 1. Check if the function exists and what it does
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'send_event_request_email_notification';

-- 2. Check what triggers exist on event_requests table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'event_requests'
  AND event_object_schema = 'public';

-- 3. Check if service_role_key exists in admin_settings
SELECT 
  setting_key,
  CASE 
    WHEN setting_value IS NULL THEN 'NULL'
    WHEN setting_value = '' THEN 'EMPTY'
    ELSE 'EXISTS (length: ' || length(setting_value) || ')'
  END as key_status
FROM admin_settings
WHERE setting_key = 'service_role_key';

-- 4. Check recent event requests (last 10)
SELECT 
  id,
  booker_name,
  booker_email,
  event_location,
  talent_type_needed,
  created_at
FROM event_requests
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check if there are matching talents for a specific event request
-- (Replace 'YOUR_EVENT_REQUEST_ID' with an actual ID from query #4)
/*
SELECT 
  tp.user_id,
  tp.artist_name,
  tp.location,
  tp.act
FROM talent_profiles tp
WHERE tp.location = (SELECT event_location FROM event_requests WHERE id = 'YOUR_EVENT_REQUEST_ID')
  AND (
    (SELECT talent_type_needed FROM event_requests WHERE id = 'YOUR_EVENT_REQUEST_ID') IS NULL 
    OR LOWER(tp.act::text) = LOWER((SELECT talent_type_needed FROM event_requests WHERE id = 'YOUR_EVENT_REQUEST_ID'))
    OR LOWER(tp.act::text) LIKE '%' || LOWER((SELECT talent_type_needed FROM event_requests WHERE id = 'YOUR_EVENT_REQUEST_ID')) || '%'
  );
*/

