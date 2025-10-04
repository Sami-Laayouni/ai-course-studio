-- Enhanced Activity Features
-- Add support for conditional logic, document uploads, and performance tracking

-- Create context_sources table for uploaded documents and videos
CREATE TABLE IF NOT EXISTS context_sources (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('document', 'youtube', 'pdf', 'video')),
    title TEXT NOT NULL,
    url TEXT,
    filename TEXT,
    summary TEXT,
    key_points TEXT[],
    key_concepts TEXT[],
    thumbnail TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_id TEXT,
    node_id TEXT,
    file_size INTEGER,
    mime_type TEXT,
    duration INTEGER, -- for videos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student_performance table for tracking performance and conditional logic
CREATE TABLE IF NOT EXISTS student_performance (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    response TEXT,
    should_take_mastery_path BOOLEAN DEFAULT FALSE,
    confidence DECIMAL(3,2) DEFAULT 0.5,
    reasoning TEXT,
    threshold_used INTEGER DEFAULT 70,
    performance_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create uploaded_files table for tracking file uploads
CREATE TABLE IF NOT EXISTS uploaded_files (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    google_cloud_url TEXT,
    extracted_text TEXT,
    key_points TEXT[],
    key_concepts TEXT[],
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create slideshow_data table for slideshow presentations
CREATE TABLE IF NOT EXISTS slideshow_data (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slides TEXT[] NOT NULL,
    current_slide INTEGER DEFAULT 0,
    auto_advance BOOLEAN DEFAULT FALSE,
    slide_duration INTEGER DEFAULT 5,
    google_cloud_url TEXT,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for context_sources
ALTER TABLE context_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own context sources" ON context_sources
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own context sources" ON context_sources
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own context sources" ON context_sources
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own context sources" ON context_sources
    FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for student_performance
ALTER TABLE student_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own performance data" ON student_performance
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance data" ON student_performance
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance data" ON student_performance
    FOR UPDATE USING (auth.uid() = user_id);

-- Add RLS policies for uploaded_files
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own uploaded files" ON uploaded_files
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uploaded files" ON uploaded_files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploaded files" ON uploaded_files
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploaded files" ON uploaded_files
    FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for slideshow_data
ALTER TABLE slideshow_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own slideshow data" ON slideshow_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own slideshow data" ON slideshow_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own slideshow data" ON slideshow_data
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own slideshow data" ON slideshow_data
    FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_context_sources_user_id ON context_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_context_sources_activity_id ON context_sources(activity_id);
CREATE INDEX IF NOT EXISTS idx_context_sources_node_id ON context_sources(node_id);

CREATE INDEX IF NOT EXISTS idx_student_performance_user_id ON student_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_student_performance_activity_id ON student_performance(activity_id);
CREATE INDEX IF NOT EXISTS idx_student_performance_node_id ON student_performance(node_id);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_activity_id ON uploaded_files(activity_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_node_id ON uploaded_files(node_id);

CREATE INDEX IF NOT EXISTS idx_slideshow_data_user_id ON slideshow_data(user_id);
CREATE INDEX IF NOT EXISTS idx_slideshow_data_activity_id ON slideshow_data(activity_id);
CREATE INDEX IF NOT EXISTS idx_slideshow_data_node_id ON slideshow_data(node_id);

-- Update activities table to support enhanced features
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_conditional BOOLEAN DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS supports_upload BOOLEAN DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS supports_slideshow BOOLEAN DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS performance_tracking BOOLEAN DEFAULT FALSE;

-- Add function to get student performance summary
CREATE OR REPLACE FUNCTION get_student_performance_summary(p_user_id UUID, p_activity_id TEXT)
RETURNS TABLE (
    total_responses INTEGER,
    average_score DECIMAL(5,2),
    mastery_path_count INTEGER,
    novel_path_count INTEGER,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_responses,
        AVG(performance_score)::DECIMAL(5,2) as average_score,
        COUNT(CASE WHEN should_take_mastery_path THEN 1 END)::INTEGER as mastery_path_count,
        COUNT(CASE WHEN NOT should_take_mastery_path THEN 1 END)::INTEGER as novel_path_count,
        MAX(created_at) as last_activity
    FROM student_performance
    WHERE user_id = p_user_id AND activity_id = p_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to get context sources for an activity
CREATE OR REPLACE FUNCTION get_activity_context_sources(p_activity_id TEXT, p_user_id UUID)
RETURNS TABLE (
    id TEXT,
    type TEXT,
    title TEXT,
    url TEXT,
    summary TEXT,
    key_points TEXT[],
    key_concepts TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.type,
        cs.title,
        cs.url,
        cs.summary,
        cs.key_points,
        cs.key_concepts
    FROM context_sources cs
    WHERE cs.activity_id = p_activity_id 
    AND (cs.user_id = p_user_id OR cs.user_id IS NULL)
    ORDER BY cs.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
