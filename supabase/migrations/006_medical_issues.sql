-- Medical watch issues (tags on cows with timestamps)
CREATE TABLE IF NOT EXISTS medical_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cow_id UUID NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  ranch_id UUID NOT NULL REFERENCES ranches(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_medical_issues_cow ON medical_issues(cow_id);
CREATE INDEX idx_medical_issues_ranch ON medical_issues(ranch_id);

ALTER TABLE medical_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mi_select" ON medical_issues FOR SELECT USING (is_ranch_member(ranch_id));
CREATE POLICY "mi_insert" ON medical_issues FOR INSERT WITH CHECK (is_ranch_member(ranch_id));
CREATE POLICY "mi_delete" ON medical_issues FOR DELETE USING (is_ranch_member(ranch_id));
