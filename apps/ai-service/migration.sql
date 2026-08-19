-- Migration: Add AI RAG tables for TradeZen AI Service
-- Run: bun run migrate (in apps/api)

-- ai_documents: index, NOT a copy of source data
CREATE TABLE IF NOT EXISTS "ai_documents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "source_type" VARCHAR(50) NOT NULL,
  "source_id" UUID,
  "chunk_index" INTEGER DEFAULT 0,
  "content" TEXT,
  "content_hash" VARCHAR(64) NOT NULL,
  "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ai_documents_user" ON "ai_documents"("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_documents_source" ON "ai_documents"("user_id", "source_type");
CREATE INDEX IF NOT EXISTS "idx_ai_documents_hash" ON "ai_documents"("content_hash");
CREATE INDEX IF NOT EXISTS "idx_ai_documents_search" ON "ai_documents" USING GIN("search_vector");

-- Patch existing tables: add content column if missing
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;
CREATE INDEX IF NOT EXISTS "idx_ai_documents_search" ON "ai_documents" USING GIN("search_vector");

-- ai_embeddings: one embedding per document
CREATE TABLE IF NOT EXISTS "ai_embeddings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id" UUID NOT NULL REFERENCES "ai_documents"("id") ON DELETE CASCADE,
  "embedding" vector(768) NOT NULL,
  "embedding_model" VARCHAR(100) NOT NULL,
  "embedding_version" INTEGER DEFAULT 1,
  "dimension" INTEGER DEFAULT 768,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ai_embeddings_doc" ON "ai_embeddings"("document_id");

-- ai_memories: references documents, no embedding directly
CREATE TABLE IF NOT EXISTS "ai_memories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "document_id" UUID REFERENCES "ai_documents"("id") ON DELETE SET NULL,
  "memory_type" VARCHAR(50) NOT NULL,
  "importance" INTEGER DEFAULT 5,
  "metadata" JSONB DEFAULT '{}',
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ai_memories_user" ON "ai_memories"("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_memories_type" ON "ai_memories"("user_id", "memory_type");
