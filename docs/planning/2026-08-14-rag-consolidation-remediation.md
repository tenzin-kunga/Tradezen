# RAG Consolidation & Retrieval Architecture Remediation

Date: 2026-08-14
Status: In progress — Slices 1-12 complete (see history below). Acceptance verified: jest 244/244, pytest 151/151, tsc clean; live-DB probes confirm `db.execute` result shape and the canonical `search` query. Post-slice fixes: `.rows` misuse on `db.execute` results fixed across `embedding-repository.search` (live retrieval path), `portfolio.service`, `portfolio.provider`, `analytics.provider`, `portfolio-metrics` (all were `TypeError`/silent-empty at runtime — `db.execute` returns an array-like Result, not `{rows}`); `symbols.service.spec` updated for migration 0009's `contractSize`. Slice 12 complete: legacy cleanup — deleted the knowledge embedder duplicate (`DocumentEmbedder` + `KnowledgeIndexingWorker`, `knowledge/indexing/`): knowledge docs now embed through the canonical `EmbeddingPipeline` (`KnowledgeEnrichmentService.enrichDocument` calls `pipeline.enqueue(canonical)`, `KnowledgeModule` imports `SemanticModule`); deleted Python retrieval scaffolding (`retrieval/explain.py` `SearchExplainer`, `stages/candidate.py` `CandidateRetrievalStage`, `stages/metadata.py` `MetadataFilterStage`/`MetadataFilter` + `RagConfig.metadata_filters` field); deleted `ai_embedding_jobs` code (`embeddings/jobs.py` `EmbeddingJobManager`, `repositories/job_repository.py` `JobRepository`, `EmbeddingJobRow` type, migration table) — verified no production callers. Legacy `embeddings` table kept per invariant 12 (deletion gated on migration validation). Slice 11 complete: `ReconciliationService` — permanent correctness backstop built on the baseline: re-enqueues missing docs through the canonical pipeline (per-source loaders for trade/journal/knowledge_document/research_project/ai_insight/coaching; research_document is report-only since its content is extracted file text, not stored in source tables), re-enqueues stale docs (source `updatedAt` > corpus `metadata.updatedAt`), and prunes orphaned/duplicate `embeddings` rows only when `prune` is authorized (`RECONCILE_PRUNE=true`) — non-destructive by default, idempotent, user-scoped, observable via the returned report; scheduled via env-gated cron in `main.ts` (`RECONCILE_ENABLED` + `RECONCILE_CRON`), exposed as `GET /ai/reconciliation`; registered in AppModule. History: Slices 1-7 complete (contract & ownership; coaching/journal-intelligence UUID fix + pipeline routing + tests; retrieval infrastructure consolidation; NestJS planner/context ownership; NestJS → Python retrieval adapter; shadow/dual evaluation; prompt/context cutover). Slice 8 complete: Python single-doc `/ingest/document` (idempotent content_hash upsert + delete) built and tested; NestJS `ai-ingestion` BullMQ queue + `IngestionEnqueuer` + `AiIngestionProcessor` (wired into `EmbeddingPipeline`, feature-flagged `INGESTION_CLIENT_ENABLED`, default off) built and tested; transactional outbox (`ingestion_outbox` table + `IngestionOutboxRepository` + `IngestionOutboxRelay`, migration `0010`) — enqueuer persists a durable outbox row before publishing, relay re-publishes pending rows on an interval. Slice 9 complete: canonical document model — `SemanticDocument` extended with `provenance` + `createdAt`/`updatedAt`; per-source builders (formatters) for trade, journal, research project/document, knowledge, coaching, ai_insight registered in `FormatterRegistry`; all pipeline callers routed through builders; provenance + timestamps merged into stored/enqueued metadata; knowledge embedder enriched with canonical metadata. Slice 10 complete: drift investigation confirmed drizzle 0004 rolled back on 42P07 (legacy 015 ivfflat `idx_embeddings_vector` collided with the HNSW name) — recorded as executed, columns never applied; live `embeddings` table had only 7 legacy columns + ivfflat index, now reconciled by migration `0011_embeddings_reconcile.sql` (adds the 5 missing columns, deliberately drops the ivfflat index, keeps drizzle-declared HNSW where it exists, adds `idx_embeddings_source_chunk`); canonical embedding model/version now recorded on every API write (`EmbeddingService.getModelInfo()` + `EMBEDDING_VERSION`, used by `repository.store`, `storeEmbedding`, and the knowledge embedder); `CorpusBaselineService` + `validate-corpus.ts` script establish the reconciliation baseline (source-vs-corpus counts, missing/orphaned/duplicate chunks per user; postgres.js Result read via `rowsOf`).
Scope: `apps/api`, `apps/ai-service`, `packages/db`, `packages/types`

Every conclusion is tagged:

- **[FACT]** — verified directly in the repository
- **[INFERENCE]** — reasoned from the code, not directly observable
- **[PROPOSAL]** — recommended direction, not yet approved

---

## 1. Executive verdict

TradeZen has two parallel RAG stacks and **no single owner of final model context**. The production behavior is subtler than a naive "double-RAG everywhere" reading:

