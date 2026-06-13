CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  snapshot_date DATE NOT NULL,
  metrics JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_snapshots_user_date ON analytics_snapshots(user_id, snapshot_date);
