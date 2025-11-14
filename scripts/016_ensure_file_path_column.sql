-- Ensure file_path column exists in curriculum_documents table
-- This fixes the PGRST204 schema cache error

DO $$
BEGIN
  -- Add file_path column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'curriculum_documents' 
      AND column_name = 'file_path'
  ) THEN
    ALTER TABLE curriculum_documents 
    ADD COLUMN file_path TEXT;
    
    COMMENT ON COLUMN curriculum_documents.file_path IS 'Internal path in GCS bucket (e.g., userId/curriculum/courseId/filename)';
    
    RAISE NOTICE 'Added file_path column to curriculum_documents table';
  ELSE
    RAISE NOTICE 'file_path column already exists in curriculum_documents table';
  END IF;
END $$;

-- Refresh Supabase schema cache by touching the table
-- This helps Supabase PostgREST recognize the new column
NOTIFY pgrst, 'reload schema';

