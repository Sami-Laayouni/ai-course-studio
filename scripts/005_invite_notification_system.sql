-- Add invite system for courses and lessons
CREATE TABLE IF NOT EXISTS course_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  invite_token VARCHAR(255) UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT NULL, -- NULL means unlimited
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  invite_token VARCHAR(255) UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT NULL, -- NULL means unlimited
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add assignment system
CREATE TABLE IF NOT EXISTS assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  points INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add student assignment submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  submission_data JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  graded_at TIMESTAMP WITH TIME ZONE,
  grade DECIMAL(5,2),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- Add notification system
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('assignment', 'lesson', 'invite', 'grade', 'announcement')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- stores related IDs, URLs, etc.
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add lesson assignments (linking lessons to specific students with due dates)
CREATE TABLE IF NOT EXISTS lesson_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  is_required BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lesson_id, student_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_invites_token ON course_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_course_invites_course ON course_invites(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_invites_token ON lesson_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_lesson_invites_lesson ON lesson_invites(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson ON assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_student ON lesson_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_lesson ON lesson_assignments(lesson_id);

-- Add RLS policies for course invites
ALTER TABLE course_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage course invites" ON course_invites
  FOR ALL USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_invites.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active course invites" ON course_invites
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Add RLS policies for lesson invites
ALTER TABLE lesson_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage lesson invites" ON lesson_invites
  FOR ALL USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = lesson_invites.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active lesson invites" ON lesson_invites
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Add RLS policies for assignments
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage assignments" ON assignments
  FOR ALL USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = assignments.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view published assignments" ON assignments
  FOR SELECT USING (
    is_published = true AND 
    EXISTS (
      SELECT 1 FROM enrollments 
      WHERE enrollments.student_id = auth.uid() 
      AND enrollments.course_id = assignments.course_id
    )
  );

-- Add RLS policies for assignment submissions
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can manage their own submissions" ON assignment_submissions
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view all submissions" ON assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = assignment_submissions.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

-- Add RLS policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- Add RLS policies for lesson assignments
ALTER TABLE lesson_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage lesson assignments" ON lesson_assignments
  FOR ALL USING (
    assigned_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = lesson_assignments.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their lesson assignments" ON lesson_assignments
  FOR SELECT USING (student_id = auth.uid());

-- Function to generate invite tokens
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Function to create course invite
CREATE OR REPLACE FUNCTION create_course_invite(
  p_course_id UUID,
  p_created_by UUID,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_max_uses INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  invite_id UUID;
  invite_token TEXT;
BEGIN
  -- Generate unique token
  invite_token := generate_invite_token();
  
  -- Create invite
  INSERT INTO course_invites (course_id, invite_token, created_by, expires_at, max_uses)
  VALUES (p_course_id, invite_token, p_created_by, p_expires_at, p_max_uses)
  RETURNING id INTO invite_id;
  
  RETURN invite_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create lesson invite
CREATE OR REPLACE FUNCTION create_lesson_invite(
  p_lesson_id UUID,
  p_course_id UUID,
  p_created_by UUID,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_max_uses INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  invite_id UUID;
  invite_token TEXT;
BEGIN
  -- Generate unique token
  invite_token := generate_invite_token();
  
  -- Create invite
  INSERT INTO lesson_invites (lesson_id, course_id, invite_token, created_by, expires_at, max_uses)
  VALUES (p_lesson_id, p_course_id, invite_token, p_created_by, p_expires_at, p_max_uses)
  RETURNING id INTO invite_id;
  
  RETURN invite_id;
END;
$$ LANGUAGE plpgsql;

-- Function to use course invite
CREATE OR REPLACE FUNCTION use_course_invite(p_invite_token TEXT, p_student_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Get invite details
  SELECT * INTO invite_record
  FROM course_invites
  WHERE invite_token = p_invite_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR used_count < max_uses);
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if student is already enrolled
  IF EXISTS (
    SELECT 1 FROM enrollments 
    WHERE student_id = p_student_id 
    AND course_id = invite_record.course_id
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Enroll student
  INSERT INTO enrollments (student_id, course_id)
  VALUES (p_student_id, invite_record.course_id);
  
  -- Update invite usage
  UPDATE course_invites
  SET used_count = used_count + 1
  WHERE id = invite_record.id;
  
  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_student_id,
    'invite',
    'Course Invitation Accepted',
    'You have successfully joined the course.',
    json_build_object('course_id', invite_record.course_id)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to use lesson invite
CREATE OR REPLACE FUNCTION use_lesson_invite(p_invite_token TEXT, p_student_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Get invite details
  SELECT * INTO invite_record
  FROM lesson_invites
  WHERE invite_token = p_invite_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR used_count < max_uses);
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if student is enrolled in course
  IF NOT EXISTS (
    SELECT 1 FROM enrollments 
    WHERE student_id = p_student_id 
    AND course_id = invite_record.course_id
  ) THEN
    -- Auto-enroll student in course
    INSERT INTO enrollments (student_id, course_id)
    VALUES (p_student_id, invite_record.course_id);
  END IF;
  
  -- Assign lesson to student
  INSERT INTO lesson_assignments (lesson_id, course_id, student_id, assigned_by)
  VALUES (invite_record.lesson_id, invite_record.course_id, p_student_id, invite_record.created_by)
  ON CONFLICT (lesson_id, student_id) DO NOTHING;
  
  -- Update invite usage
  UPDATE lesson_invites
  SET used_count = used_count + 1
  WHERE id = invite_record.id;
  
  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_student_id,
    'lesson',
    'New Lesson Assigned',
    'You have been assigned a new lesson.',
    json_build_object('lesson_id', invite_record.lesson_id, 'course_id', invite_record.course_id)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to create assignment notification
CREATE OR REPLACE FUNCTION notify_assignment_created(p_assignment_id UUID)
RETURNS VOID AS $$
DECLARE
  assignment_record RECORD;
  student_record RECORD;
BEGIN
  -- Get assignment details
  SELECT * INTO assignment_record
  FROM assignments
  WHERE id = p_assignment_id;
  
  -- Notify all enrolled students
  FOR student_record IN
    SELECT student_id FROM enrollments WHERE course_id = assignment_record.course_id
  LOOP
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      student_record.student_id,
      'assignment',
      'New Assignment: ' || assignment_record.title,
      assignment_record.description || 
      CASE 
        WHEN assignment_record.due_date IS NOT NULL 
        THEN ' Due: ' || to_char(assignment_record.due_date, 'MM/DD/YYYY at HH:MI AM')
        ELSE ''
      END,
      json_build_object(
        'assignment_id', assignment_record.id,
        'course_id', assignment_record.course_id,
        'lesson_id', assignment_record.lesson_id,
        'due_date', assignment_record.due_date
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify when assignment is published
CREATE OR REPLACE FUNCTION trigger_notify_assignment_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_published = true AND (OLD.is_published = false OR OLD IS NULL) THEN
    PERFORM notify_assignment_created(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignment_published_notification
  AFTER INSERT OR UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_assignment_created();
