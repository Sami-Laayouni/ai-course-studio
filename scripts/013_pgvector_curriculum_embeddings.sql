-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store curriculum document section embeddings
CREATE TABLE IF NOT EXISTS curriculum_section_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_document_id UUID NOT NULL REFERENCES curriculum_documents(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL, -- References the section in curriculum_documents.sections JSONB
  section_title TEXT NOT NULL,
  section_text TEXT NOT NULL, -- The actual text content of this section
  embedding vector(768), -- Gemini embedding-001 produces 768-dimensional vectors
  page_number INTEGER,
  concepts TEXT[], -- Array of concepts in this section
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(curriculum_document_id, section_id)
);

-- Table to store activity embeddings for matching
CREATE TABLE IF NOT EXISTS activity_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  activity_title TEXT NOT NULL,
  activity_description TEXT,
  activity_content TEXT, -- Combined content from all nodes
  embedding vector(768), -- Gemini embedding-001 produces 768-dimensional vectors
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(activity_id)
);

-- Index for vector similarity search (using cosine distance)
CREATE INDEX IF NOT EXISTS curriculum_section_embeddings_vector_idx 
ON curriculum_section_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS activity_embeddings_vector_idx 
ON activity_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS curriculum_section_embeddings_document_idx 
ON curriculum_section_embeddings(curriculum_document_id);

CREATE INDEX IF NOT EXISTS activity_embeddings_activity_idx 
ON activity_embeddings(activity_id);

-- Function to find similar curriculum sections for an activity
CREATE OR REPLACE FUNCTION find_similar_curriculum_sections(
  activity_embedding vector(768),
  document_id UUID,
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INT DEFAULT 5
)
RETURNS TABLE (
  section_id TEXT,
  section_title TEXT,
  section_text TEXT,
  similarity FLOAT,
  page_number INTEGER,
  concepts TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cse.section_id,
    cse.section_title,
    cse.section_text,
    1 - (cse.embedding <=> activity_embedding) AS similarity,
    cse.page_number,
    cse.concepts
  FROM curriculum_section_embeddings cse
  WHERE cse.curriculum_document_id = document_id
    AND cse.embedding IS NOT NULL
    AND (1 - (cse.embedding <=> activity_embedding)) >= similarity_threshold
  ORDER BY cse.embedding <=> activity_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to update activity-curriculum mappings based on vector similarity
CREATE OR REPLACE FUNCTION update_activity_curriculum_mappings(
  p_activity_id UUID,
  p_curriculum_document_id UUID,
  p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  section_id TEXT,
  similarity FLOAT
) AS $$
DECLARE
  v_activity_embedding vector(768);
BEGIN
  -- Get the activity embedding
  SELECT embedding INTO v_activity_embedding
  FROM activity_embeddings
  WHERE activity_id = p_activity_id;
  
  IF v_activity_embedding IS NULL THEN
    RAISE EXCEPTION 'Activity embedding not found for activity_id: %', p_activity_id;
  END IF;
  
  -- Find similar sections and update mappings
  RETURN QUERY
  WITH similar_sections AS (
    SELECT 
      section_id,
      (1 - (embedding <=> v_activity_embedding)) AS similarity
    FROM curriculum_section_embeddings
    WHERE curriculum_document_id = p_curriculum_document_id
      AND embedding IS NOT NULL
      AND (1 - (embedding <=> v_activity_embedding)) >= p_similarity_threshold
    ORDER BY embedding <=> v_activity_embedding
    LIMIT 10
  )
  INSERT INTO activity_curriculum_mappings (
    activity_id,
    curriculum_document_id,
    section_id,
    similarity_score,
    mapping_method
  )
  SELECT 
    p_activity_id,
    p_curriculum_document_id,
    ss.section_id,
    ss.similarity,
    'vector_similarity'
  FROM similar_sections ss
  ON CONFLICT (activity_id, curriculum_document_id, section_id)
  DO UPDATE SET
    similarity_score = EXCLUDED.similarity_score,
    mapping_method = 'vector_similarity',
    updated_at = NOW()
  RETURNING section_id, similarity_score;
END;
$$ LANGUAGE plpgsql;

-- Add embedding status tracking to curriculum_documents
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_documents' 
    AND column_name = 'embeddings_status'
  ) THEN
    ALTER TABLE curriculum_documents 
    ADD COLUMN embeddings_status TEXT DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_documents' 
    AND column_name = 'embeddings_progress'
  ) THEN
    ALTER TABLE curriculum_documents 
    ADD COLUMN embeddings_progress INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add embedding status tracking to activities
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' 
    AND column_name = 'embedding_status'
  ) THEN
    ALTER TABLE activities 
    ADD COLUMN embedding_status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Helper function to upsert curriculum section embedding with proper vector casting
CREATE OR REPLACE FUNCTION upsert_curriculum_section_embedding(
  p_curriculum_document_id UUID,
  p_section_id TEXT,
  p_section_title TEXT,
  p_section_text TEXT,
  p_embedding TEXT, -- Pass as string '[1,2,3,...]'
  p_page_number INTEGER DEFAULT NULL,
  p_concepts TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO curriculum_section_embeddings (
    curriculum_document_id,
    section_id,
    section_title,
    section_text,
    embedding,
    page_number,
    concepts
  )
  VALUES (
    p_curriculum_document_id,
    p_section_id,
    p_section_title,
    p_section_text,
    p_embedding::vector, -- Cast string to vector type
    p_page_number,
    p_concepts
  )
  ON CONFLICT (curriculum_document_id, section_id)
  DO UPDATE SET
    section_title = EXCLUDED.section_title,
    section_text = EXCLUDED.section_text,
    embedding = EXCLUDED.embedding,
    page_number = EXCLUDED.page_number,
    concepts = EXCLUDED.concepts,
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to upsert activity embedding with proper vector casting
CREATE OR REPLACE FUNCTION upsert_activity_embedding(
  p_activity_id UUID,
  p_activity_title TEXT,
  p_activity_description TEXT,
  p_activity_content TEXT,
  p_embedding TEXT -- Pass as string '[1,2,3,...]'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO activity_embeddings (
    activity_id,
    activity_title,
    activity_description,
    activity_content,
    embedding
  )
  VALUES (
    p_activity_id,
    p_activity_title,
    p_activity_description,
    p_activity_content,
    p_embedding::vector -- Cast string to vector type
  )
  ON CONFLICT (activity_id)
  DO UPDATE SET
    activity_title = EXCLUDED.activity_title,
    activity_description = EXCLUDED.activity_description,
    activity_content = EXCLUDED.activity_content,
    embedding = EXCLUDED.embedding,
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE curriculum_section_embeddings IS 'Stores vector embeddings for curriculum document sections using Gemini embedding-001';
COMMENT ON TABLE activity_embeddings IS 'Stores vector embeddings for activities to enable semantic matching with curriculum sections';
COMMENT ON FUNCTION find_similar_curriculum_sections IS 'Finds curriculum sections similar to an activity using cosine similarity';
COMMENT ON FUNCTION update_activity_curriculum_mappings IS 'Updates activity-curriculum mappings based on vector similarity';
COMMENT ON FUNCTION upsert_curriculum_section_embedding IS 'Upserts curriculum section embedding with proper vector type casting';
COMMENT ON FUNCTION upsert_activity_embedding IS 'Upserts activity embedding with proper vector type casting';

