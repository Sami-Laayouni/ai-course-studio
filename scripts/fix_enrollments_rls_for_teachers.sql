-- Fix RLS policies to allow teachers to view enrollments for their courses
-- This is necessary so teachers can see enrolled students
-- 
-- IMPORTANT: Run this script in your Supabase SQL Editor

-- Step 1: Drop existing policies that might block teachers
DROP POLICY IF EXISTS "Teachers can view enrollments for their courses" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can view enrollments in their courses" ON public.enrollments;

-- Step 2: Create policy that allows teachers to view enrollments for their courses
-- This uses EXISTS to check if the course belongs to the teacher
CREATE POLICY "Teachers can view enrollments for their courses" ON public.enrollments
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = enrollments.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

-- Step 3: Also fix course_enrollments table if it exists
-- Check if the table exists before creating policy
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'course_enrollments'
  ) THEN
    DROP POLICY IF EXISTS "Teachers can view enrollments for their courses" ON public.course_enrollments;

    CREATE POLICY "Teachers can view enrollments for their courses" ON public.course_enrollments
      FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.courses 
          WHERE courses.id = course_enrollments.course_id 
          AND courses.teacher_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Note: These policies allow teachers to SELECT enrollments where the course
-- belongs to them. This is safe because:
-- 1. Teachers can only see enrollments for courses they own
-- 2. The course_id is checked against the courses table
-- 3. This is necessary for teachers to manage their students
-- 4. The EXISTS clause prevents recursion issues

