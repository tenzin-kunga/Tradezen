-- 003_trades_add_user_id.sql
-- Add user ownership + updated_at to trades

ALTER TABLE trades ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_trades_user_created ON trades (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_symbol ON trades (user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_trades_user_strategy ON trades (user_id, strategy);
