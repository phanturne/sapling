-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT DEFAULT 'Anonymous User' NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS only for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.id::text,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NULLIF(split_part(NEW.email, '@', 1), ''),
      'New User'
    )
  )
  ON CONFLICT (id) DO NOTHING; -- Handle race conditions
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail auth signup
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();

-- RLS Policies for profiles
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Avatars storage bucket and policies (profile_avatar)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view all avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();