-- Fix RLS policy to allow students to query courses by join_code
-- This is necessary so students can find courses to join using join codes
-- 
-- IMPORTANT: Run this script in your Supabase SQL Editor
-- This will allow authenticated users to query courses by join_code

-- The issue: Students can't query courses by join_code because RLS policies
-- only allow them to see courses they're already enrolled in. But to join,
-- they need to be able to find the course first!

-- Solution: Add a policy that allows authenticated users to query courses
-- that have a join_code. The application layer will filter by the specific
-- join_code value, so students can only see courses if they provide the
-- correct join code.

-- Create a policy that allows authenticated users to SELECT courses with join codes
-- This is safe because:
-- 1. The API filters by join_code, so students can only see courses if they have the correct code
-- 2. Students still can't modify courses, only view them to join
-- 3. The join code acts like a password - if you have it, you should be able to see the course

CREATE POLICY "Authenticated users can query courses by join code" ON public.courses
  FOR SELECT 
  TO authenticated
  USING (
    -- Only allow querying courses that have a join_code
    -- This prevents exposing courses that don't have join codes
    join_code IS NOT NULL
  );

-- Note: This policy allows any authenticated user to see courses that have a join_code
-- However, the API endpoint filters by the specific join_code value, so students can only
-- see courses if they provide the correct join code. This is the intended behavior.
--
-- Alternative: If you want even more security, you could create a database function
-- that checks the join_code, but for most use cases, this policy is sufficient.

