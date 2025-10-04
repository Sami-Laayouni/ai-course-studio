-- Add context sources table for storing PDF and YouTube video context
CREATE TABLE IF NOT EXISTS context_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('pdf', 'youtube')),
  title VARCHAR(255) NOT NULL,
  url TEXT,
  filename VARCHAR(255),
  summary TEXT,
  key_points TEXT[],
  key_concepts TEXT[],
  learning_objectives TEXT[],
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_context_sources_course_id ON context_sources(course_id);
CREATE INDEX IF NOT EXISTS idx_context_sources_type ON context_sources(type);
CREATE INDEX IF NOT EXISTS idx_context_sources_created_by ON context_sources(created_by);

-- Enable RLS
ALTER TABLE context_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for context_sources
CREATE POLICY "Users can view context sources for courses they're enrolled in" ON context_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_enrollments ce 
      WHERE ce.course_id = context_sources.course_id 
      AND ce.student_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM courses c 
      WHERE c.id = context_sources.course_id 
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert context sources for their courses" ON context_sources
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c 
      WHERE c.id = context_sources.course_id 
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update context sources for their courses" ON context_sources
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM courses c 
      WHERE c.id = context_sources.course_id 
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete context sources for their courses" ON context_sources
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM courses c 
      WHERE c.id = context_sources.course_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_context_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_context_sources_updated_at
  BEFORE UPDATE ON context_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_context_sources_updated_at();
