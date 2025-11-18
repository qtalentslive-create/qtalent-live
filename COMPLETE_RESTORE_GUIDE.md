# COMPLETE RESTORE GUIDE - Restore to Original Working State

## 🚨 IMPORTANT: Follow These Steps Exactly

If everything is broken, this guide will restore your database to the **original working state** before any event_request chat changes were made.

## Step 1: Apply the Complete Restore Migration

### In Supabase Dashboard:

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your **Qtalent** project
3. Click **"SQL Editor"** (left sidebar)
4. Click **"New query"**
5. Open this file: `supabase/migrations/20250117000001_restore_original_booking_chat.sql`
6. **Copy ALL the SQL code** from that file
7. **Paste it into the SQL Editor**
8. Click **"Run"** (or press `Ctrl+Enter`)
9. Wait for: **"Success. No rows returned"**

## Step 2: Verify the Restore

Run these queries in SQL Editor to verify everything is restored:

### Check RLS Policies:
```sql
SELECT 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'chat_messages'
ORDER BY policyname;
```

**Expected Result:**
- `Users can view messages for their bookings` (SELECT)
- `Users can create messages for their bookings` (INSERT)
- **NO event_request references**

### Check Functions:
```sql
SELECT 
  routine_name, 
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%message%'
ORDER BY routine_name;
```

**Expected Result:**
- `create_notification_for_new_message` (FUNCTION)
- `send_message_email_notification` (FUNCTION)
- **Both should be booking-only (no event_request logic)**

### Check Triggers:
```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'chat_messages'
ORDER BY trigger_name;
```

**Expected Result:**
- `message_email_notification_trigger` (INSERT)
- `on_new_message_create_notification` (INSERT)

## Step 3: Test the Application

### Test 1: Booking Chat
1. Create a booking (or use existing)
2. Open chat for that booking
3. Send a message
4. **Should work without errors**

### Test 2: Event Request Cards
1. View event request cards
2. Chat buttons should be **disabled** (grayed out)
3. **Should NOT crash or show errors**

### Test 3: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. **Should see NO errors** related to chat

## What This Restore Does

### ✅ Restored:
1. **RLS Policies**: Back to original booking-only policies
2. **send_message_email_notification()**: Original booking-only function
3. **create_notification_for_new_message()**: Original booking-only function
4. **Triggers**: Restored to original state

### ❌ Removed:
1. All event_request chat support from RLS policies
2. All event_request logic from notification functions
3. All event_request logic from email functions

## What's NOT Affected

These remain unchanged (they're separate from chat):
- Event request creation emails
- Event request confirmation emails
- Booking notifications
- Payment notifications
- Other email triggers

## If Something Still Doesn't Work

### Check 1: Database Functions
Run this to see the actual function code:
```sql
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'send_message_email_notification';
```

### Check 2: Check for Errors
Go to **Supabase Dashboard → Logs → Postgres Logs**
Look for any errors related to:
- `chat_messages`
- `send_message_email_notification`
- `create_notification_for_new_message`

### Check 3: Verify Frontend Code
Make sure your frontend code matches what we reverted:
- `ChatContext.tsx` should only support "booking" type
- Event request chat buttons should be disabled
- No calls to `openChat()` with "event_request"

## Rollback Plan (If Restore Doesn't Work)

If the restore migration fails or causes issues:

1. **Check the error message** in Supabase SQL Editor
2. **Try running sections separately**:
   - Run Step 1 (RLS Policies) first
   - Then Step 2 (Functions)
   - Then Step 3 (Triggers)

3. **Manual restore** (if needed):
   - Manually drop policies: `DROP POLICY IF EXISTS ...`
   - Manually drop functions: `DROP FUNCTION IF EXISTS ...`
   - Then re-run the restore migration

## Contact Support

If nothing works after following this guide:
1. Take a screenshot of the error
2. Copy the error message
3. Check Supabase logs for detailed error messages
4. Share all this information for further help

## Success Indicators

✅ **You know it worked when:**
- Booking chat messages send successfully
- No "could not send message" errors
- Event request chat buttons are disabled (but don't crash)
- No errors in browser console
- RLS policies show only booking-related logic
- Functions show only booking-related logic

---

## Files Changed (Frontend - Already Done)

These frontend files were already reverted:
- ✅ `src/contexts/ChatContext.tsx` - Booking-only
- ✅ `src/components/EventRequestCard.tsx` - Chat buttons disabled
- ✅ `src/components/NotificationCenter.tsx` - No event_request chat
- ✅ `src/components/NotificationList.tsx` - No event_request chat
- ✅ `src/pages/admin/AdminEventRequests.tsx` - Chat buttons disabled

You only need to apply the **database migration** now.

