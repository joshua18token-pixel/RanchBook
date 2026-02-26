-- Pastures table
CREATE TABLE IF NOT EXISTS pastures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ranch_id UUID REFERENCES ranches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pastures_ranch_id ON pastures(ranch_id);

-- Enable RLS
ALTER TABLE pastures ENABLE ROW LEVEL SECURITY;

-- RLS: ranch members can view pastures
CREATE POLICY "Ranch members can view pastures" ON pastures
  FOR SELECT USING (
    ranch_id IN (SELECT ranch_id FROM ranch_members WHERE user_id = auth.uid() AND accepted = true)
  );

-- RLS: write/manager members can insert pastures
CREATE POLICY "Write members can insert pastures" ON pastures
  FOR INSERT WITH CHECK (
    ranch_id IN (
      SELECT ranch_id FROM ranch_members
      WHERE user_id = auth.uid() AND accepted = true AND role IN ('manager', 'write')
    )
  );

-- RLS: managers can update/delete pastures
CREATE POLICY "Managers can update pastures" ON pastures
  FOR UPDATE USING (
    ranch_id IN (
      SELECT ranch_id FROM ranch_members
      WHERE user_id = auth.uid() AND accepted = true AND role = 'manager'
    )
  );

CREATE POLICY "Managers can delete pastures" ON pastures
  FOR DELETE USING (
    ranch_id IN (
      SELECT ranch_id FROM ranch_members
      WHERE user_id = auth.uid() AND accepted = true AND role = 'manager'
    )
  );
