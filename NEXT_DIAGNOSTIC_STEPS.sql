-- Step 2: Check Trigger Exists
-- Run this query to see if the trigger is set up correctly

SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'event_requests'
  AND event_object_schema = 'public';

-- Step 3: Verify Service Role Key
-- This is CRITICAL - if this is NULL or EMPTY, emails won't work!

SELECT 
  setting_key,
  CASE 
    WHEN setting_value IS NULL THEN 'NULL - THIS IS THE PROBLEM!'
    WHEN setting_value = '' THEN 'EMPTY - THIS IS THE PROBLEM!'
    ELSE 'EXISTS ✓'
  END as key_status,
  CASE 
    WHEN setting_value IS NULL OR setting_value = '' THEN 'You need to add the service role key!'
    ELSE 'Key is present - length: ' || length(setting_value) || ' characters'
  END as details
FROM admin_settings
WHERE setting_key = 'service_role_key';

-- Step 4: Check Recent Event Requests
-- See if any event requests were created recently

SELECT 
  id,
  booker_name,
  booker_email,
  event_location,
  talent_type_needed,
  created_at
FROM event_requests
ORDER BY created_at DESC
LIMIT 5;

