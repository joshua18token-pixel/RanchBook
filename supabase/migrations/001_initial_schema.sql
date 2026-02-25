-- RanchBook Database Schema

-- Cows table
CREATE TABLE cows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('wet', 'dry', 'bred', 'open', 'calf', 'bull', 'steer')),
  breed TEXT,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tags table (multiple tags per cow)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cow_id UUID NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'ear tag',  -- e.g. "ear tag", "RFID", "brand"
  number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cow_id UUID NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast search
CREATE INDEX idx_tags_number ON tags(number);
CREATE INDEX idx_tags_cow_id ON tags(cow_id);
CREATE INDEX idx_notes_cow_id ON notes(cow_id);
CREATE INDEX idx_cows_user_id ON cows(user_id);
CREATE INDEX idx_cows_status ON cows(status);

-- Enable Row Level Security
ALTER TABLE cows ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only see/edit their own data
CREATE POLICY "Users can CRUD their own cows" ON cows
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD tags on their cows" ON tags
  FOR ALL USING (cow_id IN (SELECT id FROM cows WHERE user_id = auth.uid()));

CREATE POLICY "Users can CRUD notes on their cows" ON notes
  FOR ALL USING (cow_id IN (SELECT id FROM cows WHERE user_id = auth.uid()));
