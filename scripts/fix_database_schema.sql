-- Fix database schema issues
-- Add missing columns to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS join_code TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS estimated_duration INTEGER;

-- Add missing columns to lessons table
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS join_code TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS lesson_goal TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS content_source_type VARCHAR(50);
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS content_source_data JSONB DEFAULT '{}';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS ai_generated_plan JSONB;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Add missing columns to activities table
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS activity_subtype VARCHAR(50);
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS is_adaptive BOOLEAN DEFAULT true;

-- Update existing records to have join codes
UPDATE public.courses 
SET join_code = upper(substring(md5(random()::text) from 1 for 6))
WHERE join_code IS NULL;

UPDATE public.lessons 
SET join_code = upper(substring(md5(random()::text) from 1 for 6))
WHERE join_code IS NULL;

-- Create course_enrollments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- Enable RLS on course_enrollments
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for course_enrollments (drop first if they exist)
DROP POLICY IF EXISTS "Students can view their own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Teachers can view enrollments for their courses" ON course_enrollments;
DROP POLICY IF EXISTS "Students can enroll in courses" ON course_enrollments;

CREATE POLICY "Students can view their own enrollments" ON course_enrollments
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view enrollments for their courses" ON course_enrollments
  FOR SELECT USING (
    course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can enroll in courses" ON course_enrollments
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_join_code ON courses(join_code);
CREATE INDEX IF NOT EXISTS idx_lessons_join_code ON lessons(join_code);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
