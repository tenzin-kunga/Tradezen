# AI Memory Architecture

> **Date:** 2026-05-16
> **Status:** DESIGN
> **Phase:** 6A (Foundation)

## Overview

TradeZen's AI memory system provides contextual awareness for the AI assistant. It combines:
1. **Conversation Memory** — persistent chat threads with context retrieval
2. **Semantic Memory** — vector embeddings of journals, trades, and notes
3. **Procedural Memory** — learned patterns about the user's trading behavior (Phase 6B)

## Architecture

### Data Flow
```
User Message → Context Retrieval → LLM Prompt → Response → Memory Storage
                    ↑
              Semantic Search (pgvector)
```

### Components

#### 1. Embedding Service
- Generates 1536-dim vectors via OpenRouter `/embeddings` endpoint
- Model: `openai/text-embedding-3-small` (cost-effective, high quality)
- Stores vectors in `embeddings` table with user isolation

#### 2. Memory Service
- Semantic search across user's journals, trades, and notes
- Cosine similarity ranking (`<=>` operator)
- Returns top-K most relevant memories for context injection

#### 3. Chat Thread Service
- CRUD for conversation threads
- Message persistence with metadata
- Context window management (last N messages + retrieved memories)

#### 4. AI Processing Pipeline
- Async embedding generation via BullMQ
- Scheduled memory consolidation (nightly)
- Pattern detection workflows (LangGraph in Phase 6B)

## Database Schema

### chat_threads
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| title | TEXT | Auto-generated from first message |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### chat_messages
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | PK |
| thread_id | UUID | FK → chat_threads |
| role | TEXT | system/user/assistant |
| content | TEXT | Message content |
| metadata | JSONB | Token count, model, latency |
| created_at | TIMESTAMP | |

### embeddings
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| source_type | TEXT | journal/trade/note/message |
| source_id | UUID | Reference to source record |
| content | TEXT | Original text |
| embedding | vector(1536) | OpenAI embedding |
| created_at | TIMESTAMP | |

## Security
- All queries scoped by `user_id`
- Embeddings isolated per user
- No cross-user memory sharing
- JWT auth required for all endpoints

## Performance
- Embedding generation: async via BullMQ
- Semantic search: indexed vector columns (IVFFlat)
- Context retrieval: < 100ms for top-5 memories
- Chat response: streaming SSE (existing pattern)

## Phase 6A Deliverables
1. pgvector extension + migrations
2. Embedding service with OpenRouter integration
3. Chat thread/message persistence
4. Semantic search API
5. Context retrieval for AI chat

## Phase 6B (Future)
1. LangGraph workflow integration
2. Journal intelligence engine
3. AI coaching engine
4. Pattern detection workflows