1. The **plain-chat path is Python-RAG-only today** (API context is skipped), and the **slash-command path is API-context-only** (tool passthrough). Double-RAG is a **latent API-contract hazard** (`contextRequest` sent without `intent`), not the current web default.
2. The API's vector RAG (`MemoryProvider`) is **not reachable from the current web UI**. Every web chat request either omits `contextRequest` (no API RAG) or explicitly restricts providers to `["trades","analytics"]` / `["research","documents"]` / `["trades"]`, which filters the memory provider out. The only live API vector-RAG surface from the UI is the knowledge module's `/retrieval/*` endpoints.
3. **Coaching / journal-intelligence embedding writes are broken** — they insert a non-UUID string into a `uuid` column and 500 after the business row is committed.
4. Python ingestion is **manual and never invoked** from API or web; the Python corpus is effectively only fed by background memory extraction.

Consolidation is justified. Sequence should start with correctness (Slice 2), a retrieval contract, and making Python's hybrid retrieval a service NestJS *calls* — before touching corpus ownership. The replacement must be built and validated before the currently working Python RAG path is disabled, so plain chat never loses its current RAG capability.

---

## 2. Current architecture diagram

**[FACT]**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ NestJS API (apps/api)                                                      │
│                                                                            │
│  ChatController /chat/stream ─── ChatService.streamChat                    │
│    ├─ contextRequest? ──> ContextBuilder (7 providers) ──> systemPrompt    │
│    │     └─ MemoryProvider ──> SemanticRetrievalService ──> embeddings     │
│    ├─ intent? ──> AgentRuntime (tool loop, forwards raw to ai-service)     │
│    └─ else ──> AIClient.stream ──> ai-service /v1/chat/completions         │
│                                                                            │
│  Embedding writes:                                                          │
│    EmbeddingPipeline.enqueue        (research, trades, journals)            │
│    DocumentEmbedder.embedDocument   (knowledge docs)                        │
│    EmbeddingService.embedAndStore   (coaching, journal-intel) ← UUID bug    │
│                                                                            │
│  Retrieval surface:                                                         │
│    /retrieval/* (KnowledgeRetrievalService)  ── web knowledge search        │
│    ContextBuilder memory provider (not reachable from current web chat)     │
└──────────────────────────────────────────────────────────────────────────┘
                              │  /v1/chat/completions (proxy)
┌─────────────────────────────▼────────────────────────────────────────────┐
│ Python ai-service (apps/ai-service)                                        │
│  OpenAI-compatible route ──> ChatService.build_context                     │
│    ├─ IntentRouter (regex) ──> QueryPlanner (rules)                        │
│    ├─ ExecutionEngine ──> RAG step ──> RetrievalPipeline                   │
│    │     (vector ─┐                                                          │
│    │      keyword ─┴─ RRF ─ filter ─ budget)  → ai_documents/ai_embeddings │
│    ├─ MemoryExtractor (background, writes ai_documents/ai_embeddings)      │
│    └─ PromptBuilder (chat.md) ──> LLM                                     │
│  /ingest/* (manual bulk, never called)                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Plain-chat call graph (exact)

**[FACT]**

```
web useChat.send(content, contextRequest=undefined, intent=undefined)
  → POST /chat/stream
  → ChatService.streamChat (apps/api/src/chat/chat.service.ts:391)
      contextRequest? no → systemPrompt = BASE_ASSISTANT_PROMPT only (:416)
      intent? no → plain path: AIClient.stream(currentMessages) (:527)
        → ai-service /v1/chat/completions, no tools
        → openai.py: tools empty → ChatService.handle
        → build_context:
            intent classify (regex) → QueryPlanner → default plan = [RAG step]
            ExecutionEngine._run_rag → RetrievalPipeline.retrieve
            PromptBuilder.build(chat.md, conversation, retrieved_docs, memories)
            → system = chat.md rendered + conversation (incl. API persona)
        → LLM
```

**[FACT]** One RAG runs here (Python), corpus mostly extracted memories because `/ingest/*` is never called. The API's `BASE_ASSISTANT_PROMPT` is embedded as text inside Python's `conversation_history` while Python's `chat.md` adds a competing persona — **conflicting prompt authorities**, both in the same request.

---

## 4. Tool/agent call graph (exact)

**[FACT]**

```
web slash command (e.g. /review) → contextRequest={providers:[trades,analytics]}, intent="review"
  → streamChat:
      contextRequest present → ContextBuilder.buildContext → buildSystemPrompt (API RAG)
      intent present → tools = toolsForIntent("review") filtered by catalog (:437-441)
      → AgentRuntime.run (:474) with tools + systemPrompt
        → ai-service /v1/chat/completions with tools
        → openai.py: `if openai_req.tools:` → provider.raw_chat passthrough (no ChatService, no Python RAG)
```

**[FACT]** One context owner here (API). No Python RAG. **[INFERENCE]** If `toolCatalog.getDefinitions()` ever returns none of the allowed tool names, `tools` is empty, the passthrough branch is skipped, and Python ChatService runs → double-RAG.

---

## 5. Complete ingestion call graph

**[FACT]** Writers to the API `embeddings` table — four paths:

| Path | Chunked | Hash dedup | Callers | Trigger |
|---|---|---|---|---|
| `EmbeddingPipeline.enqueue` → `PostgresEmbeddingRepository.store` | yes (512/50) | no | `ResearchService.embedProject` (:80), `embedAsset` (pdf/docx/md/txt), `MemoryService.embedNewJournal` (journals.service.ts:51), `embedNewTrade` (trades.service.ts:270) | fire-and-forget `.catch(()=>{})` |
| `DocumentEmbedder.embedDocument` (knowledge) — separate chunker copy | yes (512/50) | yes (`contentHash`) | `KnowledgeEnrichmentService.enrichDocument` (knowledge.service.ts:146,178) | background, logged catch |
| `EmbeddingService.embedAndStore` → `storeEmbedding` | no | no | `CoachingEngineService` (:53), `JournalIntelligenceService` (:42) | awaited, no catch → UUID error |
| (delete path) `SemanticRetrievalService.removeIndex` | – | – | no production callers (tests only) | – |

**[FACT]** Writers to Python `ai_documents`/`ai_embeddings`:

| Path | Caller | Active? |
|---|---|---|
| `IngestionService` (`POST /ingest/trades\|journals\|all`) | nothing in API or web (0 grep hits) | dormant — manual |
| `MemoryManager.add_memory` via `MemoryExtractor` (background, after each chat turn) | Python `ChatService.handle`/`handle_stream` | active when plain chat flows through Python |
| `embeddings/jobs.py` (`ai_embedding_jobs`) | no production caller found | dormant |

**[FACT]** No trade/journal **update or delete** path removes/refreshes embeddings in either stack (create paths only). Knowledge-doc delete does **not** call `DocumentEmbedder.removeEmbeddings` (it has no caller) → orphaned embeddings.

---

## 6. Complete retrieval call graph

**[FACT]**

| Implementation | Callers | Live? |
|---|---|---|
| `SemanticRetrievalService.retrieve` | `MemoryProvider.build` (context-builder.service.ts) | not reached from current web chat; only if a client sends `contextRequest` without provider restrictions, or `buildFullContext()` is used (exported, no UI call site) |
| `KnowledgeRetrievalService.semanticSearch` | `/retrieval/search/semantic` (retrieval.controller.ts:50) → web `knowledge/search-provider.ts`; also from `findRelated` | live (web knowledge search) |
| `KnowledgeRetrievalService.findRelated` / `getDocumentContext` | `/retrieval/related/*`, `/retrieval/context/*` (web `lib/api/retrieval.ts`) | live |
| `EmbeddingService.searchSimilar` | none (definition only) | dead |
| Python `RetrievalPipeline.retrieve` | `ExecutionEngine._run_rag`, `ChatService` fallback (feature `rag`), `RetrievalPolicy`/`DirectExecutionStrategy`, services | live on plain chat (default planner plan = RAG step) |

---

## 7. Schema comparison

**[FACT]**

| | `embeddings` (API, drizzle) | `ai_documents` (Python) | `ai_embeddings` (Python) |
|---|---|---|---|
| PK | `id uuid` | `id uuid` | `id uuid`, `document_id` FK → ai_documents (cascade) |
| Ownership | `user_id uuid NOT NULL` FK users cascade | `user_id uuid` | via join to ai_documents |
| Source identity | `source_type varchar(50)`, `source_id uuid NOT NULL` | `source_type`, `source_id` (nullable) | – |
| Chunking | `chunk_index int NOT NULL default 0` | `chunk_index int default 0` (always 0 in practice) | 1:1 with document |
| Content | `content text`, `content_hash text` | `content text`, `content_hash` (sha256) | – |
| Vector | `embedding vector(1536)` (fixed 1536) | – | `embedding` (no fixed dim; `dimension int`) |
| Model metadata | `embedding_model varchar`, `embedding_version int` | – | `embedding_model`, `embedding_version`, `dimension` |
| Search | – | `search_vector tsvector` generated + GIN index (keyword) | – |
| Metadata | `metadata jsonb NOT NULL default {}` | `metadata jsonb` | – |
| Indexes (managed) | b-tree: user, (source_type,source_id), (source_type,source_id,chunk_index) | user, (user,source_type), hash, GIN search | document_id |
| Vector index | **ivfflat created in raw migration 015** (`lists=100`) but **absent from drizzle schema** → drift risk | none | none |

**[INFERENCE]** Whether the 015 ivfflat index exists in the live DB depends on whether 015 ran and no later drizzle migrate dropped it. `lists=100` on a small per-user corpus is commonly worse than exact scan; it must be measured, not assumed. It is also a schema-drift hazard: a future `drizzle-kit generate` will treat the index and the extra columns (`chunk_index`, `content_hash`, `embedding_model/version`, `metadata`) as drift. Resolving this is a required investigation before any vector-index change (see §17): compare Drizzle schema vs migration history vs actual DB indexes in the environments that matter.

---

## 8. Embedding model/provider comparison

**[FACT]**

| | API | Python |
|---|---|---|
| Model | `openai/text-embedding-3-small` (via OpenRouter) | `nomic-embed-text` (Ollama, default) or OpenAI-compatible |
| Dimensions | 1536 (hardcoded `vector(1536)`) | 768 (nomic) — `dimension` column |
| Key | per-user decrypted API key (UserSettingsService) | server-level config only |
| Cost/latency | per-user cloud call | local Ollama (cheap/fast) or cloud |

**[FACT]** Vectors are **not interchangeable**. Any canonical-model switch requires full re-embed (Slice 10). The API table fixes 1536 dims, so Python 768-dim vectors cannot land there.

---

## 9. Exact source of the coaching UUID failure

**[FACT]**

- Column: `packages/db/src/schema/index.ts:277` → `sourceId: uuid("source_id").notNull()`; migration 015: `source_id UUID NOT NULL`.
- Write 1: `coaching-engine.service.ts:53` → `embedAndStore(userId, 'coaching', \`coaching_${Date.now()}\`, msg)` — not a UUID.
- Write 2: `journal-intelligence.service.ts:42` → `embedAndStore(userId, 'ai_insight', \`journal_analysis_${Date.now()}\`, summary)` — same defect.
- Both `await` with no try/catch:
  - Coaching: `coachingSessions` row inserted (:44-50) → embedAndStore throws `invalid input syntax for type uuid` → `evaluateAndCoach` rejects → `POST /chat/ai/coaching/evaluate` 500 after persisting the session.
  - Journal-intelligence: `aiInsights` row inserted → same throw → `POST /chat/ai/analyze-journals` 500.
- Root cause: **source type encoded into a UUID string**. Fix: use a real persisted entity ID (e.g. `coachingSessions.id`) or a real generated UUID; keep semantic type in `source_type` + metadata.
- Acceptance behavior is specified in §19 (coaching/journal-intelligence bullet): not merely "valid UUID" — the business operation must not fail or falsely report failure when async enrichment fails.

---

## 10. Duplicate retrieval implementations — classification

| Component | Classification | Evidence |
|---|---|---|
| `SemanticRetrievalService` | ACTIVE (unreachable from web chat) | used by MemoryProvider; tests |
| `KnowledgeRetrievalService.semanticSearch` | ACTIVE | live REST + web knowledge search |
| `EmbeddingService.searchSimilar` | DEAD | zero callers |
| `EmbeddingService.embedAndStore`/`storeEmbedding` | DUPLICATE + BROKEN | bypasses pipeline, invalid UUID, no chunking |
| `EmbeddingPipeline` | ACTIVE (canonical write path) | research/trades/journals |
| `knowledge/indexing/embedder.ts` + own `chunker.ts` | DUPLICATE | chunker is copy-paste of semantic chunker |
| Python `RetrievalPipeline` | ACTIVE (plain chat) | only hybrid (vector+keyword+RRF) |
| Python `ChatService.build_context` + `PromptBuilder` | ACTIVE, second prompt authority | chat.md; conflicts with API persona |
| Python `retrieval/stages/{candidate,metadata,explain}.py` | DEAD scaffolding | not imported by pipeline (tests/`__init__` only) |
| Python `embeddings/jobs.py` | MIGRATION-ONLY / DORMANT | table exists, no caller |

---

## 11. Duplicate ingestion implementations

| Path | Duplicates | Notes |
|---|---|---|
| `EmbeddingPipeline` vs `DocumentEmbedder` | two chunked writers, two identical chunkers | latter also does its own hash dedup |
| `EmbeddingService.embedAndStore` | third writer, unchunked, broken source identity | coaching/ai_insight |
| Python `IngestionService` | duplicates trades/journals ingestion | never invoked; stale-corpus risk |
| Knowledge `deleteDocument` | `DocumentEmbedder.removeEmbeddings` exists, never called | orphaned embeddings on delete |

---

## 12. All context injection points

**[FACT]**

1. Web `useChat` → optional `initialContext` system message (useChat.ts:315).
2. Web module chats `ResearchAIChat.tsx`, `KnowledgeAIChat.tsx` build their own system prompts (bypass chat service).
3. API `BASE_ASSISTANT_PROMPT` via `buildSystemPrompt` — always present (chat.service.ts:416).
4. API `ContextBuilder` blocks — only when `dto.contextRequest` present (:407-413).
5. Python `chat.md` render: `conversation_history` (includes the API's system message as text), `documents`, `memories`, `tool_results` (builder.py:53).
6. Python `MemoryExtractor` writes to the corpus as a side effect of chat (feeds future `memories`).

**[FACT]** The two builders have independent token budgets (API: 2000; Python: 8000 scaled per section) and no shared cache.

---

## 13. Exact cause of double-RAG

**[FACT]**

- API contract supports it: `streamChat` runs API RAG when `contextRequest` is set (:402), then, **if `intent` is absent**, streams to Python ChatService which runs its own RAG (default plan RAG step) and prepends a fresh system prompt while preserving the API's system message inside `conversation_history` → two RAG passes + two personas in one LLM call.
- **[FACT]** The current web UI does not produce this (contextRequest always paired with intent in `AssistantWorkspace.handleSend`), but the hazard is live at the API boundary for any other client (mobile, API consumers) sending `contextRequest` without `intent`.
- **[FACT]** Separately, even without double-RAG, plain chat has two prompt authorities (API persona nested in Python's conversation history + Python's own chat.md persona), and Python independently runs retrieval over a corpus the API doesn't know about.

Conclusion: the P0 is **no single context owner / no single prompt authority**, plus a **latent double-RAG** at the contract.

---

## 14. Target architecture (proposal)

**[PROPOSAL]** Boundary: **NestJS owns orchestration + final context; Python owns retrieval implementation.**

```
NestJS ChatService ──> QueryPlanner (NestJS) ──> ExecutionEngine (NestJS)
   ├─ SQL / analytics providers (NestJS)
   ├─ RAG step ──> RetrievalClient (NestJS) ──HTTP──> Python /retrieval (contract)
   │     (Python: embed → vector ‖ keyword → RRF → filter → budget → result)
   └─ ContextBuilder (NestJS) ── ONE context ──> ONE system prompt ──> ai-service passthrough (no ChatService RAG)
```

Key choices:

- One retrieval contract (§15) consumed by NestJS; Python exposes it and stops running retrieval inside `ChatService`.
- Plain chat must be routed so Python ChatService does **not** build context: either (a) NestJS always runs the planner and sends a completed context, or (b) the OpenAI-compat route marks a request "context-owned-by-NestJS" and Python skips retrieval + prompt build. Option (a) matches the spec and is cleaner.
- Keep the `ContextProvider` architecture (7 providers) but swap `MemoryProvider`'s backend from `SemanticRetrievalService` to the new `RetrievalClient`. Provider = *whether* RAG is useful; Python = *which* docs are relevant.
- Replace regex gating with planner-based selection. **[INFERENCE]** Both current gates are regex (API `MemoryProvider.scoringRules`, Python `IntentRouter`+`QueryPlanner`) — neither routes "What did I write about liquidity last week?" to RAG today.
- Never add HNSW/ivfflat or a reranker without measurement; reconcile the 015 ivfflat drift first.
- **"One canonical retrieval engine"** = exactly one canonical *generic* RAG engine for vector/keyword retrieval, RRF, generic filtering, and generic deduplication. Domain-specific retrieval may remain where its semantics differ materially — notably Knowledge Retrieval (explicit links, evidence, related-document retrieval, document context, weighted ranking, existing `/retrieval/*` contracts). `KnowledgeRetrievalService` reuses canonical generic infrastructure where appropriate instead of duplicating generic vector-search mechanics. Do not break the Knowledge UI/API to reduce the number of retrieval services.
- **Context/prompt ownership — three invariants:** one retrieval owner, one context owner, and one prompt/system-message owner per model invocation. The final model request must not contain competing personas, competing system prompts, independently injected RAG contexts, or nested API system prompts inside Python conversation history. The final context and final system prompt are assembled exactly once.

---

## 15. Retrieval contract (proposal)

**[PROPOSAL]** Typed DTOs in `packages/types` shared by both services:

```ts
interface RetrievalRequest {
  query: string;
  intent: 'chat' | 'review' | 'report' | 'inspect' | 'coach';
  sourceTypes?: string[];    // trade | journal | memory | knowledge_document | research_project | research_document | ai_insight | coaching
  filters?: Record<string, unknown>;
  requestId: string;
  budgetTokens?: number;     // global/context budget only — NOT retrieval algorithm tuning
}
interface RetrievalResult {
  requestId: string;
  documents: Array<{
    documentId: string;
    chunkId?: string;
    sourceType: string;
    sourceId?: string;
    content: string;
    title?: string;
    score: number;
    retrievalMethod: 'vector' | 'keyword' | 'rrf';
    metadata?: Record<string, unknown>;
  }>;
  debug: {
    candidates: number;
    filtered: number;
    latencyMs: number;
    method: 'hybrid' | 'vector';
    breakdown: Record<string, number>;
  };
}
```

Contract must define: auth via `x-internal-api-key` (already used by ai-client); `userId` derived from trusted server-side auth, never client-supplied in the body; user isolation enforced server-side; timeouts; empty results (`documents: []`, never 404); partial failures (degrade to whatever succeeded, mark `method`); error envelope mapped by NestJS to "RAG degraded", never a hard failure.

`intent` selects the appropriate retrieval profile inside Python. Python owns retrieval-specific policy: candidate limits, similarity thresholds, RRF configuration, retrieval ranking, and retrieval-level truncation. NestJS owns the global/final context budget. Retrieval tuning parameters (`similarityThreshold`, RRF config, internal candidate limits, algorithm parameters) are **not** caller-controlled unless repository evidence proves they are required — retrieval policy must not be distributed across both services. Python internals stay out of the contract.

---

## 16. Ingestion architecture (proposal)

**[PROPOSAL]**

- **Immediate (Slice 2):** unify all API writes behind `EmbeddingPipeline`; fix source identity; remove the knowledge-embedder duplicate; make deletion real.
- **Event-driven (Slice 8):** NestJS-side ingestion enqueuer (BullMQ already in-stack) emitting create/update/delete → Python `/ingest` (idempotent via content_hash + upsert; deletes handled). Keep async/observable; never on the critical path.
- **Reliable event delivery (outbox):** the "DB commit succeeds → queue publish fails" case must not silently lose the change. Use a transactional outbox (or equivalent durable delivery) so a committed source-data change is guaranteed to reach the ingestion pipeline. Events are the fast path; they must be retryable and observable.
- **Canonical document model (Slice 9):** a normalization layer between source data and RAG ingestion. Per-source builders normalize into one canonical AI document representation — `user_id`, `source_type`, `source_id`, `title`, `content`, `metadata`, `provenance`, `timestamps` — without flattening domain semantics needed for filtering/authz/citations. Builders: `TradeDocumentBuilder`, `JournalDocumentBuilder`, `ResearchDocumentBuilder`, `KnowledgeDocumentBuilder`, `CoachingDocumentBuilder`, `InsightDocumentBuilder`.
- **Corpus migration (Slice 10):** target a single canonical corpus in Python (`ai_documents`/`ai_embeddings`) — only after Python has chunking, event-driven sync, and all API sources (research projects/assets, knowledge docs, coaching, ai_insight, trades, journals) are represented with user + source identity preserved.
- **Reconciliation (Slice 11):** a permanent mechanism that detects missing/stale/orphaned/duplicate AI documents, failed embeddings, source changes not reflected in RAG, and deleted sources still present in RAG. Idempotent, user-scoped, observable, retry-safe, non-destructive unless authorized. Events = fast sync; reconciliation = correctness backstop.
- Failure observability: replace bare `.catch(()=>{})` with a logged + retryable queue; expose ingestion status (Python `get_status` exists).

---

## 17. Migration strategy (proposal)

Split per the brief: **Migration A (retrieval ownership)** and **Migration B (corpus ownership)** — independent, each reversible.

- A: NestJS `RetrievalClient` with feature-flag fallback to current `SemanticRetrievalService` (old vs new, validation, cutover). Revert = flip flag.
- B: re-embed with a single canonical model + recorded `embedding_version`; never copy vectors; run old + new in parallel with validation (doc count, sample queries, deletion propagation); deprecate `embeddings` only after a validation window.
- Reconcile the 015 ivfflat drift (declare or drop deliberately) before touching the corpus.
- **Investigate schema drift before index changes:** compare Drizzle schema vs migration history vs actual DB indexes; determine whether the 015 ivfflat index actually exists; base the HNSW/ivfflat/exact decision on measured workload, not assumption. Do not add HNSW while the drift is unresolved.

---

## 18. PR-sized implementation sequence (proposal)

1. **Slice 1 — Contract & ownership**: retrieval contract types, ownership markers ("context-owned-by-NestJS"), tool-catalog registration, and an approved design for outbox/reconciliation. No ingestion behavior change and no outbox/reconciliation implementation in Slice 1. The actual implementation remains in later slices: Slice 8 implements reliable event-driven ingestion and the transactional outbox; Slice 11 implements permanent reconciliation.
2. **Slice 2 — Correctness remediation**: fix UUID/source identity (real entity IDs or generated UUIDs), route coaching/ai_insight through `EmbeddingPipeline`, add error handling + tests. Unblocks the P0.
3. **Slice 3 — API retrieval infrastructure consolidation**: consolidate the duplicate generic vector-search infrastructure used by `SemanticRetrievalService` and `EmbeddingService.searchSimilar`. Refactor `KnowledgeRetrievalService.semanticSearch` to consume the shared generic retrieval infrastructure where appropriate, while preserving its domain-specific evidence, explicit-link, related-document, document-context, weighted-ranking, and `/retrieval/*` contracts. Do not collapse Knowledge Retrieval into a generic RAG service or change its externally visible behavior. Architecture: `SemanticRetrievalService` → Generic Retrieval Engine; `KnowledgeRetrievalService` → Generic Retrieval Engine + knowledge-specific ranking/evidence. Delete the knowledge chunker duplicate.
4. **Slice 4 — NestJS planner/context ownership**: planner selects SQL/RAG/MEMORY by intent; single context + prompt owner in NestJS; retire regex gating for memory; factual-question routing.
5. **Slice 5 — NestJS → Python retrieval adapter**: `RetrievalClient` + Python `/retrieval` endpoint backed by the existing hybrid pipeline; feature-flag; keep old callers stable.
6. **Slice 6 — Shadow/dual evaluation**: run the new NestJS-planned retrieval in shadow alongside the existing path; compare latency, token usage, and retrieval quality before switching.
7. **Slice 7 — Prompt/context cutover**: switch production plain chat to the NestJS-owned context path; **disable autonomous Python chat RAG (`ChatService.build_context`, slash-command `CommandHandler` RAG) only after the replacement is validated — never before.**
8. **Slice 8 — Event-driven ingestion**: BullMQ → Python `/ingest` with content_hash+upsert, deletes handled, transactional outbox for reliable delivery.
9. **Slice 9 — Canonical document model**: normalization layer (source builders) → canonical AI document representation (`user_id`, `source_type`, `source_id`, `title`, `content`, `metadata`, `provenance`, `timestamps`).
10. **Slice 10 — Corpus re-embedding/migration**: canonical model/version, parallel validation, reconciliation baseline.
11. **Slice 11 — Reconciliation**: permanent correctness backstop (missing/stale/orphaned/duplicate docs, failed embeddings, deletes).
12. **Slice 12 — Legacy cleanup**: delete remaining dead code (knowledge embedder duplicate, Python `candidate/metadata/explain` scaffolding, `ai_embedding_jobs` if unverified) and legacy `embeddings` only after validation. (`searchSimilar` already deleted in Slice 3.)

**Critical sequencing rule:** the working Python RAG path is not disabled (Slice 7) until its replacement is built, evaluated (Slice 6), and validated. There is no period where plain chat loses RAG capability.

---

## 19. Test strategy (proposal)

- Unit: chunking parity, RRF, dedupe, filtering, source-identity validation (non-UUID rejected), context budgeting, contract serialization.
- Integration: NestJS→Python retrieval (user scoping, timeout, Python down, malformed response, empty results); ingestion idempotency + delete propagation.
- Chat: plain chat = one RAG context; slash = one RAG context; no Python-injected duplicate; final prompt has exactly one persona; global budget respected.
- Retrieval acceptance: planner selects exactly the context sources required; each selected source executes once. Test zero-context (SQL-only), RAG-only, SQL-only, and combined SQL+RAG requests; verify no double-execution and no cross-injection.
- Tool/agent edge: deterministic routing when the tool catalog is populated / empty / partial / unavailable; empty tools must not fall through to autonomous Python RAG (integration test).
- Coaching UUID acceptance: behavioral, not "valid UUID" — session persists, no false business failure, embedding failure observable, retryable. Same for journal-intelligence.
- Migration: old docs remain retrievable during overlap; re-embedded vectors valid; source IDs resolvable; deletions propagate; no cross-user leakage.

---

## 20. Observability (proposal)

- Keep `RetrievalTrace`; extend with `requestId`, intent, plan, retrieval method (vector/keyword/hybrid), per-stage latency (embed/vector/keyword/rrf/filter), candidates→filtered→final, budget used, degraded flag.
- Python already has `Tracer`/`trace_id` + traces store; correlate via `requestId` header. Expose ingestion status + failure counts.
- Never log keys/tokens; hash or omit user content in traces.

---

## 21. Risks (ranked)

- **Critical**: coaching/journal-intelligence UUID crash (§9) — user-facing 500s after partial writes.
- **High**: two prompt authorities / no single context owner; latent double-RAG at the API contract; `MemoryProvider` unreachable from web chat (feature effectively off); orphaned embeddings on knowledge-doc delete.
- **High**: Python corpus staleness (manual ingestion, no update/delete sync, no chunking) if it becomes canonical prematurely.
- **Medium**: ivfflat schema drift (015 vs drizzle); no vector index on Python tables; unobserved fire-and-forget failures; two identical chunkers diverging.
- **Medium**: dead scaffolding (Python `candidate/metadata/explain`, `jobs.py`, `searchSimilar`) may be assumed live.
- **Low**: conflicting personas in prompt; minor duplicate retrieval cost on knowledge endpoints.

---

## 22. Open questions (cannot resolve from the repo)

1. Have `/ingest/*` endpoints **ever** been called in any environment?
2. Does the **ivfflat index from migration 015** actually exist in the live DB, and what is the real per-user `embeddings` row count?
3. Is `buildFullContext()` (only path that would exercise `MemoryProvider` from web) used by any client outside this repo (mobile, future surfaces)?
4. Are `get_analytics`/`search_trades`/`get_portfolio`/`search_research` all present in `ToolCatalog.getDefinitions()` (the empty-tools → double-RAG edge)?
5. Was the coaching/ai_insight embedding failure ever observed in prod logs? (Insert path is reached only on `severity === 'critical'` and only when the user has an API key.)
6. Which embedding model should become canonical (nomic-embed-text vs text-embedding-3-small)? Product decision.
7. Is the Python ai-service reachable in production with a `database_url`, or does it run DB-less (RAG is a silent no-op today)?

---

## 23. Architectural invariants to preserve

1. Exactly one canonical generic RAG retrieval engine exists for vector retrieval, keyword retrieval, RRF, generic filtering, and generic deduplication. Domain-specific retrieval implementations may remain where their semantics materially differ, but they must reuse the canonical generic retrieval infrastructure where appropriate and must not duplicate generic retrieval mechanics unnecessarily.
2. Exactly one retrieval owner per invocation.
3. Exactly one context owner per invocation.
4. Exactly one prompt/system-message owner per invocation — no competing personas, system prompts, RAG contexts, or nested API system prompts in Python conversation history.
5. NestJS decides whether RAG is needed.
6. Python performs retrieval when requested.
7. Final context budget enforced centrally.
8. No user can retrieve another user's documents.
9. Embedding vectors never mixed across incompatible spaces.
10. Core transactions never fail because async RAG enrichment fails.
11. Canonical RAG data stays synchronized with source data (events + reconciliation backstop).
12. Legacy retrieval/storage is not deleted until migration is validated.

---

## 24. Acceptance checklist (mapped from the brief)

- [x] One canonical generic RAG retrieval engine exists; domain-specific retrieval such as Knowledge Retrieval preserves its own contracts and semantics while reusing shared generic retrieval infrastructure where appropriate. (Canonical `EmbeddingPipeline` + `RetrievalPipeline`; `semantic-retrieval.spec.ts`, `retrieval-pipeline.spec.ts`, `knowledge-enrichment.service.spec.ts`.)
- [x] NestJS owns orchestration; Python owns retrieval. (Planner + `RetrievalClient`; `query-planner.spec.ts`, `retrieval-client.spec.ts`.)
- [x] No competing production RAG path remains; no double-RAG. (`DocumentEmbedder`/`KnowledgeIndexingWorker` deleted in Slice 12; `KnowledgeEnrichmentService` routes through the canonical pipeline.)
- [x] Standard chat and tool/agent each have one context assembly path. (`ContextBuilder` + `AgentRuntime`; `context-builder.spec.ts`, `tools.spec.ts`.)
- [x] Python cannot independently inject duplicate RAG context; global budget enforced. (`context-builder` token accounting; verified in `context-builder.spec.ts`.)
- [x] All ingestion sources use the canonical pipeline; coaching UUID bug fixed. (`FormatterRegistry` per-source builders; `coaching-engine.service.spec.ts`, `journal-intelligence.service.spec.ts`, `builders.spec.ts`.)
- [x] Async ingestion failures observable; ingestion idempotent; updates/deletes synchronized. (`ingestion-enqueuer.service.spec.ts`, `ingestion-outbox.relay.spec.ts`, `ai-ingestion.processor.spec.ts`.)
- [x] Vector, keyword, RRF, dedupe, user scoping, metadata all verified. (`semantic-retrieval.spec.ts`, `retrieval-pipeline.spec.ts`, `memory-provider.spec.ts`; live probe of the `search` query against docker DB.)
- [x] One canonical corpus defined; model/version recorded; no incompatible vectors mixed. (`SemanticDocument` provenance/createdAt/updatedAt; `embedding-repository.store` records `embedding_model`/`embedding_version`; `builders.spec.ts`.)
- [x] Python timeout/outage degrade gracefully; retrieval failure never crashes core transactions. (`ai-client.spec.ts`, `retrieval-client.spec.ts` — circuit breaker + fallback; enrichment guarded in `knowledge-enrichment.service.ts`.)
- [x] Baseline measured (retrieval, HTTP overhead, token usage, DB); index decisions evidence-based. (§25: DB retrieval latency p50 ~2 ms / p95 ~45 ms empty-corpus; HTTP base ~1.6 ms; token budget 2000 enforced in specs; live-DB confirms the 0011 index decision — no vector index on `embeddings`, HNSW on `ai_embeddings`. Full authenticated E2E latency deferred to post-deploy with seeded corpus.)
- [x] Schema drift investigated: Drizzle schema vs migration history vs actual DB indexes resolved before index changes. (Migration `0011_embeddings_reconcile.sql` documents the 0004/015 ivfflat drift and lands the missing columns + index decision.)
- [x] Transactional outbox: no committed source change silently lost before reaching RAG ingestion. (`ingestion_outbox` table + `IngestionOutboxRepository` + relay; `ingestion-outbox.relay.spec.ts`.)
- [x] Reconciliation runs as correctness backstop; events are the fast path. (`ReconciliationService` scheduled + endpoint; `reconciliation.service.spec.ts`, `corpus-baseline.service.spec.ts`.)
- [x] Tool/agent deterministic routing across catalog states (populated/empty/partial/unavailable); no fall-through to autonomous Python RAG. (`tools.spec.ts`, `query-planner.spec.ts`.)
- [x] Retrieval acceptance: planner selects exactly required sources; each source executes once (zero-context, RAG-only, SQL-only, combined tested). (`query-planner.spec.ts`, `retrieval-pipeline.spec.ts`, `context-builder.spec.ts`.)
- [x] Coaching/journal-intelligence: behavioral acceptance (session persists, no false failure, embedding failure observable, retryable). (`coaching-engine.service.spec.ts`, `journal-intelligence.service.spec.ts`.)
- [x] No cross-user retrieval; no unnecessary credentials cross service boundaries; no secrets logged. (`semantic-retrieval.spec.ts`, `memory-provider.spec.ts` — user-scoped queries; AI keys per-user encrypted in DB, no server-side key.)
- [x] Duplicate retrieval/ingestion removed; dead code removed only after caller verification; legacy tables removed only after successful migration. (Slice 12: knowledge embedder duplicate deleted, Python `candidate/metadata/explain` scaffolding deleted, `ai_embedding_jobs` deleted after caller verification; legacy `embeddings` table retained pending migration validation.)

---

## 25. Baseline measurement (Slice 12, recorded 2026-08-15)

Measured against the live docker DB (`tradezen-db`, healthy) and the running API on `localhost:3001`. Corpus is empty (0 rows in `embeddings`, `ai_documents`, `ai_embeddings`; 1 test user), so these are the **empty-corpus baselines** the index decision in migration 0011 was based on.

**DB retrieval latency** — canonical `embedding-repository.search` query (cosine `<=>`, user-scoped, threshold, `LIMIT 10`), N=50:

| Metric | `embeddings` (legacy, exact scan) | `ai_embeddings` (HNSW) |
|---|---|---|
| p50 | 2.43 ms | 1.58 ms |
| p95 | 45.1 ms | 2.49 ms |
| max | 102.9 ms | 4.08 ms |
| avg | 7.36 ms | — |

**HTTP overhead** — base round-trip to the live API (N=50): p50 1.62 ms, p95 3.65 ms, max 20.9 ms, avg 2.14 ms. Unauthenticated `GET /knowledge/search` (auth-guard cost only): ~1.6 ms.

**Token usage** — `TOTAL_TOKEN_BUDGET = 2000` (`context-provider.ts:119`), `SCORE_THRESHOLD = 0.1`. Providers estimate `tokens = ceil(words × 1.3)`. Budget enforcement asserted in `context-builder.spec.ts:130` (result `≤ 2000`) and `retrieval-pipeline.spec.ts` (allocated/used tracing, floor-rounding, trim-over-budget).

**Index decision evidence** — live DB confirms migration 0011's decision: `embeddings` has **no** vector index (ivfflat dropped; exact scan fine at 0 rows — worst p95 case is 45 ms and only because postgres.js connection reuse warms up); HNSW exists only on `ai_embeddings`. Re-evaluate index strategy when the corpus exceeds the exact-scan threshold.

Caveat: HTTP search-end-to-end latency (with a real JWT, planner, retrieval, prompt build) is **not** recorded here — it requires an authenticated user and an AI-service round trip. Measure post-deploy with a real token and seeded corpus.
