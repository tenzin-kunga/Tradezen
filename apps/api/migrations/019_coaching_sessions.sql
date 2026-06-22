CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  severity VARCHAR(20) NOT NULL,
  triggers JSONB NOT NULL,
  message TEXT NOT NULL,
  analytics_snapshot JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaching_user ON coaching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_severity ON coaching_sessions(user_id, severity);
CREATE INDEX IF NOT EXISTS idx_coaching_created ON coaching_sessions(user_id, created_at DESC);
