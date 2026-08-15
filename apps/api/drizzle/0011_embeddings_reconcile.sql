-- Reconcile schema drift between drizzle migration 0004 and raw legacy migration 015.
--
-- Investigation (Slice 10): drizzle 0004 was recorded as executed but rolled back on
-- 42P07 because legacy 015 had already created idx_embeddings_vector as ivfflat
-- (lists=100); the 0004 columns (chunk_index, content_hash, metadata, embedding_model,
-- embedding_version) never landed in the live DB.
--
-- Deliberate index decision (§17): measured workload is an empty `embeddings` table
-- (0 rows) and it is targeted for deprecation in Slice 12. Vector search on it stays
-- exact-scan. The stale legacy ivfflat index (lists=100 on an empty table is worse than
-- exact) is dropped deliberately; the drizzle-declared HNSW index from 0004 is preserved
-- where it exists so fresh installs are unaffected. The canonical HNSW corpus is Python
-- ai_embeddings (migration 0008).
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS chunk_index INTEGER DEFAULT 0;
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS embedding_version INTEGER DEFAULT 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_embeddings_vector'
      AND indexdef ILIKE '%ivfflat%'
  ) THEN
    DROP INDEX idx_embeddings_vector;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_embeddings_source_chunk ON embeddings (source_type, source_id, chunk_index);
