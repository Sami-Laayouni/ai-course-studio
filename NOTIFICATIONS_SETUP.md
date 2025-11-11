# Notifications Setup Instructions

## Problem
The `notifications` table doesn't exist in your Supabase database, causing errors when trying to fetch notifications.

## Solution
Run the SQL migration script to create the notifications table.

### Steps:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Migration Script**
   - Copy the contents of `scripts/create_notifications_table.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

3. **Verify the Table was Created**
   - Go to the Table Editor in Supabase
   - You should see a `notifications` table with the following columns:
     - `id` (UUID, primary key)
     - `user_id` (UUID, references auth.users)
     - `type` (VARCHAR)
     - `title` (VARCHAR)
     - `message` (TEXT)
     - `data` (JSONB)
     - `is_read` (BOOLEAN)
     - `priority` (VARCHAR)
     - `created_at` (TIMESTAMP)
     - `read_at` (TIMESTAMP)

4. **Test the Notifications**
   - After running the migration, refresh your `/learn` page
   - The notification bell should now work without errors
   - When a teacher creates a new activity, students should receive notifications

## Alternative: Run via Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db reset
# or
supabase migration up
```

Then run the SQL script from `scripts/create_notifications_table.sql`



