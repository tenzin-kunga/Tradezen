# Semantic Architecture

**Version:** 1.0.0
**Status:** Accepted
**Last Updated:** 2026-07-08
**Compatible Since:** TradeZen v0.x

---

## Overview

The semantic subsystem makes user data (trades, journals, research, documents) semantically retrievable for AI context. It replaces two previously parallel retrieval systems with a single unified layer.

## Architectural Invariants

1. Backend is the single source of truth for AI context.
2. All semantic ingestion goes through `EmbeddingPipeline`.
3. Semantic retrieval goes through `SemanticRetrievalService`.
4. Providers never query embeddings directly.
5. Prompt construction happens only in `PromptBuilder`.
6. Embeddings are immutable (delete + recreate, never update in-place).
7. Context providers never call each other.
8. Storage providers never contain business logic.
9. Extraction never blocks user workflows (fire-and-forget).
10. Every semantic source must have a formatter.
11. Conversation replay must never execute tools. `ConversationRepository` reconstructs state only; only `Planner` decides to execute (see `apps/api/src/chat/conversation/`).
12. Persisted conversation history is an audit log, not executable state: replay reconstructs messages, never mutates business state, never replays tool execution, never writes to databases. Rehydrated tool results are stamped `historical: true` in `ConversationSerializer`.
13. Conversation memory persistence is fire-and-forget: `ConversationPersistenceService` must never break the stream.
14. AI insight narrative is presentation only: deterministic rules (`apps/api/src/ai/insights/rules/`) are the source of truth for coaching; narrative generation (`AIClient`) failure must never affect the returned insights. The LLM improves wording, never determines what is said.

---

## Data Flow

### Ingestion

```
Entity Created/Updated
        │
        ▼
Formatter (SemanticDocument)
        │
        ▼
EmbeddingPipeline
        │
        ├── Chunker (ChunkingStrategy)
        ├── EmbeddingService (OpenRouter → text-embedding-3-small)
        └── EmbeddingRepository (pgvector)
        │
        ▼
Embeddings Table
```

### Retrieval

```
User Query
        │
        ▼
ContextBuilder
        │
        ├── Provider.build(userId, request, lastUserMessage?)
        │       │
        │       ▼
        │   SemanticRetrievalService.retrieve(userId, query, intent)
        │       │
        │       ▼
        │   EmbeddingRepository.search(userId, queryVector, limit, threshold)
        │
        ├── (other providers: trades, analytics, research, portfolio, news)
        │
        ▼
    BuiltContext (blocks + metadata + warnings)
        │
        ▼
    PromptBuilder.buildSystemPrompt(context, existingPrompt)
        │
        ▼
    System Prompt → LLM
```

---

## Component Map

```
apps/api/src/ai/context/
├── context-provider.ts              ContextProvider, ContextRequest, ContextBlock, BuiltContext
├── context-builder.service.ts       Orchestrator: parallel providers, budget, caching
├── prompt-builder.ts                BuiltContext → system prompt string
├── context.module.ts                NestJS wiring
│
└── semantic/
    ├── types.ts                     SemanticSourceType, RetrievalIntent, SemanticDocument, etc.
    ├── chunker.ts                   ChunkingStrategy, DefaultChunkingStrategy
    ├── embedding-repository.ts      EmbeddingRepository interface + PostgresEmbeddingRepository
    ├── embedding-pipeline.ts        EmbeddingPipeline interface + ImmediateEmbeddingPipeline
    ├── profile-registry.ts          Intent → RetrievalProfile mapping
    ├── semantic-retrieval.service.ts  retrieve(), removeIndex(), countEmbeddings()
    ├── memory-formatter.ts          SemanticResult[] → ContextBlock
    ├── memory-provider.ts           ContextProvider adapter for semantic retrieval
    ├── metrics.ts                   SemanticMetrics interface
    ├── semantic-metrics.service.ts  Metrics accumulation + GET /semantic/metrics
    ├── normalizer.ts                Text normalization (UTF-8, whitespace, null bytes)
    ├── formatters/
    │   ├── types.ts                 SemanticFormatter<T> interface
    │   └── research-project-formatter.ts
    ├── extractors/
    │   ├── text-extractor.ts        TextExtractor interface + ExtractionResult
    │   ├── registry.ts              ExtractorRegistry
    │   ├── plain-text.extractor.ts
    │   ├── pdf.extractor.ts
    │   ├── docx.extractor.ts
    │   └── markdown.extractor.ts
    └── semantic.module.ts           NestJS wiring
```

---

## Provider Architecture

| Provider          | Priority | Timeout | Cache | Data Source                       |
| ----------------- | -------- | ------- | ----- | --------------------------------- |
| TradesProvider    | 10       | 100ms   | 30s   | trades table                      |
| MemoryProvider    | 15       | 300ms   | 30s   | embeddings (semantic search)      |
| AnalyticsProvider | 20       | 150ms   | 60s   | trades (aggregate SQL)            |
| ResearchProvider  | 30       | 200ms   | 60s   | researchProjects table            |
| DocumentsProvider | 40       | 150ms   | 60s   | researchAssets + researchProjects |
| PortfolioProvider | 50       | 150ms   | 30s   | trades (aggregate SQL)            |
| NewsProvider      | 60       | 200ms   | 300s  | stub (pending news integration)   |

All providers implement `ContextProvider`: `supports(request)` + `build(userId, request, lastUserMessage?)`.

---

## Retrieval Intents

