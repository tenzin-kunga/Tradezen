CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_threads_user ON chat_threads(user_id);
CREATE INDEX idx_chat_threads_updated ON chat_threads(user_id, updated_at DESC);
