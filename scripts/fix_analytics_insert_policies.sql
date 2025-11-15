-- Fix missing INSERT policies for analytics tables
-- This allows server-side inserts using service client to work properly

-- Add INSERT policy for real_time_analytics
DROP POLICY IF EXISTS "Students can insert their own analytics" ON real_time_analytics;
CREATE POLICY "Students can insert their own analytics" ON real_time_analytics
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Add INSERT policy for concept_mastery  
DROP POLICY IF EXISTS "Students can insert their own concept mastery" ON concept_mastery;
CREATE POLICY "Students can insert their own concept mastery" ON concept_mastery
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Add UPDATE policy for concept_mastery (for upserts)
DROP POLICY IF EXISTS "Students can update their own concept mastery" ON concept_mastery;
CREATE POLICY "Students can update their own concept mastery" ON concept_mastery
  FOR UPDATE USING (student_id = auth.uid());

-- Note: Service client (service_role key) should bypass RLS, but these policies
-- provide a fallback and allow direct student inserts if needed.

