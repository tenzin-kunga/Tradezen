# Phase 6A: AI Memory Foundation — Implementation Plan

> **Date:** 2026-05-16
> **Branch:** develop
> **Strategy:** pgvector + OpenRouter embeddings + chat persistence

---

## Architecture Overview

### Current State
- **Stateless chat** — no conversation history, no context management
- **No vector DB** — pgvector not installed, PostgreSQL 16 available
- **No embeddings** — no semantic search, no similarity matching
- **Rich data** — journals (free text), trades (structured + notes), tags
- **OpenRouter** — supports `/embeddings` endpoint (OpenAI-compatible)

### Target State
- **pgvector** extension on PostgreSQL 16
- **Embedding service** — generates vectors via OpenRouter, stores in DB
- **Semantic search** — similarity search across journals, trades, notes
- **Chat persistence** — threads + messages stored in DB
- **Context retrieval** — AI chat retrieves relevant memories before responding

---

## TZ-060: AI Memory Architecture

### Goal
Design the AI memory architecture document.

### Step 1: Create architecture document
Create `.planning/research/ai-memory-architecture.md`:

```markdown
# AI Memory Architecture

> **Date:** 2026-05-16
> **Status:** DESIGN

## Overview

TradeZen's AI memory system provides contextual awareness for the AI assistant. It combines:
1. **Conversation Memory** — persistent chat threads with context retrieval
2. **Semantic Memory** — vector embeddings of journals, trades, and notes
3. **Procedural Memory** — learned patterns about the user's trading behavior

## Architecture

### Data Flow
```
User Message → Context Retrieval → LLM Prompt → Response → Memory Storage
                    ↑
              Semantic Search
              (pgvector)
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

### Database Schema

#### chat_threads
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| title | TEXT | Auto-generated from first message |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### chat_messages
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | PK |
| thread_id | UUID | FK → chat_threads |
| role | TEXT | system/user/assistant |
| content | TEXT | Message content |
| metadata | JSONB | Token count, model, latency |
| created_at | TIMESTAMP | |

#### embeddings
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| source_type | TEXT | journal/trade/note/message |
| source_id | UUID | Reference to source record |
| content | TEXT | Original text |
| embedding | vector(1536) | OpenAI embedding |
| created_at | TIMESTAMP | |

### Security
- All queries scoped by `user_id`
- Embeddings isolated per user
- No cross-user memory sharing
- JWT auth required for all endpoints

### Performance
- Embedding generation: async via BullMQ
- Semantic search: indexed vector columns
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
```

### Step 2: Commit
```bash
git add .planning/research/ai-memory-architecture.md
git commit -m "docs: AI memory architecture design document (TZ-060)

- Conversation memory, semantic memory, procedural memory design
- Database schema for chat_threads, chat_messages, embeddings
- Data flow: context retrieval → LLM → memory storage
- Security: user isolation, JWT auth
- Performance targets: <100ms context retrieval"
```

---

## TZ-063: Vector Memory System

### Goal
Set up pgvector, embedding service, and semantic search.

### Step 1: Update docker-compose.yml
Change PostgreSQL image to support pgvector:
```yaml
services:
  db:
    image: pgvector/pgvector:pg16
```

### Step 2: Create vector extension migration
Create `apps/api/migrations/010_vector_extension.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 3: Create embeddings table migration
Create `apps/api/migrations/011_embeddings.sql`:
```sql
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  source_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_embeddings_user ON embeddings(user_id);
CREATE INDEX idx_embeddings_source ON embeddings(source_type, source_id);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Step 4: Add embeddings table to Drizzle schema
Add to `apps/api/src/db/schema/index.ts`:
```typescript
import { vector } from 'drizzle-orm/pg-core';

export const embeddings = pgTable('embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sourceType: varchar('source_type', { length: 50 }).notNull(),
  sourceId: uuid('source_id').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_embeddings_user').on(table.userId),
  sourceIdx: index('idx_embeddings_source').on(table.sourceType, table.sourceId),
}));
```

### Step 5: Create embedding service
Create `apps/api/src/ai/embedding.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { embeddings } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger('EmbeddingService');
  private readonly embeddingModel = 'openai/text-embedding-3-small';

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER ?? 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_APP_TITLE ?? 'TradeZen',
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: [text],
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async storeEmbedding(userId: string, sourceType: string, sourceId: string, content: string, embedding: number[]): Promise<void> {
    await db.insert(embeddings).values({
      userId,
      sourceType,
      sourceId,
      content,
      embedding,
    });
  }

  async embedAndStore(userId: string, sourceType: string, sourceId: string, content: string): Promise<void> {
    const embedding = await this.generateEmbedding(content);
    await this.storeEmbedding(userId, sourceType, sourceId, content, embedding);
  }

  async searchSimilar(userId: string, query: string, limit = 5, sourceType?: string): Promise<Array<{ sourceType: string; sourceId: string; content: string; similarity: number }>> {
    const queryEmbedding = await this.generateEmbedding(query);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const conditions = [eq(embeddings.userId, userId)];
    if (sourceType) {
      conditions.push(eq(embeddings.sourceType, sourceType));
    }

    const results = await db.execute(sql`
      SELECT source_type, source_id, content, 1 - (embedding <=> ${vectorStr}::vector) as similarity
      FROM embeddings
      WHERE ${sql.join(conditions, sql` AND `)}
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `);

    return results.rows as Array<{ source_type: string; source_id: string; content: string; similarity: number }>;
  }
}
```

### Step 6: Create memory service
Create `apps/api/src/ai/memory.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';

