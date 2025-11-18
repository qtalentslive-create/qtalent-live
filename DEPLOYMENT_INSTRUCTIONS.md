# Deployment Instructions for Event Request Email Fixes

## What This Fixes
- ✅ Admin emails for event requests (indirect bookings) will now send to qtalentslive@gmail.com
- ✅ Matching talents will receive email notifications when event requests match their profile
- ✅ Push notifications for event requests (already working, but improved error handling)

---

## 🚀 QUICK START: Use Supabase Dashboard (No CLI Required)

### Step 1: Apply Database Migration via Dashboard

1. **Go to Supabase Dashboard:**
   - Open: https://supabase.com/dashboard/project/myxizupccweukrxfdqmc
   - Login if needed

2. **Navigate to SQL Editor:**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query** button

3. **Copy and Run Migration:**
   - Open the file: `supabase/migrations/20250115000000_fix_event_request_notifications.sql`
   - Copy **ALL** the SQL code (Ctrl+A, then Ctrl+C)
   - Paste into the SQL Editor (Ctrl+V)
   - Click **Run** button (or press Ctrl+Enter)
   - Wait for "Success" message

### Step 2: Deploy Edge Functions via Dashboard

1. **Deploy send-notification-email:**
   - Go to **Edge Functions** in left sidebar
   - Find `send-notification-email` function
   - Click the **three dots (⋮)** menu
   - Click **Edit Function**
   - The code should already be updated in your local files
   - Click **Deploy** (or use CLI method below)

2. **Deploy send-email:**
   - Same process for `send-email` function

**OR use the CLI method below if you install it:**

---

## 📦 Option: Install Supabase CLI (For Future Use)

### Windows Installation:

**Method 1: Using npm (if you have Node.js):**
```bash
npm install -g supabase
```

**Method 2: Using Scoop (recommended for Windows):**
```bash
# First install Scoop if you don't have it:
# Open PowerShell as Administrator and run:
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Then install Supabase CLI:
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Method 3: Download Binary:**
1. Go to: https://github.com/supabase/cli/releases
2. Download `supabase_windows_amd64.zip`
3. Extract and add to your PATH

### After Installation:

1. **Login to Supabase:**
   ```bash
   supabase login
   ```
   (This will open browser for authentication)

2. **Link to your project:**
   ```bash
   cd qtalent-live
   supabase link --project-ref myxizupccweukrxfdqmc
   ```

3. **Apply migration:**
   ```bash
   supabase db push
   ```

4. **Deploy functions:**
   ```bash
   supabase functions deploy send-notification-email
   supabase functions deploy send-email
   ```

---

## ✅ Verification Steps

### Test After Deployment:

1. **Submit a test event request:**
   - Go to `/your-event` page
   - Fill out and submit an event request form

2. **Check emails:**
   - Check `qtalentslive@gmail.com` inbox for admin notification
   - Check matching talent's email for notification

3. **Check function logs (if using CLI):**
   ```bash
   supabase functions logs send-notification-email
   supabase functions logs send-email
   ```

---

## 🔧 Troubleshooting

### Migration Fails:
- Check SQL Editor for error messages
- Verify you copied the ENTIRE migration file
- Check that `admin_settings` table exists with `service_role_key`

### Functions Not Deploying via Dashboard:
- Make sure you're editing the correct function
- Check that the code changes are saved in your local files first
- You may need to use CLI method if dashboard deployment doesn't work

### To Check Migration Status:
- Go to Database → Migrations in Supabase Dashboard
- You should see `20250115000000_fix_event_request_notifications` listed

---

## 📝 What Changed

### Database Function (`send_event_request_email_notification`):
- ✅ Changed `emailType` from `'admin'` to `'admin_new_event_request'` (fixes admin emails)
- ✅ Added logic to find matching talents by location and talent type
- ✅ Added email notifications to matching talents using `'event_request_talent_match'` type

### Edge Functions:
- ✅ `send-notification-email`: Added backward compatibility for `'admin'` emailType
- ✅ `send-notification-email`: Added support for `'event_request_talent_match'` emailType  
- ✅ `send-email`: Added email template for `'event_request_talent_match'`
- ✅ `send-email`: Added support for `'admin_new_event_request'` emailType

---

## ⚠️ Important Notes

- **Direct bookings already work** - no changes needed there
- **Only event requests (indirect bookings) are being fixed**
- The migration updates the database function that triggers on new event requests
- The function deployments update the email sending logic
