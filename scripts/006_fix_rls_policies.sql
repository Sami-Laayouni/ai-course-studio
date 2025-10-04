-- Fix RLS policies to prevent infinite recursion
-- Run this script in your Supabase SQL Editor

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Teachers can view own courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can create courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can update own courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can delete own courses" ON public.courses;

-- Create simplified, non-recursive policies
CREATE POLICY "Users can view courses" ON public.courses
  FOR SELECT USING (true);

CREATE POLICY "Teachers can create courses" ON public.courses
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers can update own courses" ON public.courses
  FOR UPDATE USING (
    auth.uid() = teacher_id AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers can delete own courses" ON public.courses
  FOR DELETE USING (
    auth.uid() = teacher_id AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Fix profiles policies as well
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create activities table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('quiz', 'assignment', 'reading', 'video', 'interactive', 'ai_chat', 'collaborative')),
  content JSONB NOT NULL DEFAULT '{}',
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5) DEFAULT 3,
  estimated_duration INTEGER, -- in minutes
  order_index INTEGER NOT NULL DEFAULT 0,
  is_adaptive BOOLEAN DEFAULT TRUE,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create activities policies
CREATE POLICY "Users can view activities" ON public.activities
  FOR SELECT USING (true);

CREATE POLICY "Teachers can create activities" ON public.activities
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = course_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update activities" ON public.activities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = course_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete activities" ON public.activities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = course_id AND teacher_id = auth.uid()
    )
  );

-- Create enrollments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress_percentage INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- Enable RLS on enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Create enrollments policies
CREATE POLICY "Users can view own enrollments" ON public.enrollments
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can enroll in courses" ON public.enrollments
  FOR INSERT WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'student'
    )
  );

CREATE POLICY "Students can update own enrollments" ON public.enrollments
  FOR UPDATE USING (auth.uid() = student_id);

-- Create student_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')) DEFAULT 'not_started',
  score INTEGER,
  time_spent INTEGER, -- in minutes
  attempts INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, activity_id)
);

-- Enable RLS on student_progress
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

-- Create student_progress policies
CREATE POLICY "Users can view own progress" ON public.student_progress
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can create progress" ON public.student_progress
  FOR INSERT WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'student'
    )
  );

CREATE POLICY "Students can update own progress" ON public.student_progress
  FOR UPDATE USING (auth.uid() = student_id);

-- Create lessons table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  learning_objectives TEXT[],
  content JSONB DEFAULT '{}',
  estimated_duration INTEGER, -- in minutes
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Create lessons policies
CREATE POLICY "Users can view lessons" ON public.lessons
  FOR SELECT USING (true);

CREATE POLICY "Teachers can create lessons" ON public.lessons
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = course_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update lessons" ON public.lessons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = course_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete lessons" ON public.lessons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = course_id AND teacher_id = auth.uid()
    )
  );