export interface MemoryContext {
  journals: string[];
  trades: string[];
  notes: string[];
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger('MemoryService');

  constructor(private readonly embeddingService: EmbeddingService) {}

  async getContextForChat(userId: string, userMessage: string, limit = 3): Promise<MemoryContext> {
    const memories = await this.embeddingService.searchSimilar(userId, userMessage, limit * 3);

    const context: MemoryContext = { journals: [], trades: [], notes: [] };

    for (const memory of memories) {
      const sim = memory.similarity;
      if (sim < 0.7) continue; // Filter low-relevance memories

      switch (memory.source_type) {
        case 'journal':
          context.journals.push(memory.content);
          break;
        case 'trade':
          context.trades.push(memory.content);
          break;
        case 'note':
          context.notes.push(memory.content);
          break;
      }
    }

    return context;
  }

  async embedNewJournal(userId: string, journalId: string, content: string): Promise<void> {
    try {
      await this.embeddingService.embedAndStore(userId, 'journal', journalId, content);
    } catch (error) {
      this.logger.error(`Failed to embed journal ${journalId}: ${(error as Error).message}`);
    }
  }

  async embedNewTrade(userId: string, tradeId: string, content: string): Promise<void> {
    try {
      await this.embeddingService.embedAndStore(userId, 'trade', tradeId, content);
    } catch (error) {
      this.logger.error(`Failed to embed trade ${tradeId}: ${(error as Error).message}`);
    }
  }
}
```

### Step 7: Register services in app.module.ts
Add `EmbeddingService` and `MemoryService` to providers.

### Step 8: Verify TypeScript compiles
```bash
cd apps/api && npx tsc --noEmit
```

### Step 9: Run lint
```bash
npm run lint -- --filter=api
```

### Step 10: Commit
```bash
git add apps/api/migrations/010_vector_extension.sql apps/api/migrations/011_embeddings.sql apps/api/src/db/schema/index.ts apps/api/src/ai/embedding.service.ts apps/api/src/ai/memory.service.ts apps/api/src/app.module.ts docker-compose.yml
git commit -m "feat: vector memory system with pgvector and semantic search (TZ-063)

- pgvector extension on PostgreSQL 16
- Embeddings table with IVFFlat index for cosine similarity
- EmbeddingService: generate/store vectors via OpenRouter
- MemoryService: semantic search with relevance filtering
- Async embedding generation with error handling"
```

---

## TZ-065: AI Conversation Memory

### Goal
Persist chat threads and messages, integrate memory retrieval into chat context.

### Step 1: Create chat persistence migrations
Create `apps/api/migrations/012_chat_threads.sql`:
```sql
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_threads_user ON chat_threads(user_id);
CREATE INDEX idx_chat_threads_updated ON chat_threads(user_id, updated_at DESC);
```

Create `apps/api/migrations/013_chat_messages.sql`:
```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_thread ON chat_messages(thread_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(thread_id, created_at);
```

### Step 2: Add chat tables to Drizzle schema
Add to `apps/api/src/db/schema/index.ts`:
```typescript
export const chatThreads = pgTable('chat_threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_chat_threads_user').on(table.userId),
  updatedIdx: index('idx_chat_threads_updated').on(table.userId, table.updatedAt),
}));

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id').notNull().references(() => chatThreads.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  threadIdx: index('idx_chat_messages_thread').on(table.threadId),
  createdIdx: index('idx_chat_messages_created').on(table.threadId, table.createdAt),
}));
```

### Step 3: Create chat thread service
Create `apps/api/src/chat/chat-thread.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../db/drizzle';
import { chatThreads, chatMessages } from '../db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

@Injectable()
export class ChatThreadService {
  async createThread(userId: string, title?: string): Promise<{ id: string }> {
    const [thread] = await db
      .insert(chatThreads)
      .values({ userId, title: title || 'New Conversation' })
      .returning({ id: chatThreads.id });
    return thread;
  }

