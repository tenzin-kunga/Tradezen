-- Transactional outbox for ingestion events: durable fallback so a committed
-- source-data change is guaranteed to reach the AI ingestion pipeline even if
-- queue publishing fails at the moment the change is made.
CREATE TABLE IF NOT EXISTS ingestion_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_outbox_status ON ingestion_outbox (status, created_at);