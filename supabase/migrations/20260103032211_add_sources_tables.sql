-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";

-- Sources
CREATE TABLE sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  source_type TEXT DEFAULT 'text' NOT NULL CHECK (source_type IN ('text', 'file', 'url')),
  file_path TEXT,
  file_type TEXT,
  file_size BIGINT CHECK (file_size > 0),
  source_url TEXT,
  status TEXT DEFAULT 'processing' NOT NULL CHECK (status IN ('processing', 'ready', 'error')),
  metadata JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Data integrity: ensure required fields are set based on source_type
  CONSTRAINT check_source_type_file_path CHECK (
    (source_type = 'file' AND file_path IS NOT NULL) OR
    (source_type != 'file')
  ),
  CONSTRAINT check_source_type_url CHECK (
    (source_type = 'url' AND source_url IS NOT NULL) OR
    (source_type != 'url')
  )
);

-- Source chunks for embeddings
CREATE TABLE source_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  token_count INTEGER CHECK (token_count > 0),
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Source summaries for quick overview
CREATE TABLE source_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  key_points TEXT[] DEFAULT '{}' NOT NULL,
  topics TEXT[] DEFAULT '{}' NOT NULL,
  word_count INTEGER CHECK (word_count > 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_sources_space_id ON sources(space_id);
CREATE INDEX idx_sources_status ON sources(status);
CREATE INDEX idx_sources_space_status ON sources(space_id, status);
CREATE INDEX idx_source_chunks_source_id ON source_chunks(source_id);
CREATE INDEX idx_source_summaries_source_id ON source_summaries(source_id);

-- Row Level Security (RLS)
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view sources in accessible spaces" ON sources FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM spaces 
    WHERE spaces.id = sources.space_id 
    AND (spaces.user_id = auth.uid() OR spaces.visibility = 'public')
  )
);
CREATE POLICY "Owners can manage sources" ON sources FOR ALL USING (
  EXISTS (
    SELECT 1 FROM spaces 
    WHERE spaces.id = sources.space_id AND spaces.user_id = auth.uid()
  )
);

-- Source chunks inherit source permissions
CREATE POLICY "Users can view chunks in accessible sources" ON source_chunks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sources 
    JOIN spaces ON spaces.id = sources.space_id
    WHERE sources.id = source_chunks.source_id 
    AND (spaces.user_id = auth.uid() OR spaces.visibility = 'public')
  )
);
CREATE POLICY "Owners can manage chunks" ON source_chunks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sources 
    JOIN spaces ON spaces.id = sources.space_id
    WHERE sources.id = source_chunks.source_id AND spaces.user_id = auth.uid()
  )
);

-- Source summaries inherit source permissions
CREATE POLICY "Users can view summaries in accessible sources" ON source_summaries FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sources 
    JOIN spaces ON spaces.id = sources.space_id
    WHERE sources.id = source_summaries.source_id 
    AND (spaces.user_id = auth.uid() OR spaces.visibility = 'public')
  )
);
CREATE POLICY "Owners can manage summaries" ON source_summaries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sources 
    JOIN spaces ON spaces.id = sources.space_id
    WHERE sources.id = source_summaries.source_id AND spaces.user_id = auth.uid()
  )
);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_source_summaries_updated_at BEFORE UPDATE ON source_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket creation and policies
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('sources', 'sources', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can view files in accessible spaces
--  File path structure: {uploader_id}/{space_id}/{source_id}/filename.ext
--  Using split_part() for reliable path parsing: split_part(name, '/', n) extracts the nth segment
CREATE POLICY "Users can view accessible files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'sources' AND
  EXISTS (
    SELECT 1 FROM spaces s
    WHERE s.id::text = split_part(name, '/', 2)
    AND (s.visibility = 'public' OR s.user_id = auth.uid())
  )
);

-- Policy: Owners can manage files in their spaces (INSERT, UPDATE, DELETE)
CREATE POLICY "Owners can manage files" ON storage.objects
FOR ALL USING (
  bucket_id = 'sources' AND
  auth.uid()::text = split_part(name, '/', 1) AND
  EXISTS (
    SELECT 1 FROM spaces s
    WHERE s.id::text = split_part(name, '/', 2)
    AND s.user_id = auth.uid()
  )
);
