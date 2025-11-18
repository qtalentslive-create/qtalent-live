# Revert Instructions

This document explains how to revert the event request chat functionality changes that were made recently.

## Changes Made

### 1. Frontend (React/TypeScript)
- **ChatContext.tsx**: Reverted to booking-only chat (removed event_request support)
- **EventRequestCard.tsx**: Disabled event request chat buttons
- **NotificationCenter.tsx**: Removed event_request chat opening
- **NotificationList.tsx**: Removed event_request chat opening

### 2. Database (SQL Migration)
- Created revert migration: `20250117000000_revert_event_request_chat_changes.sql`
- This migration:
  - Reverts RLS policies to booking-only (removes event_request support)
  - Reverts `create_notification_for_new_message()` function to booking-only
  - Reverts `send_message_email_notification()` function to booking-only
  - Updates triggers to use reverted functions

## How to Apply the Revert

### Step 1: Apply the Database Revert Migration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **Qtalent** project
3. Go to **SQL Editor** (left sidebar)
4. Click **"New query"**
5. Open the file: `supabase/migrations/20250117000000_revert_event_request_chat_changes.sql`
6. Copy **ALL** the SQL code from the file
7. Paste it into the SQL Editor
8. Click **"Run"** (or press `Ctrl+Enter`)
9. Wait for success message: "Success. No rows returned"

### Step 2: Verify the Revert

Run this query in the SQL Editor to verify the RLS policies:

```sql
-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'chat_messages'
ORDER BY policyname;
```

You should see:
- "Chat participants can read messages" - should NOT include event_request logic
- "Chat participants can send messages" - should NOT include event_request logic

### Step 3: Test the Application

1. **Test Booking Chat**: 
   - Create a booking
   - Try sending messages in the booking chat
   - Verify messages are sent and received correctly

2. **Test Event Request Cards**:
   - View event request cards
   - Verify chat buttons are disabled (grayed out)
   - Verify no errors when clicking disabled buttons

3. **Test Notifications**:
   - Click on event request notifications
   - Verify it navigates to dashboard without trying to open chat

## What Was Reverted

### Frontend
- ✅ ChatContext now only supports "booking" type
- ✅ EventRequestCard chat buttons are disabled
- ✅ Notification handlers no longer try to open event_request chats

### Database
- ✅ RLS policies reverted to booking-only
- ✅ Notification functions reverted to booking-only
- ✅ Email notification functions reverted to booking-only

## What Was NOT Reverted

- Event request creation emails (trigger `event_request_email_trigger`)
- Event request notification emails to talents
- Event request confirmation emails to bookers

These remain in place as they are separate from the chat functionality.

## If Something Doesn't Work

1. **Check Browser Console**: Look for any JavaScript errors
2. **Check Supabase Logs**: Go to Logs > Postgres Logs in Supabase Dashboard
3. **Verify Migration Applied**: Check that the revert migration ran successfully
4. **Check RLS Policies**: Verify policies don't include event_request logic

## Rollback Plan

If you need to rollback this revert:

1. The original migrations are still in the migrations folder:
   - `20250115000000_fix_event_request_notifications.sql`
   - `20250116000000_fix_event_request_chat.sql`

2. You can re-apply them by running the SQL from those files in the Supabase SQL Editor

3. Then update the frontend code to restore event_request chat support

