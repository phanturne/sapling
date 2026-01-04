-- Notes table
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT,
  embedding_status TEXT DEFAULT 'pending' NOT NULL CHECK (embedding_status IN ('pending', 'processing', 'ready', 'stale')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Note chunks for embeddings
CREATE TABLE note_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  token_count INTEGER CHECK (token_count > 0),
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Note summaries for quick overview
CREATE TABLE note_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  key_points TEXT[] DEFAULT '{}' NOT NULL,
  topics TEXT[] DEFAULT '{}' NOT NULL,
  word_count INTEGER CHECK (word_count > 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_notes_space_id ON notes(space_id);
CREATE INDEX idx_notes_embedding_status ON notes(embedding_status);
CREATE INDEX idx_notes_space_status ON notes(space_id, embedding_status);
CREATE INDEX idx_note_chunks_note_id ON note_chunks(note_id);
CREATE INDEX idx_note_summaries_note_id ON note_summaries(note_id);

-- Row Level Security (RLS)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view notes in accessible spaces" ON notes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM spaces 
    WHERE spaces.id = notes.space_id 
    AND (spaces.user_id = auth.uid() OR spaces.visibility = 'public')
  )
);

CREATE POLICY "Owners can manage notes" ON notes FOR ALL USING (
  EXISTS (
    SELECT 1 FROM spaces 
    WHERE spaces.id = notes.space_id AND spaces.user_id = auth.uid()
  )
);

-- Note chunks inherit note permissions
CREATE POLICY "Users can view chunks in accessible notes" ON note_chunks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM notes 
    JOIN spaces ON spaces.id = notes.space_id
    WHERE notes.id = note_chunks.note_id 
    AND (spaces.user_id = auth.uid() OR spaces.visibility = 'public')
  )
);

CREATE POLICY "Owners can manage chunks" ON note_chunks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM notes 
    JOIN spaces ON spaces.id = notes.space_id
    WHERE notes.id = note_chunks.note_id AND spaces.user_id = auth.uid()
  )
);

-- Note summaries inherit note permissions
CREATE POLICY "Users can view summaries in accessible notes" ON note_summaries FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM notes 
    JOIN spaces ON spaces.id = notes.space_id
    WHERE notes.id = note_summaries.note_id 
    AND (spaces.user_id = auth.uid() OR spaces.visibility = 'public')
  )
);

CREATE POLICY "Owners can manage summaries" ON note_summaries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM notes 
    JOIN spaces ON spaces.id = notes.space_id
    WHERE notes.id = note_summaries.note_id AND spaces.user_id = auth.uid()
  )
);

-- Function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_note_summaries_updated_at BEFORE UPDATE ON note_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Unified search function for both sources and notes
CREATE OR REPLACE FUNCTION search_space_content(
  query_embedding VECTOR(1536),
  space_id_param UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  chunk_id UUID,
  content_id UUID,
  content_type TEXT,
  title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE SQL
AS $$
  SELECT
    sc.id,
    sc.source_id,
    'source'::TEXT,
    s.title,
    sc.content,
    1 - (sc.embedding <=> query_embedding) AS similarity
  FROM source_chunks sc
  JOIN sources s ON s.id = sc.source_id
  WHERE s.space_id = space_id_param
    AND sc.embedding IS NOT NULL
    AND 1 - (sc.embedding <=> query_embedding) > match_threshold

  UNION ALL

  SELECT
    nc.id,
    nc.note_id,
    'note'::TEXT,
    n.title,
    nc.content,
    1 - (nc.embedding <=> query_embedding) AS similarity
  FROM note_chunks nc
  JOIN notes n ON n.id = nc.note_id
  WHERE n.space_id = space_id_param
    AND nc.embedding IS NOT NULL
    AND 1 - (nc.embedding <=> query_embedding) > match_threshold

  ORDER BY similarity DESC
  LIMIT match_count;
$$;
