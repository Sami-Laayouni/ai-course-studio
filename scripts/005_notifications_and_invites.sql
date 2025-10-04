-- Enhanced notifications and invite system

-- Add notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'assignment', 'lesson', 'invite', 'reminder', 'achievement'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- additional data like course_id, lesson_id, etc.
  is_read BOOLEAN DEFAULT FALSE,
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Add invite links table
CREATE TABLE IF NOT EXISTS invite_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'course', 'lesson', 'activity'
  target_id UUID NOT NULL, -- course_id, lesson_id, or activity_id
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT NULL, -- NULL means unlimited
  uses_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}', -- additional settings like auto_enroll, role, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add invite usage tracking
CREATE TABLE IF NOT EXISTS invite_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_id UUID NOT NULL REFERENCES invite_links(id) ON DELETE CASCADE,
  used_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(invite_id, used_by)
);

-- Add assignment tracking
CREATE TABLE IF NOT EXISTS assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  points INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  assigned_to JSONB DEFAULT '[]', -- array of student IDs or 'all'
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add assignment submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content JSONB DEFAULT '{}', -- submission content
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'graded'
  grade INTEGER, -- 0-100
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_invite_links_code ON invite_links(code);
CREATE INDEX IF NOT EXISTS idx_invite_links_target ON invite_links(type, target_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- RLS Policies for invite_links
CREATE POLICY "Users can view invites they created" ON invite_links
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create invites for their courses" ON invite_links
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    (type = 'course' AND target_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())) OR
    (type = 'lesson' AND target_id IN (SELECT l.id FROM lessons l JOIN courses c ON l.course_id = c.id WHERE c.teacher_id = auth.uid())) OR
    (type = 'activity' AND target_id IN (SELECT a.id FROM activities a JOIN courses c ON a.course_id = c.id WHERE c.teacher_id = auth.uid()))
  );

CREATE POLICY "Users can update their own invites" ON invite_links
  FOR UPDATE USING (created_by = auth.uid());

-- RLS Policies for invite_usage
CREATE POLICY "Users can view their own invite usage" ON invite_usage
  FOR SELECT USING (used_by = auth.uid());

CREATE POLICY "System can manage invite usage" ON invite_usage
  FOR ALL WITH CHECK (true);

-- RLS Policies for assignments
CREATE POLICY "Teachers can manage assignments for their courses" ON assignments
  FOR ALL USING (
    course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
  );

CREATE POLICY "Students can view assignments for their courses" ON assignments
  FOR SELECT USING (
    course_id IN (
      SELECT c.id FROM courses c
      JOIN enrollments e ON c.id = e.course_id
      WHERE e.student_id = auth.uid()
    )
  );

-- RLS Policies for assignment_submissions
CREATE POLICY "Students can manage their own submissions" ON assignment_submissions
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view submissions for their assignments" ON assignment_submissions
  FOR SELECT USING (
    assignment_id IN (
      SELECT a.id FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- Create function to generate invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    -- Generate a random 8-character code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_count FROM invite_links WHERE code = generate_invite_code.code;
    
    -- If code doesn't exist, return it
    IF exists_count = 0 THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to send notifications
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT,
  p_data JSONB DEFAULT '{}',
  p_priority VARCHAR(20) DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data, priority)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_priority)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to create invite link
CREATE OR REPLACE FUNCTION create_invite_link(
  p_type VARCHAR(50),
  p_target_id UUID,
  p_created_by UUID,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_max_uses INTEGER DEFAULT NULL,
  p_settings JSONB DEFAULT '{}'
)
RETURNS TEXT AS $$
DECLARE
  invite_code TEXT;
  invite_id UUID;
BEGIN
  -- Generate unique code
  invite_code := generate_invite_code();
  
  -- Create invite link
  INSERT INTO invite_links (code, type, target_id, created_by, expires_at, max_uses, settings)
  VALUES (invite_code, p_type, p_target_id, p_created_by, p_expires_at, p_max_uses, p_settings)
  RETURNING id INTO invite_id;
  
  RETURN invite_code;
END;
$$ LANGUAGE plpgsql;
