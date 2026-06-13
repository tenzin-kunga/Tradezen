-- 005_tags_tables.sql
-- Custom tags and trade-tag junction

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#888888',
  category TEXT CHECK (category IN ('setup', 'condition', 'emotion')) DEFAULT 'setup',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS trade_tags (
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (trade_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tags_user ON tags (user_id);
CREATE INDEX IF NOT EXISTS idx_trade_tags_trade ON trade_tags (trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_tags_tag ON trade_tags (tag_id);
