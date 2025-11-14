-- Review Activity and Analytics Schema
-- Supports review activities, misconception tracking, and real-time analytics

-- Review responses table
CREATE TABLE IF NOT EXISTS review_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    review_type TEXT NOT NULL CHECK (review_type IN ('flashcards', 'teacher_review')),
    responses JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(activity_id, node_id, student_id)
);

-- Student misconceptions table
CREATE TABLE IF NOT EXISTS student_misconceptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    concept TEXT NOT NULL,
    misconception_description TEXT NOT NULL,
    evidence JSONB DEFAULT '{}', -- Student responses that show the misconception
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    ai_analysis JSONB DEFAULT '{}'
);

-- Real-time analytics tracking
CREATE TABLE IF NOT EXISTS real_time_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    performance_data JSONB NOT NULL DEFAULT '{}', -- Score, time, attempts, etc.
    strengths_identified TEXT[] DEFAULT '{}',
    weaknesses_identified TEXT[] DEFAULT '{}',
    concepts_addressed TEXT[] DEFAULT '{}',
    adaptation_suggestions JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Concept mastery tracking
CREATE TABLE IF NOT EXISTS concept_mastery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    concept TEXT NOT NULL,
    mastery_level DECIMAL(3,2) CHECK (mastery_level >= 0 AND mastery_level <= 1) DEFAULT 0,
    evidence_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, activity_id, concept)
);

-- Common struggles aggregation (for teacher dashboard)
CREATE TABLE IF NOT EXISTS common_struggles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    concept TEXT NOT NULL,
    struggling_student_count INTEGER DEFAULT 0,
    total_student_count INTEGER DEFAULT 0,
    common_misconceptions TEXT[] DEFAULT '{}',
    recommended_interventions TEXT[] DEFAULT '{}',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(activity_id, concept)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_responses_student ON review_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_activity ON review_responses(activity_id);
CREATE INDEX IF NOT EXISTS idx_misconceptions_student ON student_misconceptions(student_id);
CREATE INDEX IF NOT EXISTS idx_misconceptions_activity ON student_misconceptions(activity_id);
CREATE INDEX IF NOT EXISTS idx_analytics_student ON real_time_analytics(student_id);
CREATE INDEX IF NOT EXISTS idx_analytics_activity ON real_time_analytics(activity_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_student ON concept_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_common_struggles_activity ON common_struggles(activity_id);

-- Enable RLS
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_misconceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_time_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_struggles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_responses
DROP POLICY IF EXISTS "Students can view their own review responses" ON review_responses;
CREATE POLICY "Students can view their own review responses" ON review_responses
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert their own review responses" ON review_responses;
CREATE POLICY "Students can insert their own review responses" ON review_responses
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view review responses for their activities" ON review_responses;
CREATE POLICY "Teachers can view review responses for their activities" ON review_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = review_responses.activity_id
      AND c.teacher_id = auth.uid()
    )
  );

-- RLS Policies for student_misconceptions
DROP POLICY IF EXISTS "Students can view their own misconceptions" ON student_misconceptions;
CREATE POLICY "Students can view their own misconceptions" ON student_misconceptions
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert their own misconceptions" ON student_misconceptions;
CREATE POLICY "Students can insert their own misconceptions" ON student_misconceptions
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view misconceptions for their students" ON student_misconceptions;
CREATE POLICY "Teachers can view misconceptions for their students" ON student_misconceptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = student_misconceptions.activity_id
      AND c.teacher_id = auth.uid()
    )
  );

-- RLS Policies for real_time_analytics
DROP POLICY IF EXISTS "Students can view their own analytics" ON real_time_analytics;
CREATE POLICY "Students can view their own analytics" ON real_time_analytics
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view analytics for their students" ON real_time_analytics;
CREATE POLICY "Teachers can view analytics for their students" ON real_time_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = real_time_analytics.activity_id
      AND c.teacher_id = auth.uid()
    )
  );

-- RLS Policies for concept_mastery
DROP POLICY IF EXISTS "Students can view their own concept mastery" ON concept_mastery;
CREATE POLICY "Students can view their own concept mastery" ON concept_mastery
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view concept mastery for their students" ON concept_mastery;
CREATE POLICY "Teachers can view concept mastery for their students" ON concept_mastery
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = concept_mastery.activity_id
      AND c.teacher_id = auth.uid()
    )
  );

-- RLS Policies for common_struggles
DROP POLICY IF EXISTS "Teachers can view common struggles for their activities" ON common_struggles;
CREATE POLICY "Teachers can view common struggles for their activities" ON common_struggles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = common_struggles.activity_id
      AND c.teacher_id = auth.uid()
    )
  );

