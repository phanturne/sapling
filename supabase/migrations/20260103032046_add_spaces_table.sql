-- Spaces Table
CREATE TABLE spaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  visibility TEXT DEFAULT 'private' NOT NULL CHECK (visibility IN ('private', 'public')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_spaces_user_id ON spaces(user_id);
CREATE INDEX idx_spaces_visibility ON spaces(visibility);

-- Row Level Security (RLS)
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own spaces" ON spaces FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public spaces" ON spaces FOR SELECT USING (visibility = 'public');
CREATE POLICY "Users can insert own spaces" ON spaces FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update spaces" ON spaces FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners can delete spaces" ON spaces FOR DELETE USING (auth.uid() = user_id);

-- Function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  