| Intent  | Max Results | Threshold | Max Tokens | Use Case                   |
| ------- | ----------- | --------- | ---------- | -------------------------- |
| CHAT    | 15          | 0.7       | 3000       | General conversation       |
| REVIEW  | 10          | 0.7       | 1500       | Trade review               |
| REPORT  | 20          | 0.6       | 5000       | Generated reports          |
| INSPECT | 5           | 0.6       | 500        | Quick lookups              |
| COACH   | 5           | 0.75      | 1000       | Coaching (high confidence) |

---

## Data Model

### Embeddings Table

| Column       | Type         | Purpose                                                                                       |
| ------------ | ------------ | --------------------------------------------------------------------------------------------- |
| id           | uuid         | PK                                                                                            |
| user_id      | uuid         | FK → users                                                                                    |
| source_type  | varchar(50)  | trade, journal, knowledge_document, research_project, research_document, ai_insight, coaching |
| source_id    | uuid         | ID of originating entity                                                                      |
| chunk_index  | integer      | Position within document                                                                      |
| content      | text         | The text chunk                                                                                |
| content_hash | text         | Dedup hash                                                                                    |
| embedding    | vector(1536) | pgvector column                                                                               |
| metadata     | jsonb        | title, offsets, etc.                                                                          |

Indexes: `(user_id)`, `(source_type, source_id)`, `(source_type, source_id, chunk_index)`. No vector index yet.

---

## Known Limitations

- No HNSW/IVFFlat vector index (sequential scan, acceptable at current scale)
- In-memory cache (not shared across instances)
- Token estimation is approximate (`words * 1.3`)
- Two chunker implementations exist (semantic + knowledge) — to be unified
- Two embedding paths exist (pipeline + DocumentEmbedder) — knowledge docs bypass pipeline
- Journal/trade updates don't re-embed (only create triggers embedding)
- News provider is a stub
- Fire-and-forget errors are silently logged

---

## Future Roadmap

| Phase    | What                                                                     | Status                |
| -------- | ------------------------------------------------------------------------ | --------------------- |
| Phase 9  | Knowledge Ingestion (research embedding, observability, text extraction) | Complete              |
| Phase 10 | AI Actions / Tool Calling                                                | Complete              |
| Phase 11 | Conversation Memory                                                      | Complete              |
| Phase 12 | Portfolio Intelligence                                                   | Complete (2026-07-08) |
| Phase 13 | Autonomous Trading Coach                                                 | Complete (2026-07-08) |

### Insight Engine (Phase 12)

The AI insight engine is a deterministic-first rule system. The LLM only improves wording.

```
apps/api/src/ai/insights/
├── insight-context.ts     InsightContext snapshot + buildInsightContext() (analytics + advanced + behavior + portfolio)
├── insight-source.ts      InsightSource, InsightCandidate, InsightCard types
├── thresholds.ts          All tunable thresholds (centralized)
├── portfolio-metrics.ts   computeDirectionalExpectancy() — derived metric (isolated SQL)
├── rules/
│   ├── performance.rules.ts
│   ├── risk.rules.ts
│   ├── discipline.rules.ts
│   ├── consistency.rules.ts
│   ├── portfolio.rules.ts  NEW: concentration, strategy over-reliance, losing-symbol, directional imbalance
│   └── index.ts            RULES registry (push a new InsightSource to add a source)
└── ai-insights.service.ts  Orchestrator: cache → build context → run RULES → sort → dedupe → top 3 → narrative → cache
```

Design rules:

- `rules/*` are pure: `generate(ctx) => InsightCandidate[]`. No services, no DB, no DI, no LLM, no state.
- Each rule maps to one of the four coaching categories (`performance | discipline | risk | consistency`) — "portfolio" is a data source, never a category.
- `RULES` is a flat registry; adding a future source (journal, calendar, watchlist, research, macro) is additive and does not change the orchestrator.
- Narrative is generated only after deterministic cards exist, wrapped in try/catch, stored as an `ai_insights` row of type `portfolio_narrative` and shares the 6h cache TTL. `GET /ai/insights` is unchanged.

### Proactive Coaching Delivery (Phase 13)

Event-driven coaching that reaches users via real-time notifications without any scheduler.

```
Trade / Journal Created (controller)
  → NotificationTriggersService.checkAndNotify(userId)  [fire-and-forget]
    → AiInsightsService.getCoachingPush(userId)
      → buildCandidates (in-memory cache, TTL 6h) → RULES.flatMap
      → CoachingPushPolicy.evaluate(userId, candidates)
        → selectPushCandidate (pure: highest-priority pushable)
        → wasPushedRecently (ai_insights WHERE insightType='coaching_push', 24h window)
        → recordPush (stores dedupe row with metadata: ruleId, priority, pushable, source, category)
    → PushCandidate | null
  → NotificationService.create('coaching', title, message, enriched metadata)
    → Socket.IO notification:created
```

Key design:

- `InsightCard.pushable` decouples "can this interrupt the user?" from ranking priority.
- `RULE_IDS` constants give every rule a stable compile-time identifier; entity-specific rules append `:${symbol}` / `:${strategy}`.
- `InsightCandidate.priority` stays a runtime property — persisted in metadata for observability/audit, never deserialized back into runtime logic.
- `COACHING_DEDUPE_MS = 24h` — one push per rule per day. Tracked via `ai_insights` rows of type `coaching_push`.
- `COACHING_SEVERITY_BY_CATEGORY` maps category → severity for the enriched notification payload (`risk → high`, `discipline/consistency → medium`, `performance → low`).
- `NotificationTriggersService` is now wired to both controllers via fire-and-forget `.catch(() => {})` — must never break trade or journal creation.
- Legacy losing-streak coaching block replaced by the deterministic insight engine (which already surfaces losing streaks as a `consistency.losing-streak` rule with `pushable: true`).
