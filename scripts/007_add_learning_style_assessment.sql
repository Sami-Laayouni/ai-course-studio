-- Add learning style assessment fields to profiles table
-- This allows the platform to tailor content to each student's learning preferences

-- Add columns for learning style preferences
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS learning_style_preferences JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS has_completed_assessment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS assessment_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment to explain the learning_style_preferences JSONB structure
COMMENT ON COLUMN public.profiles.learning_style_preferences IS 'Stores learning style assessment results in JSON format: {primary_style: "visual|auditory|reading|kinesthetic", scores: {visual: number, auditory: number, reading: number, kinesthetic: number}, preferences: {...}}';

-- Add comment for assessment completion tracking
COMMENT ON COLUMN public.profiles.has_completed_assessment IS 'Tracks whether the student has completed the initial learning style assessment';

-- Create index for faster queries on assessment completion
CREATE INDEX IF NOT EXISTS idx_profiles_has_completed_assessment ON public.profiles(has_completed_assessment) WHERE role = 'student';

