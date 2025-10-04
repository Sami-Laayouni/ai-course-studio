-- Enhanced activity system with collaborative features and advanced analytics

-- Add new activity types
ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_subtype VARCHAR(50); -- 'youtube', 'pdf', 'ai_chat', 'collaborative', etc.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 1;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS collaboration_settings JSONB DEFAULT '{}';

-- Add activity connections for Zapier-like flow
CREATE TABLE IF NOT EXISTS activity_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  from_activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  to_activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  connection_type VARCHAR(50) DEFAULT 'sequential', -- 'sequential', 'conditional', 'parallel'
  conditions JSONB DEFAULT '{}', -- conditions for conditional connections
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add collaborative activity sessions
CREATE TABLE IF NOT EXISTS collaborative_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  session_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'paused'
  participants JSONB DEFAULT '[]', -- array of student IDs
  session_data JSONB DEFAULT '{}', -- collaborative content, shared state
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Add student participation in collaborative sessions
CREATE TABLE IF NOT EXISTS collaborative_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  contributions JSONB DEFAULT '{}', -- track individual contributions
  UNIQUE(session_id, student_id)
);

-- Add enhanced learning objective tracking
CREATE TABLE IF NOT EXISTS learning_objective_mastery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  learning_objective TEXT NOT NULL,
  mastery_score DECIMAL(5,2) DEFAULT 0.00, -- 0-100
  attempts INTEGER DEFAULT 0,
  time_to_mastery INTEGER DEFAULT 0, -- in minutes
  last_assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mastery_achieved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(student_id, course_id, learning_objective)
);

-- Add activity completion tracking with detailed analytics
CREATE TABLE IF NOT EXISTS activity_completion_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  time_spent INTEGER DEFAULT 0, -- in seconds
  attempts INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  collaboration_score DECIMAL(5,2) DEFAULT 0.00, -- for collaborative activities
  engagement_metrics JSONB DEFAULT '{}', -- clicks, scrolls, interactions
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add AI chat conversation tracking
CREATE TABLE IF NOT EXISTS ai_chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  message_type VARCHAR(50) NOT NULL, -- 'student', 'ai', 'system'
  message_content TEXT NOT NULL,
  learning_objectives_addressed TEXT[] DEFAULT '{}',
  concepts_identified TEXT[] DEFAULT '{}',
  confidence_score DECIMAL(3,2) DEFAULT 0.00, -- AI confidence in response
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add content ingestion tracking
CREATE TABLE IF NOT EXISTS content_ingestion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL, -- 'url', 'file', 'youtube', 'pdf'
  source_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  content_extracted TEXT,
  ai_analysis JSONB DEFAULT '{}',
  processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_connections_lesson ON activity_connections(lesson_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_activity ON collaborative_sessions(activity_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_participants_session ON collaborative_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_objective_mastery_student ON learning_objective_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_completion_analytics_student ON activity_completion_analytics(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_student ON ai_chat_conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_content_ingestion_lesson ON content_ingestion(lesson_id);

-- Enable RLS
ALTER TABLE activity_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_objective_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_completion_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ingestion ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_connections
CREATE POLICY "Teachers can manage connections in their lessons" ON activity_connections
  FOR ALL USING (
    lesson_id IN (
      SELECT l.id FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- RLS Policies for collaborative_sessions
CREATE POLICY "Students can view sessions for their activities" ON collaborative_sessions
  FOR SELECT USING (
    activity_id IN (
      SELECT a.id FROM activities a
      JOIN courses c ON a.course_id = c.id
      JOIN enrollments e ON c.id = e.course_id
      WHERE e.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage sessions for their activities" ON collaborative_sessions
  FOR ALL USING (
    activity_id IN (
      SELECT a.id FROM activities a
      JOIN courses c ON a.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- RLS Policies for collaborative_participants
CREATE POLICY "Students can manage their own participation" ON collaborative_participants
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view participants in their activities" ON collaborative_participants
  FOR SELECT USING (
    session_id IN (
      SELECT cs.id FROM collaborative_sessions cs
      JOIN activities a ON cs.activity_id = a.id
      JOIN courses c ON a.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- RLS Policies for learning_objective_mastery
CREATE POLICY "Students can view their own mastery" ON learning_objective_mastery
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view mastery for their courses" ON learning_objective_mastery
  FOR SELECT USING (
    course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "System can manage mastery" ON learning_objective_mastery
  FOR ALL WITH CHECK (true);

-- RLS Policies for activity_completion_analytics
CREATE POLICY "Students can view their own analytics" ON activity_completion_analytics
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view analytics for their activities" ON activity_completion_analytics
  FOR SELECT USING (
    activity_id IN (
      SELECT a.id FROM activities a
      JOIN courses c ON a.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "System can manage analytics" ON activity_completion_analytics
  FOR ALL WITH CHECK (true);

-- RLS Policies for ai_chat_conversations
CREATE POLICY "Students can view their own conversations" ON ai_chat_conversations
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view conversations for their activities" ON ai_chat_conversations
  FOR SELECT USING (
    activity_id IN (
      SELECT a.id FROM activities a
      JOIN courses c ON a.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "System can manage conversations" ON ai_chat_conversations
  FOR ALL WITH CHECK (true);

-- RLS Policies for content_ingestion
CREATE POLICY "Teachers can manage content ingestion for their lessons" ON content_ingestion
  FOR ALL USING (
    lesson_id IN (
      SELECT l.id FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );
