-- Add is_published column to activities table
-- Activities are only visible to students if is_published = true
-- Teachers must click "Share and Get URL" to publish an activity

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE activities ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
    
    COMMENT ON COLUMN activities.is_published IS 'Whether the activity is published and visible to students. Must be set to true via "Share and Get URL" button.';
    
    -- Set existing activities to unpublished by default (teachers need to explicitly publish them)
    UPDATE activities SET is_published = FALSE WHERE is_published IS NULL;
  END IF;
END $$;

