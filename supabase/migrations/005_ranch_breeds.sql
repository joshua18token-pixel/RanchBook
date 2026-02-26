-- Ranch-specific breed presets (managers can add/remove)
CREATE TABLE IF NOT EXISTS ranch_breeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ranch_id UUID NOT NULL REFERENCES ranches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ranch_id, name)
);

CREATE INDEX idx_ranch_breeds_ranch_id ON ranch_breeds(ranch_id);

ALTER TABLE ranch_breeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ranch members can view breeds" ON ranch_breeds
  FOR SELECT USING (
    ranch_id IN (SELECT ranch_id FROM ranch_members WHERE user_id = auth.uid() AND accepted = true)
  );

CREATE POLICY "Managers can manage breeds" ON ranch_breeds
  FOR ALL USING (
    ranch_id IN (
      SELECT ranch_id FROM ranch_members
      WHERE user_id = auth.uid() AND accepted = true AND role = 'manager'
    )
  );

-- Seed default breeds for existing ranches
INSERT INTO ranch_breeds (ranch_id, name)
SELECT r.id, b.name FROM ranches r
CROSS JOIN (VALUES ('Angus'), ('Red Angus'), ('Hereford'), ('Charolais'), ('Simmental'), ('Brahman'), ('Jersey'), ('Holstein'), ('Limousin'), ('Shorthorn')) AS b(name)
ON CONFLICT DO NOTHING;
