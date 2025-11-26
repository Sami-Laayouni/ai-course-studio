-- Fix infinite recursion in courses RLS policies
-- Run this script in your Supabase SQL Editor

-- IMPORTANT: This script fixes the infinite recursion by removing circular dependencies
-- between courses and enrollments policies

-- Step 1: Drop all existing courses policies to start fresh
DROP POLICY IF EXISTS "Teachers can view their own courses" ON public.courses;
DROP POLICY IF EXISTS "Students can view published courses they're enrolled in" ON public.courses;
DROP POLICY IF EXISTS "Teachers can manage their own courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can view own courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can create courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can update own courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can delete own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can view courses" ON public.courses;
DROP POLICY IF EXISTS "Students can view enrolled published courses" ON public.courses;

-- Step 2: Fix enrollments policies to prevent circular dependency
-- Drop enrollments policies that reference courses
DROP POLICY IF EXISTS "Teachers can view enrollments in their courses" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can view enrollments for their courses" ON public.enrollments;

-- Step 3: Create non-recursive courses policies
-- SELECT: Teachers can view their own courses
CREATE POLICY "Teachers can view own courses" ON public.courses
  FOR SELECT USING (auth.uid() = teacher_id);

-- SELECT: Students can view published courses (simplified - no enrollments check to avoid recursion)
-- Note: Enrollment check should be done at application level or through a separate view
CREATE POLICY "Students can view published courses" ON public.courses
  FOR SELECT USING (is_published = TRUE);

-- INSERT: Teachers can create courses (simplified - no profile check to avoid recursion)
CREATE POLICY "Teachers can create courses" ON public.courses
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = teacher_id
  );

-- UPDATE: Teachers can update their own courses
CREATE POLICY "Teachers can update own courses" ON public.courses
  FOR UPDATE USING (auth.uid() = teacher_id);

-- DELETE: Teachers can delete their own courses
CREATE POLICY "Teachers can delete own courses" ON public.courses
  FOR DELETE USING (auth.uid() = teacher_id);

-- Step 4: Recreate enrollments policies without circular dependency
-- NOTE: We cannot check courses table from enrollments policies as it causes recursion
-- Teachers will need to query enrollments through a different method (e.g., service role or function)

-- Students can view their own enrollments (no courses check to avoid recursion)
CREATE POLICY "Students can view own enrollments" ON public.enrollments
  FOR SELECT USING (auth.uid() = student_id);

-- Students can create their own enrollments
CREATE POLICY "Students can create enrollments" ON public.enrollments
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can update their own enrollments
CREATE POLICY "Students can update own enrollments" ON public.enrollments
  FOR UPDATE USING (auth.uid() = student_id);

