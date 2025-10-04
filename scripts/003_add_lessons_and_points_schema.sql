-- Add lessons table for structured lesson planning
CREATE TABLE IF NOT EXISTS lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  learning_objectives TEXT[] DEFAULT '{}',
  lesson_goal TEXT,
  content_source_type VARCHAR(50), -- 'upload', 'url', 'manual'
  content_source_data JSONB, -- stores file info, URL, or manual content
  ai_generated_plan JSONB, -- stores AI-generated lesson plan
  order_index INTEGER DEFAULT 0,
  estimated_duration INTEGER, -- in minutes
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add points system to activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;

-- Add student points tracking
CREATE TABLE IF NOT EXISTS student_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL DEFAULT 0,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, activity_id)
);

-- Add AI chat sessions for personalized learning
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  learning_objectives TEXT[] DEFAULT '{}',
  chat_history JSONB DEFAULT '[]',
  concepts_mastered TEXT[] DEFAULT '{}',
  concepts_struggling TEXT[] DEFAULT '{}',
  session_status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'paused'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_messages INTEGER DEFAULT 0
);

-- Add learning objective progress tracking
CREATE TABLE IF NOT EXISTS learning_objective_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  learning_objective TEXT NOT NULL,
  mastery_level INTEGER DEFAULT 0, -- 0-100 percentage
  attempts INTEGER DEFAULT 0,
  last_assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, course_id, lesson_id, learning_objective)
);

-- Add leaderboard view
CREATE OR REPLACE VIEW course_leaderboard AS
SELECT 
  sp.course_id,
  sp.student_id,
  p.full_name,
  p.email,
  SUM(sp.points_earned) as total_points,
  COUNT(DISTINCT sp.activity_id) as activities_completed,
  COUNT(DISTINCT sp.lesson_id) as lessons_completed,
  MAX(sp.earned_at) as last_activity_at,
  ROW_NUMBER() OVER (PARTITION BY sp.course_id ORDER BY SUM(sp.points_earned) DESC) as rank
FROM student_points sp
JOIN profiles p ON sp.student_id = p.id
GROUP BY sp.course_id, sp.student_id, p.full_name, p.email;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_student_points_student_course ON student_points(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_student_points_course ON student_points(course_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_student ON ai_chat_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_activity ON ai_chat_sessions(activity_id);
CREATE INDEX IF NOT EXISTS idx_learning_objective_progress_student_course ON learning_objective_progress(student_id, course_id);

-- Enable RLS
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_objective_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lessons
CREATE POLICY "Teachers can manage their course lessons" ON lessons
  FOR ALL USING (
    course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view published lessons in enrolled courses" ON lessons
  FOR SELECT USING (
    is_published = true AND
    course_id IN (
      SELECT course_id FROM enrollments WHERE student_id = auth.uid()
    )
  );

-- RLS Policies for student_points
CREATE POLICY "Students can view their own points" ON student_points
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view points for their courses" ON student_points
  FOR SELECT USING (
    course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "System can insert points" ON student_points
  FOR INSERT WITH CHECK (true);

-- RLS Policies for ai_chat_sessions
CREATE POLICY "Students can manage their own chat sessions" ON ai_chat_sessions
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view chat sessions for their courses" ON ai_chat_sessions
  FOR SELECT USING (
    activity_id IN (
      SELECT a.id FROM activities a
      JOIN courses c ON a.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- RLS Policies for learning_objective_progress
CREATE POLICY "Students can view their own progress" ON learning_objective_progress
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view progress for their courses" ON learning_objective_progress
  FOR SELECT USING (
    course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "System can manage progress" ON learning_objective_progress
  FOR ALL WITH CHECK (true);
