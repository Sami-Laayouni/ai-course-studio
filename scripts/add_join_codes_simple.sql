-- Add join_code field to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS join_code TEXT;

-- Add join_code field to lessons table  
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS join_code TEXT;

-- Update existing courses to have join codes (simple approach)
UPDATE public.courses 
SET join_code = upper(substring(md5(random()::text) from 1 for 6))
WHERE join_code IS NULL;

-- Update existing lessons to have join codes (simple approach)
UPDATE public.lessons 
SET join_code = upper(substring(md5(random()::text) from 1 for 6))
WHERE join_code IS NULL;
