-- AI service RAG tables: source documents, pgvector embeddings, and extracted memories.
-- These back POST /ingest/* (trades/journals) and the AI service retrieval pipeline.
-- Dimension is 768 to match the AI service's default embedding model (Ollama nomic-embed-text).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE ai_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ai_documents_source UNIQUE (user_id, source_type, source_id, chunk_index)
);

CREATE INDEX idx_ai_documents_user ON ai_documents (user_id);
CREATE INDEX idx_ai_documents_source ON ai_documents (user_id, source_type);
CREATE INDEX idx_ai_documents_search ON ai_documents USING gin (search_vector);

CREATE TABLE ai_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES ai_documents (id) ON DELETE CASCADE,
  embedding vector(768) NOT NULL,
  embedding_model TEXT,
  embedding_version INTEGER NOT NULL DEFAULT 1,
  dimension INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_embeddings_document ON ai_embeddings (document_id);
CREATE INDEX idx_ai_embeddings_vector ON ai_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE TABLE ai_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  document_id UUID REFERENCES ai_documents (id) ON DELETE SET NULL,
  memory_type TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 5,
  metadata JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_memories_user ON ai_memories (user_id);
CREATE INDEX idx_ai_memories_user_type ON ai_memories (user_id, memory_type);
