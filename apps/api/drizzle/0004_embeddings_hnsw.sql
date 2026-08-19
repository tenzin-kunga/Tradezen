-- Extend embeddings table for chunking, dedup, and embedding versioning
-- Add HNSW index for fast vector search

-- Add new columns
ALTER TABLE embeddings ADD COLUMN chunk_index INTEGER DEFAULT 0;
ALTER TABLE embeddings ADD COLUMN content_hash TEXT;
ALTER TABLE embeddings ADD COLUMN metadata JSONB DEFAULT '{}';
ALTER TABLE embeddings ADD COLUMN embedding_model TEXT DEFAULT 'text-embedding-3-small';
ALTER TABLE embeddings ADD COLUMN embedding_version INTEGER DEFAULT 1;

-- HNSW index for fast cosine similarity search
-- Replaces brute-force sequential scan
CREATE INDEX idx_embeddings_vector ON embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Composite index for chunk lookups
CREATE INDEX idx_embeddings_source_chunk ON embeddings (source_type, source_id, chunk_index);
