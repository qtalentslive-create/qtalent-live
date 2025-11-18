# 🚨 QUICK RESTORE - Fix Everything Now

## Step 1: Apply Database Restore (2 minutes)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **"New query"**
3. Open file: `supabase/migrations/20250117000001_restore_original_booking_chat.sql`
4. **Copy ALL the SQL** and paste into SQL Editor
5. Click **"Run"** (Ctrl+Enter)
6. Wait for "Success. No rows returned"

## Step 2: Verify It Worked (1 minute)

Run this in SQL Editor:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'chat_messages';
```

Should show:
- `Chat participants can read messages`
- `Chat participants can send messages`

**NO event_request references!**

## Step 3: Test (2 minutes)

1. **Open your app**
2. **Create a booking** (or use existing)
3. **Send a chat message**
4. **Should work! ✅**

## What This Does

✅ Restores RLS policies to booking-only
✅ Restores email functions to booking-only  
✅ Restores notification functions to booking-only
✅ Removes all event_request chat support

## Frontend Already Fixed

The frontend code is already reverted:
- ChatContext = booking-only ✅
- Event request chat buttons = disabled ✅
- No errors expected ✅

## If It Still Doesn't Work

1. Check browser console (F12) for errors
2. Check Supabase logs for database errors
3. Verify the migration ran successfully
4. Try refreshing the page

---

**That's it! Your booking chat should work now.** 🎉

