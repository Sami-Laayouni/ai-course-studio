-- Curriculum system for course improvement analytics
-- Allows teachers to upload curriculum documents and map activities to curriculum sections

-- Create curriculum_documents table
CREATE TABLE IF NOT EXISTS curriculum_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Signed URL or path to file in GCS
  file_path TEXT, -- Internal path in GCS bucket (e.g., userId/curriculum/courseId/filename)
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'pptx'
  file_size BIGINT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  extracted_text TEXT, -- Full text extracted from document
  sections JSONB DEFAULT '[]', -- Array of curriculum sections with page numbers, headings, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add processing status columns if they don't exist
DO $$
BEGIN
  -- Add file_path column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_documents' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE curriculum_documents 
    ADD COLUMN file_path TEXT;
  END IF;

  -- Add processing_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_documents' AND column_name = 'processing_status'
  ) THEN
    ALTER TABLE curriculum_documents 
    ADD COLUMN processing_status TEXT DEFAULT 'pending' 
    CHECK (processing_status IN ('pending', 'uploading', 'extracting', 'analyzing', 'mapping', 'completed', 'failed'));
  END IF;

  -- Add processing_progress column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_documents' AND column_name = 'processing_progress'
  ) THEN
    ALTER TABLE curriculum_documents 
    ADD COLUMN processing_progress INTEGER DEFAULT 0 
    CHECK (processing_progress >= 0 AND processing_progress <= 100);
  END IF;

  -- Add processing_error column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_documents' AND column_name = 'processing_error'
  ) THEN
    ALTER TABLE curriculum_documents 
    ADD COLUMN processing_error TEXT;
  END IF;
END $$;

-- Create background job queue for curriculum processing
CREATE TABLE IF NOT EXISTS curriculum_processing_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  curriculum_document_id UUID NOT NULL REFERENCES curriculum_documents(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('extract_sections', 'map_activities', 'calculate_analytics', 'full_pipeline')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5, -- 1-10, lower is higher priority
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  result_data JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_curriculum_mappings table
-- Maps activities to specific sections in the curriculum
CREATE TABLE IF NOT EXISTS activity_curriculum_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  curriculum_document_id UUID NOT NULL REFERENCES curriculum_documents(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL, -- Reference to section in curriculum_documents.sections
  section_title TEXT,
  page_number INTEGER,
  concept_tags TEXT[], -- Tags for concepts covered in this section
  mapped_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mapped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(activity_id, curriculum_document_id, section_id)
);

-- Create curriculum_analytics table
-- Stores performance analytics per curriculum section
CREATE TABLE IF NOT EXISTS curriculum_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  curriculum_document_id UUID NOT NULL REFERENCES curriculum_documents(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  total_students INTEGER DEFAULT 0,
  students_attempted INTEGER DEFAULT 0,
  students_completed INTEGER DEFAULT 0,
  average_score DECIMAL(5,2),
  average_time_spent INTEGER, -- in seconds
  common_misconceptions JSONB DEFAULT '[]', -- Array of misconception objects
  performance_insights JSONB DEFAULT '{}', -- AI-generated insights
  concept_mastery JSONB DEFAULT '{}', -- Per-concept mastery percentages
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(curriculum_document_id, section_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_curriculum_documents_course ON curriculum_documents(course_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_documents_status ON curriculum_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_activity_curriculum_mappings_activity ON activity_curriculum_mappings(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_curriculum_mappings_curriculum ON activity_curriculum_mappings(curriculum_document_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_analytics_curriculum ON curriculum_analytics(curriculum_document_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_analytics_course ON curriculum_analytics(course_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_jobs_status ON curriculum_processing_jobs(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_curriculum_jobs_curriculum ON curriculum_processing_jobs(curriculum_document_id);

-- Add comment
COMMENT ON TABLE curriculum_documents IS 'Stores uploaded curriculum documents (PDF, Word, PowerPoint)';
COMMENT ON TABLE activity_curriculum_mappings IS 'Maps activities to specific sections in curriculum documents';
COMMENT ON TABLE curriculum_analytics IS 'Stores performance analytics and insights per curriculum section';
COMMENT ON TABLE curriculum_processing_jobs IS 'Background job queue for curriculum processing tasks';

-- Create function to automatically create processing job when curriculum is uploaded
CREATE OR REPLACE FUNCTION create_curriculum_processing_job()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create full pipeline job when curriculum document is created
  INSERT INTO curriculum_processing_jobs (
    curriculum_document_id,
    course_id,
    job_type,
    status,
    priority
  ) VALUES (
    NEW.id,
    NEW.course_id,
    'full_pipeline',
    'pending',
    1
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create job on curriculum upload
DROP TRIGGER IF EXISTS on_curriculum_uploaded ON curriculum_documents;
CREATE TRIGGER on_curriculum_uploaded
  AFTER INSERT ON curriculum_documents
  FOR EACH ROW
  EXECUTE FUNCTION create_curriculum_processing_job();

