# Database Setup Guide

## 🚨 **CRITICAL: You must set up the database first!**

The authentication system won't work properly until you run the SQL scripts in your Supabase database.

## Step 1: Access Your Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project

## Step 2: Open the SQL Editor

1. In your Supabase dashboard, click on **"SQL Editor"** in the left sidebar
2. Click **"New Query"** to create a new SQL script

## Step 3: Run the Database Scripts

### Option A: Quick Fix (Recommended)

If you're getting RLS policy errors, run this single script:

**Run `scripts/006_fix_rls_policies.sql`** - This fixes the infinite recursion error and sets up all tables properly.

### Option B: Complete Reset (If Option A doesn't work)

If you want to start completely fresh:

**Run `scripts/000_reset_database.sql`** - This will delete everything and recreate it properly.

### Option C: Original Scripts (If you prefer step-by-step)

Run these scripts **in order** (one at a time):

1. `scripts/001_create_database_schema.sql`
2. `scripts/002_create_profile_trigger.sql`
3. `scripts/003_add_lessons_and_points_schema.sql`
4. `scripts/004_enhanced_activity_system.sql`
5. `scripts/005_notifications_and_invites.sql`
6. `scripts/006_fix_rls_policies.sql` (to fix any RLS issues)

## Step 4: Verify Tables Were Created

After running all scripts, check that these tables exist:

- `profiles`
- `courses`
- `activities`
- `enrollments`
- `student_progress`
- `lessons`
- `notifications`
- `invite_links`

## Step 5: Test the Setup

1. Try creating a new account
2. Check that the user appears in the `profiles` table with the correct role
3. Verify you can log in and access the appropriate dashboard

## Troubleshooting

### If you get permission errors:

- Make sure you're using the **service role key** in your environment variables
- Check that RLS policies are enabled

### If tables don't appear:

- Refresh your Supabase dashboard
- Check the SQL Editor for any error messages
- Make sure you ran the scripts in the correct order

### If signup still creates students:

- Check the browser console for errors
- Verify the `profiles` table exists
- Check that the trigger was created successfully

## Quick Fix Script

If you want to run everything at once, here's a combined script:

```sql
-- Run this in your Supabase SQL Editor
-- (This combines all the individual scripts)

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')) DEFAULT 'teacher',
  school_name TEXT,
  grade_level TEXT,
  subject_area TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'teacher')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 5. Create other essential tables
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  learning_objectives TEXT[],
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create policies for courses
CREATE POLICY "Teachers can view own courses" ON public.courses
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create courses" ON public.courses
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own courses" ON public.courses
  FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own courses" ON public.courses
  FOR DELETE USING (auth.uid() = teacher_id);
```

## After Setup

Once you've run the database scripts:

1. **Restart your development server**
2. **Create a new account** - it should now work correctly
3. **Check the profiles table** in Supabase to verify the role is set correctly

The authentication system should now work properly! 🎉