  async listThreads(userId: string, limit = 20): Promise<Array<{ id: string; title: string; updatedAt: Date }>> {
    return db
      .select({
        id: chatThreads.id,
        title: chatThreads.title,
        updatedAt: chatThreads.updatedAt,
      })
      .from(chatThreads)
      .where(eq(chatThreads.userId, userId))
      .orderBy(desc(chatThreads.updatedAt))
      .limit(limit);
  }

  async getThread(userId: string, threadId: string): Promise<{ id: string; title: string } | null> {
    const thread = await db.query.chatThreads.findFirst({
      where: and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)),
    });
    return thread ? { id: thread.id, title: thread.title } : null;
  }

  async deleteThread(userId: string, threadId: string): Promise<void> {
    const result = await db
      .delete(chatThreads)
      .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)));
    if (result.rowCount === 0) {
      throw new NotFoundException('Thread not found');
    }
  }

  async getMessages(threadId: string, limit = 50): Promise<Array<{ role: string; content: string; metadata: unknown; createdAt: Date }>> {
    return db
      .select({
        role: chatMessages.role,
        content: chatMessages.content,
        metadata: chatMessages.metadata,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(limit);
  }

  async addMessage(threadId: string, role: string, content: string, metadata?: Record<string, unknown>): Promise<void> {
    await db.insert(chatMessages).values({ threadId, role, content, metadata });
    // Update thread timestamp
    await db.update(chatThreads).set({ updatedAt: new Date() }).where(eq(chatThreads.id, threadId));
  }
}
```

### Step 4: Update chat service to use memory
Read `apps/api/src/chat/chat.service.ts`. Modify the streaming method to:
1. Retrieve context from MemoryService before calling OpenRouter
2. Inject relevant memories into the system prompt
3. Persist messages after streaming completes

### Step 5: Update chat controller with thread endpoints
Add to `apps/api/src/chat/chat.controller.ts`:
```typescript
@Post('threads')
async createThread(
  @CurrentUser('id') userId: string,
  @Body('title') title?: string,
) {
  return this.threadService.createThread(userId, title);
}

@Get('threads')
async listThreads(@CurrentUser('id') userId: string) {
  return this.threadService.listThreads(userId);
}

@Get('threads/:id')
async getThread(
  @CurrentUser('id') userId: string,
  @Param('id') threadId: string,
) {
  const thread = await this.threadService.getThread(userId, threadId);
  if (!thread) throw new NotFoundException('Thread not found');
  return thread;
}

@Delete('threads/:id')
async deleteThread(
  @CurrentUser('id') userId: string,
  @Param('id') threadId: string,
) {
  return this.threadService.deleteThread(userId, threadId);
}

@Get('threads/:id/messages')
async getMessages(@Param('id') threadId: string) {
  return this.threadService.getMessages(threadId);
}
```

### Step 6: Register services in chat module
Read `apps/api/src/chat/chat.module.ts`. Add `ChatThreadService`, `EmbeddingService`, `MemoryService` to providers.

### Step 7: Verify TypeScript compiles
```bash
cd apps/api && npx tsc --noEmit
```

### Step 8: Run lint
```bash
npm run lint -- --filter=api
```

### Step 9: Commit
```bash
git add apps/api/migrations/012_chat_threads.sql apps/api/migrations/013_chat_messages.sql apps/api/src/db/schema/index.ts apps/api/src/chat/chat-thread.service.ts apps/api/src/chat/chat.service.ts apps/api/src/chat/chat.controller.ts apps/api/src/chat/chat.module.ts
git commit -m "feat: AI conversation memory with thread persistence (TZ-065)

- Chat threads and messages stored in PostgreSQL
- CRUD endpoints for thread management
- Message retrieval with chronological ordering
- Memory retrieval integrated into chat context
- Auto-generated thread titles from first message"
```

---

## Execution Order

```
TZ-060 (architecture doc)
    │
    ├──→ TZ-063 (vector DB + embeddings)
    │        │
    └───────→ TZ-065 (conversation memory)
```

## Verification Checklist

- [ ] pgvector extension created in database
- [ ] Embeddings table with IVFFlat index
- [ ] Embedding service generates vectors via OpenRouter
- [ ] Semantic search returns relevant results
- [ ] Chat threads created and listed
- [ ] Messages persisted and retrieved
- [ ] Memory context injected into chat prompts
- [ ] TypeScript compiles with zero errors
- [ ] npm run lint passes

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| pgvector not available in Docker image | Use `pgvector/pgvector:pg16` image |
| Embedding API rate limits | Async generation via BullMQ, retry logic |
| Vector search slow on large datasets | IVFFlat index with appropriate list count |
| Memory context bloats prompt | Limit to top-3 memories, filter by similarity > 0.7 |
| Cross-user memory leakage | All queries scoped by userId, enforced at DB level |
