-- Check current constraint and fix it
-- First, let's see what the current constraint allows
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.activities'::regclass 
AND conname = 'activities_activity_type_check';

-- Drop the constraint completely
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_activity_type_check;

-- Add a new, comprehensive constraint that allows ALL activity types
ALTER TABLE public.activities ADD CONSTRAINT activities_activity_type_check 
CHECK (activity_type IN (
    'quiz', 'assignment', 'reading', 'video', 'interactive', 
    'ai_chat', 'collaborative', 'pdf', 'youtube', 'slideshow', 
    'document', 'simulation', 'custom', 'enhanced', 'test',
    'activity', 'lesson', 'module', 'unit', 'exercise'
));

-- Test the constraint by trying to insert a test record
INSERT INTO public.activities (title, course_id, activity_type) 
VALUES ('Test Activity', (SELECT id FROM courses LIMIT 1), 'quiz')
ON CONFLICT DO NOTHING;

-- Clean up test record
DELETE FROM public.activities WHERE title = 'Test Activity';

-- Show final constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.activities'::regclass 
AND conname = 'activities_activity_type_check';





