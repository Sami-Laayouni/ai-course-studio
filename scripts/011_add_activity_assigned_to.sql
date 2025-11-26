-- Add assigned_to column to activities table
-- This allows teachers to assign activities to all students or specific students

-- Add assigned_to column if it doesn't exist
-- Store "all" as JSON string '"all"' or array of student IDs like '["id1", "id2"]'
-- Using to_jsonb to properly create JSON string
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE activities 
    ADD COLUMN assigned_to JSONB DEFAULT to_jsonb('all'::text);
  END IF;
END $$;

-- Add comment to explain the column
COMMENT ON COLUMN activities.assigned_to IS 
'Assignment target: "all" (JSON string) for all students, or array of student IDs for specific students';

-- Update existing activities to have "all" as default if they don't have assigned_to set
UPDATE activities 
SET assigned_to = to_jsonb('all'::text)
WHERE assigned_to IS NULL;

