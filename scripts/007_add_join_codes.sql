-- Add join_code field to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- Add join_code field to lessons table  
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- Create function to generate random join codes
CREATE OR REPLACE FUNCTION generate_join_code() RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a 6-character alphanumeric code
        code := upper(substring(md5(random()::text) from 1 for 6));
        
        -- Check if code already exists in courses
        SELECT EXISTS(SELECT 1 FROM courses WHERE join_code = code) INTO exists;
        
        -- If not exists, break the loop
        IF NOT exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate join codes for courses
CREATE OR REPLACE FUNCTION set_course_join_code() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.join_code IS NULL THEN
        NEW.join_code := generate_join_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_course_join_code
    BEFORE INSERT ON courses
    FOR EACH ROW
    EXECUTE FUNCTION set_course_join_code();

-- Create trigger to auto-generate join codes for lessons
CREATE OR REPLACE FUNCTION set_lesson_join_code() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.join_code IS NULL THEN
        NEW.join_code := generate_join_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_lesson_join_code
    BEFORE INSERT ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION set_lesson_join_code();

-- Update existing courses and lessons to have join codes
UPDATE courses SET join_code = generate_join_code() WHERE join_code IS NULL;
UPDATE lessons SET join_code = generate_join_code() WHERE join_code IS NULL;
