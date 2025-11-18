# Step-by-Step Deployment Guide

## 📍 Step 1: Find the Migration File

The file is located at:
```
C:\Users\tonys\Documents\qtalent\qtalent-live\supabase\migrations\20250115000000_fix_event_request_notifications.sql
```

**How to open it:**
1. Open **File Explorer** (Windows key + E)
2. Navigate to: `C:\Users\tonys\Documents\qtalent\qtalent-live\supabase\migrations\`
3. Find the file: `20250115000000_fix_event_request_notifications.sql`
4. **Right-click** on it → **Open with** → **Notepad** (or any text editor)

---

## 📋 Step 2: Copy the SQL Code

1. In Notepad, press **Ctrl+A** (select all)
2. Press **Ctrl+C** (copy)
3. You should have copied all 112 lines of SQL code

---

## 🌐 Step 3: Go to Supabase Dashboard

1. Open your browser
2. Go to: **https://supabase.com/dashboard/project/myxizupccweukrxfdqmc**
3. Login if needed

---

## 📝 Step 4: Open SQL Editor

1. In the **left sidebar**, look for **"SQL Editor"** (it has a database icon)
2. Click on **"SQL Editor"**
3. You should see a page with SQL query editor

---

## ✏️ Step 5: Paste and Run the SQL

1. Click the **"New Query"** button (usually at the top)
2. You'll see a blank text area/editor
3. **Paste** the SQL code you copied (Ctrl+V)
4. You should see all the SQL code in the editor
5. Click the **"Run"** button (usually green, at the bottom right)
   - OR press **Ctrl+Enter** (Windows) or **Cmd+Enter** (Mac)
6. Wait for the success message: "Success. No rows returned"

---

## ✅ Step 6: Verify It Worked

After clicking "Run", you should see:
- ✅ **Success message** at the bottom
- ✅ No error messages in red

If you see errors, let me know what they say!

---

## 📧 Step 7: Deploy Edge Functions (Optional - Can Do Later)

The functions need to be updated too. You can either:

**Option A: Install Supabase CLI** (recommended for future)
**Option B: Update manually in dashboard** (more work but no CLI needed)

For now, the **migration is the most important part**. After running it, test by submitting an event request and checking if admin emails work!

---

## 🧪 Step 8: Test It

1. Go to your app: `/your-event` page
2. Submit a test event request
3. Check `qtalentslive@gmail.com` - you should receive an email!

---

## ❓ Troubleshooting

**If you can't find the file:**
- Make sure you're in: `C:\Users\tonys\Documents\qtalent\qtalent-live\supabase\migrations\`
- The file name is: `20250115000000_fix_event_request_notifications.sql`

**If SQL Editor looks different:**
- Look for a text area/box where you can type SQL
- It might say "Query" or "SQL Query" at the top
- There should be a "Run" button somewhere

**If you get an error:**
- Copy the error message and let me know
- Common issues: missing table, permission errors

