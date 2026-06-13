CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insights_user ON ai_insights(user_id);
CREATE INDEX idx_insights_type ON ai_insights(user_id, insight_type);
CREATE INDEX idx_insights_created ON ai_insights(user_id, created_at DESC);
