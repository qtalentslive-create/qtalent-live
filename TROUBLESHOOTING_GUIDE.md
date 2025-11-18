# Troubleshooting: Event Request Emails & Push Notifications Not Working

## 🔍 Step 1: Verify Migration Was Applied

Run this in Supabase SQL Editor:

```sql
-- Check if the function was updated
SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'send_event_request_email_notification';
```

**Look for:** The function should contain `'admin_new_event_request'` in the emailType field.

---

## 🔍 Step 2: Check Trigger Exists

```sql
-- Check what triggers exist on event_requests
SELECT
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'event_requests'
  AND event_object_schema = 'public';
```

**Should see:** `event_request_email_trigger` that calls `send_event_request_email_notification()`

---

## 🔍 Step 3: Verify Service Role Key

```sql
-- Check if service_role_key exists
SELECT
  setting_key,
  CASE
    WHEN setting_value IS NULL THEN 'NULL - THIS IS THE PROBLEM!'
    WHEN setting_value = '' THEN 'EMPTY - THIS IS THE PROBLEM!'
    ELSE 'EXISTS ✓'
  END as key_status
FROM admin_settings
WHERE setting_key = 'service_role_key';
```

**If NULL or EMPTY:** The trigger can't send emails. You need to add the service role key.

---

## 🔍 Step 4: Check Recent Event Requests

```sql
-- See recent event requests
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
```

---

## 🔍 Step 5: Check Database Logs

1. Go to Supabase Dashboard → **Logs** → **Postgres Logs**
2. Filter for: `Event request email trigger fired`
3. Look for errors or warnings

**What to look for:**

- ✅ `Event request email trigger fired for request ID: [some-id]`
- ✅ `Admin notification sent for new event request: [id]`
- ❌ `Service role key not found` - **THIS IS THE PROBLEM**
- ❌ `Failed to send admin notification` - Check the error message

---

## 🔍 Step 6: Check Edge Function Logs

1. Go to Supabase Dashboard → **Edge Functions** → `send-notification-email`
2. Click **Logs** tab
3. Look for recent invocations

**What to look for:**

- ✅ Function being called with `emailType: 'admin_new_event_request'`
- ❌ Errors about missing data or failed email sends

---

## 🔍 Step 7: Test Push Notifications

Check browser console when submitting event request:

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Submit an event request
4. Look for:
   - ✅ `Form submitted. Now finding matching talents...`
   - ✅ `Found X matching talents with tokens. Sending notifications...`
   - ✅ `Push notification sent successfully to [user-id]`
   - ❌ `Error finding talents` - Check the error
   - ❌ `Failed to send push notification` - Check the error

---

## 🛠️ Common Fixes

### Fix 1: Migration Not Applied

**Solution:** Re-run the migration SQL in Supabase SQL Editor

### Fix 2: Service Role Key Missing

**Solution:**

```sql
-- Insert service role key (get it from Supabase Dashboard → Settings → API)
INSERT INTO admin_settings (setting_key, setting_value)
VALUES ('service_role_key', 'your-service-role-key-here')
ON CONFLICT (setting_key)
DO UPDATE SET setting_value = EXCLUDED.setting_value;
```

### Fix 3: Edge Functions Not Deployed

**Solution:** Deploy the functions using CLI or manually update in dashboard

### Fix 4: Trigger Not Firing

**Solution:** Re-create the trigger:

```sql
DROP TRIGGER IF EXISTS event_request_email_trigger ON public.event_requests;
CREATE TRIGGER event_request_email_trigger
  AFTER INSERT ON public.event_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.send_event_request_email_notification();
```

---

## 🧪 Test After Fixes

1. Submit a test event request
2. Check:
   - ✅ Admin email received at qtalentslive@gmail.com
   - ✅ Matching talent receives email
   - ✅ Push notification sent to matching talents
   - ✅ Browser console shows success messages

---

## 📞 Still Not Working?

Share the results of:

1. Step 1 (function definition)
2. Step 2 (triggers)
3. Step 3 (service role key status)
4. Step 5 (database logs)
5. Step 6 (edge function logs)
6. Step 7 (browser console output)
