-- Billing columns on ranches table
ALTER TABLE ranches ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE ranches ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE ranches ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE ranches ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE ranches ADD COLUMN IF NOT EXISTS subscription_override TEXT;
ALTER TABLE ranches ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE ranches ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE ranches ADD COLUMN IF NOT EXISTS peak_cow_count INTEGER DEFAULT 0;

-- Index for looking up ranches by stripe customer
CREATE INDEX IF NOT EXISTS idx_ranches_stripe_customer ON ranches(stripe_customer_id);
