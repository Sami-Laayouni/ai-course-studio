-- COMPLETE FIX for activities table constraints
-- This script fixes ALL constraint issues at once

-- 1. Drop ALL existing constraints on activities table
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_activity_type_check;
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_difficulty_level_check;

-- 2. Add the correct activity_type constraint with ALL supported types
ALTER TABLE public.activities ADD CONSTRAINT activities_activity_type_check 
CHECK (activity_type IN (
    'quiz', 'assignment', 'reading', 'video', 'interactive', 
    'ai_chat', 'collaborative', 'pdf', 'youtube', 'slideshow', 
    'document', 'simulation', 'custom', 'enhanced'
));

-- 3. Add the correct difficulty_level constraint
ALTER TABLE public.activities ADD CONSTRAINT activities_difficulty_level_check 
CHECK (difficulty_level BETWEEN 1 AND 5);

-- 4. Ensure all required columns exist with proper defaults
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS activity_subtype VARCHAR(50);
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS is_adaptive BOOLEAN DEFAULT TRUE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT FALSE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 1;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS collaboration_settings JSONB DEFAULT '{}';
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS is_conditional BOOLEAN DEFAULT FALSE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS supports_upload BOOLEAN DEFAULT FALSE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS supports_slideshow BOOLEAN DEFAULT FALSE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS performance_tracking BOOLEAN DEFAULT FALSE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS is_enhanced BOOLEAN DEFAULT FALSE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS multiple_completion_paths BOOLEAN DEFAULT FALSE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS ai_tutoring BOOLEAN DEFAULT FALSE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS video_content BOOLEAN DEFAULT FALSE;

-- 5. Verify all constraints and columns
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.activities'::regclass 
AND conname LIKE '%check%';

-- 6. Show all columns in activities table
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'activities' 
AND table_schema = 'public'
ORDER BY ordinal_position;



