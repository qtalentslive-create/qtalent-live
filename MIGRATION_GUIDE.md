# How to Apply the Event Request Chat Fix Migration

This guide explains how to apply the database migration to fix event request chat functionality.

## Option 1: Via Supabase Dashboard (Recommended - Easiest)

### Step 1: Open Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your **Qtalent** project

### Step 2: Open SQL Editor

1. In the left sidebar, click on **"SQL Editor"**
2. Click **"New query"** button (top right)

### Step 3: Copy and Paste the Migration

1. Open the file: `supabase/migrations/20250116000000_fix_event_request_chat.sql`
2. Copy **ALL** the SQL code from the file
3. Paste it into the SQL Editor in Supabase

### Step 4: Run the Migration

1. Click the **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
2. Wait for the query to complete
3. You should see a success message: "Success. No rows returned"

### Step 5: Verify the Migration

1. Check that all functions were created/updated:
   - `get_admin_user_id()`
   - `create_notification_for_new_message()`
   - `send_message_email_notification()`
2. Check that triggers were created:
   - `on_new_message_create_notification`
   - `on_new_message_send_email`

**Done!** The migration has been applied successfully.

---

## Option 2: Via Supabase CLI (For Developers)

### Prerequisites

1. Install Supabase CLI if you haven't already:

   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:

   ```bash
   supabase login
   ```

3. Link your project (if not already linked):
   ```bash
   cd qtalent-live
   supabase link --project-ref your-project-ref
   ```
   (You can find your project ref in the Supabase dashboard URL or settings)

### Apply the Migration

1. Navigate to your project directory:

   ```bash
   cd qtalent-live
   ```

2. Push the migration to your Supabase project:

   ```bash
   supabase db push
   ```

   Or if you want to apply a specific migration:

   ```bash
   supabase migration up
   ```

3. Verify the migration was applied:
   ```bash
   supabase migration list
   ```

**Done!** The migration has been applied successfully.

---

## Troubleshooting

### Error: "function already exists"

- This is normal! The migration uses `CREATE OR REPLACE FUNCTION`, so it will update existing functions.
- You can safely ignore this or continue.

### Error: "policy already exists"

- The migration drops existing policies before creating new ones, so this shouldn't happen.
- If you see this error, the migration may have already been partially applied.

### Error: "permission denied"

- Make sure you're using an account with admin privileges in Supabase.
- The migration uses `SECURITY DEFINER` which requires elevated permissions.

### Error: "relation does not exist"

- Make sure all required tables exist:
  - `admin_users`
  - `event_requests`
  - `chat_messages`
  - `talent_profiles`
  - `bookings`
  - `notifications`
  - `admin_settings`

### Check Migration Status

You can verify the migration was applied by running this query in the SQL Editor:

```sql
-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_admin_user_id',
  'create_notification_for_new_message',
  'send_message_email_notification'
);

-- Check if triggers exist
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
  'on_new_message_create_notification',
  'on_new_message_send_email'
);
```

---

## After Applying the Migration

1. **Test the functionality:**

   - Booker: Try sending a message via "Chat with QTalent Team" button
   - Check admin email (`qtalentslive@gmail.com`) for notification
   - Admin: Reply from admin panel
   - Talent (Pro): Send message via "Chat with Booker" button

2. **Monitor for errors:**

   - Check Supabase logs for any errors
   - Check browser console for any client-side errors
   - Verify email notifications are being sent

3. **Verify email notifications:**
   - Make sure `service_role_key` is set in `admin_settings` table
   - Check that email edge functions are deployed and working

---

## Need Help?

If you encounter any issues:

1. Check the Supabase logs in the Dashboard
2. Verify all required tables and columns exist
3. Make sure you have the correct permissions
4. Check that the edge functions (`send-notification-email`, `send-email`) are deployed
