-- Fix RLS policies to allow teachers to view student profiles
-- This is necessary so teachers can see student names and emails
-- 
-- IMPORTANT: Run this script in your Supabase SQL Editor

-- Step 1: Drop existing policies that might block teachers
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view profiles for their courses" ON public.profiles;

-- Step 2: Create policy that allows teachers to view profiles of students enrolled in their courses
-- This uses EXISTS to check if the student is enrolled in a course taught by the teacher
CREATE POLICY "Teachers can view student profiles" ON public.profiles
  FOR SELECT 
  USING (
    -- Allow users to view their own profile
    auth.uid() = id
    OR
    -- Allow teachers to view profiles of students enrolled in their courses
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.student_id = profiles.id
      AND c.teacher_id = auth.uid()
    )
  );

-- Note: This policy allows teachers to SELECT profiles where:
-- 1. The profile belongs to them (their own profile)
-- 2. The profile belongs to a student enrolled in a course they teach
-- This is safe because:
-- 1. Teachers can only see profiles of students in their courses
-- 2. The enrollment is checked against the courses table
-- 3. This is necessary for teachers to manage their students

