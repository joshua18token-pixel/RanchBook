-- Ranches (each ranch manager creates one)
CREATE TABLE ranches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ranch members (invites and access control)
CREATE TYPE ranch_role AS ENUM ('manager', 'write', 'read');

CREATE TABLE ranch_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ranch_id UUID NOT NULL REFERENCES ranches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,               -- for pending invites before user signs up
  role ranch_role NOT NULL DEFAULT 'read',
  invited_by UUID REFERENCES auth.users(id),
  accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ranch_id, email)
);

-- Add ranch_id to cows table
ALTER TABLE cows ADD COLUMN ranch_id UUID REFERENCES ranches(id) ON DELETE CASCADE;
CREATE INDEX idx_cows_ranch_id ON cows(ranch_id);

-- Add ranch_id to tags and notes via cow relationship (already cascading)

-- RLS Policies
ALTER TABLE ranches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranch_members ENABLE ROW LEVEL SECURITY;

-- Drop old cow policies and recreate with ranch-based access
DROP POLICY IF EXISTS "Users can CRUD their own cows" ON cows;
DROP POLICY IF EXISTS "Users can CRUD tags on their cows" ON tags;
DROP POLICY IF EXISTS "Users can CRUD notes on their cows" ON notes;

-- Ranch members can see cows in their ranch
CREATE POLICY "Members can view ranch cows" ON cows
  FOR SELECT USING (
    ranch_id IN (
      SELECT ranch_id FROM ranch_members 
      WHERE user_id = auth.uid() AND accepted = true
    )
  );

-- Only write+ members can insert/update cows
CREATE POLICY "Writers can insert ranch cows" ON cows
  FOR INSERT WITH CHECK (
    ranch_id IN (
      SELECT ranch_id FROM ranch_members 
      WHERE user_id = auth.uid() AND accepted = true AND role IN ('manager', 'write')
    )
  );

CREATE POLICY "Writers can update ranch cows" ON cows
  FOR UPDATE USING (
    ranch_id IN (
      SELECT ranch_id FROM ranch_members 
      WHERE user_id = auth.uid() AND accepted = true AND role IN ('manager', 'write')
    )
  );

-- Only managers can delete cows
CREATE POLICY "Managers can delete cows" ON cows
  FOR DELETE USING (
    ranch_id IN (
      SELECT ranch_id FROM ranch_members 
      WHERE user_id = auth.uid() AND accepted = true AND role = 'manager'
    )
  );

-- Tags follow cow access
CREATE POLICY "Members can view tags" ON tags
  FOR SELECT USING (
    cow_id IN (SELECT id FROM cows WHERE ranch_id IN (
      SELECT ranch_id FROM ranch_members WHERE user_id = auth.uid() AND accepted = true
    ))
  );

CREATE POLICY "Writers can modify tags" ON tags
  FOR ALL USING (
    cow_id IN (SELECT id FROM cows WHERE ranch_id IN (
      SELECT ranch_id FROM ranch_members WHERE user_id = auth.uid() AND accepted = true AND role IN ('manager', 'write')
    ))
  );

-- Notes follow cow access
CREATE POLICY "Members can view notes" ON notes
  FOR SELECT USING (
    cow_id IN (SELECT id FROM cows WHERE ranch_id IN (
      SELECT ranch_id FROM ranch_members WHERE user_id = auth.uid() AND accepted = true
    ))
  );

CREATE POLICY "Writers can modify notes" ON notes
  FOR ALL USING (
    cow_id IN (SELECT id FROM cows WHERE ranch_id IN (
      SELECT ranch_id FROM ranch_members WHERE user_id = auth.uid() AND accepted = true AND role IN ('manager', 'write')
    ))
  );

-- Ranch policies
CREATE POLICY "Members can view their ranch" ON ranches
  FOR SELECT USING (
    id IN (SELECT ranch_id FROM ranch_members WHERE user_id = auth.uid() AND accepted = true)
  );

CREATE POLICY "Owner can update ranch" ON ranches
  FOR UPDATE USING (owner_id = auth.uid());

-- Ranch members policies
CREATE POLICY "Members can view ranch members" ON ranch_members
  FOR SELECT USING (
    ranch_id IN (SELECT ranch_id FROM ranch_members rm WHERE rm.user_id = auth.uid() AND rm.accepted = true)
  );

CREATE POLICY "Managers can manage members" ON ranch_members
  FOR ALL USING (
    ranch_id IN (
      SELECT ranch_id FROM ranch_members 
      WHERE user_id = auth.uid() AND accepted = true AND role = 'manager'
    )
  );
