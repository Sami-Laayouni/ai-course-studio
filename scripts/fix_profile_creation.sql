-- Fix Profile Creation Issues
-- Run this in your Supabase SQL Editor
-- This ensures the trigger and RLS policies are set up correctly

-- 1. Ensure the trigger function exists and is correct
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, school_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'teacher'),
    COALESCE(NEW.raw_user_meta_data ->> 'school_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    school_name = COALESCE(EXCLUDED.school_name, profiles.school_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- 2. Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Ensure RLS policies exist (these are for reading/updating, not creating)
-- The trigger uses SECURITY DEFINER so it bypasses RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Optional: Allow users to insert their own profile as a backup
-- (The trigger should handle this, but this is a fallback)
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'Profile creation setup complete!';
  RAISE NOTICE 'Trigger: on_auth_user_created';
  RAISE NOTICE 'Function: handle_new_user()';
  RAISE NOTICE 'RLS policies: Users can view, update, and insert their own profile';
END $$;

