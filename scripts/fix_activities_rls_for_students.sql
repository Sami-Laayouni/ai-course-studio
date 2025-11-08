-- Fix RLS policy to allow students to view activities in enrolled courses
-- This is necessary so students can see activities even if course isn't published
-- 
-- IMPORTANT: Run this script in your Supabase SQL Editor

-- Step 1: Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view activities" ON public.activities;
DROP POLICY IF EXISTS "Students can view activities in enrolled courses" ON public.activities;

-- Step 2: Create a policy that allows students to view activities in enrolled courses
-- This doesn't require the course to be published - students can see activities if enrolled
CREATE POLICY "Students can view activities in enrolled courses" ON public.activities
  FOR SELECT 
  USING (
    -- Allow if student is enrolled in the course (regardless of publication status)
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = auth.uid() 
      AND e.course_id = activities.course_id
    )
    OR
    -- Allow if user is the teacher of the course
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = activities.course_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Step 3: Keep the teacher policies for create/update/delete
-- Drop existing policies first, then recreate them
DROP POLICY IF EXISTS "Teachers can create activities" ON public.activities;
DROP POLICY IF EXISTS "Teachers can update activities" ON public.activities;
DROP POLICY IF EXISTS "Teachers can delete activities" ON public.activities;

CREATE POLICY "Teachers can create activities" ON public.activities
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = course_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update activities" ON public.activities
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = course_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete activities" ON public.activities
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = course_id AND teacher_id = auth.uid()
    )
  );

-- Note: This policy allows students to SELECT activities where:
-- 1. The student is enrolled in the course (regardless of publication status)
-- 2. OR the user is the teacher of the course
-- This is safe because:
-- 1. Students can only see activities in courses they're enrolled in
-- 2. Teachers can see activities in their own courses
-- 3. This doesn't require the course to be published, which is more flexible

