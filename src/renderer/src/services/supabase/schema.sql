-- Supabase database schema for Prompt Saver app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Prompts table
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  title TEXT,
  category TEXT,
  subcategory TEXT,
  tags TEXT[],
  source TEXT NOT NULL CHECK (source IN ('manual', 'claude', 'chatgpt', 'gemini', 'grok')),
  url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table (for consistency)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared prompts (for public sharing)
CREATE TABLE shared_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
  shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_prompts_user_id ON prompts(user_id);
CREATE INDEX idx_prompts_category ON prompts(category);
CREATE INDEX idx_prompts_source ON prompts(source);
CREATE INDEX idx_prompts_created_at ON prompts(created_at DESC);
CREATE INDEX idx_prompts_is_public ON prompts(is_public);
CREATE INDEX idx_prompts_tags ON prompts USING GIN(tags);

-- Full text search index
CREATE INDEX idx_prompts_content_search ON prompts USING GIN(to_tsvector('english', content));
CREATE INDEX idx_prompts_title_search ON prompts USING GIN(to_tsvector('english', title));

-- Row Level Security (RLS)
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prompts
CREATE POLICY "Users can view own prompts" ON prompts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompts" ON prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts" ON prompts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts" ON prompts
  FOR DELETE USING (auth.uid() = user_id);

-- Allow viewing public prompts
CREATE POLICY "Anyone can view public prompts" ON prompts
  FOR SELECT USING (is_public = true);

-- RLS Policies for categories
CREATE POLICY "Anyone can view categories" ON categories
  FOR SELECT USING (true);

-- RLS Policies for shared_prompts
CREATE POLICY "Users can view shared prompts" ON shared_prompts
  FOR SELECT USING (true);

CREATE POLICY "Users can create shared prompts" ON shared_prompts
  FOR INSERT WITH CHECK (auth.uid() = shared_by);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_prompts_updated_at 
  BEFORE UPDATE ON prompts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_usage_count(prompt_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE prompts 
  SET usage_count = usage_count + 1 
  WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search prompts with full text search
CREATE OR REPLACE FUNCTION search_prompts(
  search_query TEXT,
  user_filter UUID DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  is_public_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  title TEXT,
  category TEXT,
  subcategory TEXT,
  tags TEXT[],
  source TEXT,
  url TEXT,
  is_public BOOLEAN,
  usage_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.content,
    p.title,
    p.category,
    p.subcategory,
    p.tags,
    p.source,
    p.url,
    p.is_public,
    p.usage_count,
    p.created_at,
    p.updated_at,
    ts_rank(
      to_tsvector('english', COALESCE(p.title, '') || ' ' || p.content),
      plainto_tsquery('english', search_query)
    ) as rank
  FROM prompts p
  WHERE 
    (search_query IS NULL OR to_tsvector('english', COALESCE(p.title, '') || ' ' || p.content) @@ plainto_tsquery('english', search_query))
    AND (user_filter IS NULL OR p.user_id = user_filter OR p.is_public = true)
    AND (category_filter IS NULL OR p.category = category_filter)
    AND (NOT is_public_only OR p.is_public = true)
    AND (
      p.user_id = auth.uid() OR 
      p.is_public = true
    )
  ORDER BY rank DESC, p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
