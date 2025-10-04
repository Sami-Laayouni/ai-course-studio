-- Create user profiles table that extends auth.users
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

-- Create courses table
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

-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('quiz', 'assignment', 'reading', 'video', 'interactive')),
  content JSONB NOT NULL DEFAULT '{}',
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5) DEFAULT 3,
  estimated_duration INTEGER, -- in minutes
  order_index INTEGER NOT NULL DEFAULT 0,
  is_adaptive BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  UNIQUE(student_id, course_id)
);

-- Create student progress table
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'needs_review')) DEFAULT 'not_started',
  score DECIMAL(5,2),
  attempts INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0, -- in seconds
  responses JSONB DEFAULT '{}',
  feedback JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, activity_id)
);

-- Create AI content generation history table
CREATE TABLE IF NOT EXISTS public.ai_content_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  generated_content JSONB NOT NULL,
  content_type TEXT NOT NULL,
  model_used TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create learning analytics table
CREATE TABLE IF NOT EXISTS public.learning_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_content_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for courses
CREATE POLICY "Teachers can view their own courses" ON public.courses
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view published courses they're enrolled in" ON public.courses
  FOR SELECT USING (
    is_published = TRUE AND 
    EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE enrollments.course_id = courses.id 
      AND enrollments.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage their own courses" ON public.courses
  FOR ALL USING (auth.uid() = teacher_id);

-- RLS Policies for activities
CREATE POLICY "Teachers can manage activities in their courses" ON public.activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = activities.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view activities in enrolled courses" ON public.activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.student_id = auth.uid() 
      AND c.id = activities.course_id
      AND c.is_published = TRUE
    )
  );

-- RLS Policies for enrollments
CREATE POLICY "Students can view their own enrollments" ON public.enrollments
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view enrollments in their courses" ON public.enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = enrollments.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

-- RLS Policies for student progress
CREATE POLICY "Students can manage their own progress" ON public.student_progress
  FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view progress in their courses" ON public.student_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = student_progress.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

-- RLS Policies for AI content history
CREATE POLICY "Teachers can view their own AI content history" ON public.ai_content_history
  FOR ALL USING (auth.uid() = teacher_id);

-- RLS Policies for learning analytics
CREATE POLICY "Students can view their own analytics" ON public.learning_analytics
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view analytics for their courses" ON public.learning_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = learning_analytics.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON public.courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_activities_course_id ON public.activities(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON public.student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_activity_id ON public.student_progress(activity_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_student_id ON public.learning_analytics(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_course_id ON public.learning_analytics(course_id);
