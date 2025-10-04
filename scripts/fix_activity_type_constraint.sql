-- Fix activity_type constraint to allow all supported activity types
-- This script updates the check constraint on the activities table

-- First, drop the existing constraint
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_activity_type_check;

-- Add the updated constraint with all supported activity types
ALTER TABLE public.activities ADD CONSTRAINT activities_activity_type_check 
CHECK (activity_type IN ('quiz', 'assignment', 'reading', 'video', 'interactive', 'ai_chat', 'collaborative', 'pdf', 'youtube', 'slideshow', 'document', 'simulation'));

-- Verify the constraint was added successfully
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.activities'::regclass 
AND conname = 'activities_activity_type_check';
