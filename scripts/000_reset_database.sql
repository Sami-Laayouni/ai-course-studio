-- COMPLETE DATABASE RESET SCRIPT
-- WARNING: This will delete ALL data in your database!
-- Only run this if you want to start completely fresh

-- Drop all policies first
DROP POLICY IF EXISTS "Users can view courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can create courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can update own courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can delete own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view activities" ON public.activities;
DROP POLICY IF EXISTS "Teachers can create activities" ON public.activities;
DROP POLICY IF EXISTS "Teachers can update activities" ON public.activities;
DROP POLICY IF EXISTS "Teachers can delete activities" ON public.activities;
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Students can enroll in courses" ON public.enrollments;
DROP POLICY IF EXISTS "Students can update own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can view own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Students can create progress" ON public.student_progress;
DROP POLICY IF EXISTS "Students can update own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Users can view lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can create lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can update lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can delete lessons" ON public.lessons;

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS public.student_progress CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Now recreate everything from scratch
-- 1. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')) DEFAULT 'teacher',
  school_name TEXT,
  grade_level TEXT,
  subject_area TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create courses table
CREATE TABLE public.courses (
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

-- 3. Create lessons table
CREATE TABLE public.lessons (
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

-- 4. Create activities table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
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

-- 5. Create enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress_percentage INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- 6. Create student_progress table
CREATE TABLE public.student_progress (
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

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

-- Create the profile trigger function
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

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create RLS policies (simplified, non-recursive)
-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Courses policies
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

-- Lessons policies
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

-- Activities policies
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

-- Enrollments policies
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

-- Student progress policies
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
