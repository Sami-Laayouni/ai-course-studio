-- Add missing columns to activities table that the API is trying to use
-- This fixes the constraint violations when creating activities

-- Add missing columns that the API expects
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS is_enhanced BOOLEAN DEFAULT FALSE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS multiple_completion_paths BOOLEAN DEFAULT FALSE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS ai_tutoring BOOLEAN DEFAULT FALSE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS video_content BOOLEAN DEFAULT FALSE;

-- Verify the columns were added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'activities' 
AND table_schema = 'public'
AND column_name IN ('is_enhanced', 'multiple_completion_paths', 'ai_tutoring', 'video_content')
ORDER BY column_name;



