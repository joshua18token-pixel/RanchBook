-- Reusable medical issue presets per ranch
CREATE TABLE IF NOT EXISTS medical_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ranch_id UUID NOT NULL REFERENCES ranches(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ranch_id, label)
);

ALTER TABLE medical_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mp_select" ON medical_presets FOR SELECT USING (is_ranch_member(ranch_id));
CREATE POLICY "mp_insert" ON medical_presets FOR INSERT WITH CHECK (is_ranch_member(ranch_id));
CREATE POLICY "mp_delete" ON medical_presets FOR DELETE USING (is_ranch_owner(ranch_id));
