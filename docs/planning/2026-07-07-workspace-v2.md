# TradeZen Workspace v2 — Implementation Plan

**Status:** Phases 4-13 complete (Research + Portfolio + Assets + AI Workspace + Context Builder + Semantic Retrieval + Research Embedding + Observability + Document Extraction + Architecture Doc + AI Actions + Conversation Memory + Portfolio Intelligence + Autonomous Coaching)
**Created:** 2026-07-07
**Branch:** `develop`

---

## Architecture

```
Workspace
├── Workspace Shell (sidebar + tabs + context panel)
├── Event Bus (strongly typed, synchronous)
├── Context Engine (simple Promise.all on contributors)
├── AI Layer
│   ├── Conversation Manager
│   ├── Streaming Manager
│   ├── Slash Router
│   ├── Agent Runtime (contracts)
│   └── Tool Registry (contracts)
├── Module Registry (capability-driven)
├── Search Registry (plugin-based)
└── Modules
    ├── Assistant (implemented)
    ├── Journal (Week 2)
    ├── Watchlist (Week 3)
    ├── Research (placeholder)
    ├── Portfolio (placeholder)
    ├── Files (placeholder)
    └── Memory (placeholder)
```

## Key Design Decisions

| Decision             | Choice                                                                               |
| -------------------- | ------------------------------------------------------------------------------------ |
| Event Bus            | Synchronous, strongly typed `WorkspaceEventType` union                               |
| Symbols              | Normalized table with `provider_metadata JSONB`                                      |
| Agent Runtime        | Contracts + registry (no tools)                                                      |
| Frontend services    | Thin wrapper over backend                                                            |
| AI Layer             | Owns conversations, streaming; Context Engine owns context                           |
| Context Engine       | Simple `Promise.all` on contributors; cache/priority deferred                        |
| Search               | Plugin-based `SearchRegistry`, modules register providers                            |
| Tabs                 | Resource-based → `RendererRegistry` maps resource type to component                  |
| Resource Manager     | Centralized navigation (workspace.open instead of router.push)                       |
| Selection vs Context | Selection = what user clicked; Context = what AI receives                            |
| Module capabilities  | Composable classes (Route, Search, Context, Tool, Widget, Command, Shortcut, Action) |

## Implementation Progress

### Week 1: Foundation + Assistant ✅

| Day | Task                                                                                                                | Status |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Workspace types + Event Bus + Resource Manager + Workspace Provider + Persistence                                   | ✅     |
| 2   | Module Registry + Tool Registry + Search Registry + Command Registry                                                | ✅     |
| 3   | Assistant API (conversation, stream, models) + useChat hook                                                         | ✅     |
| 4   | Assistant components (MessageBubble, MessageViewport, ChatInput, SuggestedPrompts, ThreadList, SlashCommandPalette) | ✅     |
| 5   | Minimal Workspace Shell + Assistant module + Backend PATCH endpoint                                                 | ✅     |

**Commit:** `5be1122` — 31 files, 2,796 lines

### Phase 4: Research MVP (Completed 2026-07-07)

Vertical slice — production quality, no RAG/documents yet.

| Layer    | What shipped                                                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB       | `research_projects`, `research_notes` (optimistic-lock version), `research_checklists`, `research_tags`, `research_activity` + migration `0005_research.sql`                                                                                |
| Backend  | `ResearchModule` (`research.controller/service`) — CRUD, auth, validation, pagination, search, filter, optimistic-locking conflict on notes, activity log                                                                                   |
| Frontend | `lib/api/research.ts`, `ResearchWorkspace` (sidebar w/ status filter, thesis Markdown editor w/ lock handling, checklist, tags, symbol linker, activity panel, inline AI research chat), module capabilities (Route/Context/Command/Search) |
| Tests    | `research.service.spec.ts` — 3 pass (defined, NotFound, optimistic-lock conflict)                                                                                                                                                           |

Deferred (by design): documents, embeddings/RAG, citations, portfolio integration, earnings archive, news indexing.

### Phase 5: Portfolio Engine (Completed 2026-07-07)

Computed projection over existing `trades` — **no new storage**.

| Layer    | What shipped                                                                                                                                                                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | `PortfolioModule` (`portfolio.controller/service`) — `GET /portfolio` runs SQL aggregation over `trades`: summary (realized P&L, win rate, profit factor, avg win/loss, best/worst, FOMO/vengeance), per-symbol rollups with allocation %, strategy attribution, long/short split |
| Frontend | `lib/api/portfolio.ts`, `PortfolioWorkspace` (summary cards, positions-by-symbol table w/ allocation bars, strategy attribution, behavioral flags)                                                                                                                                |
| Tests    | `portfolio.service.spec.ts` — 3 pass (defined, computed rollup, empty user)                                                                                                                                                                                                       |

Deferred (by design): open positions / cash / buying power (trades are stored as closed round-trips), live broker sync, sector/country exposure.

### Phase 6: Files → reusable Assets service + Research Documents (Completed 2026-07-07)

Per the roadmap, Files became shared infrastructure consumed by Research, not a standalone module. The standalone `Files` nav entry was removed.

| Layer               | What shipped                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Schema              | `assets` (provider-agnostic: `provider` + `provider_key`, `sha256_hash`, `uploaded_by`, `source`, `status` lifecycle enum, `processing_status` enum, immutable — no update path) + `research_assets` link table (`category` enum, FK to `assets` + `research_projects`). Migration `0006_assets.sql`. `pgEnum`s for `asset_status` / `processing_status` / `document_category` |
| Storage             | `CloudinaryProvider.upload` picks `resource_type` by mimetype (`image`/`raw`); `getUrls` skip transforms for raw files. `UploadResult.providerKey` replaces `publicId` (trades image service updated)                                                                                                                                                                          |
| AssetsService       | Storage-only: `upload`, `deleteStorageObject`, `getUrls`, `getMetadata`. Knows nothing about research/lifecycle                                                                                                                                                                                                                                                                |
| AssetCleanupService | In-process `setInterval` (30 min) + `run()`; retries `deleting`/`failed` assets via `deleteStorageObject`, sets `deleted`. No new dependency                                                                                                                                                                                                                                   |
| ResearchService     | `uploadAsset` (owns `research_assets` link + `documentCategory`), `listAssets`, `deleteAsset` (sets `status=deleting`, enqueues async — HTTP returns 202; never calls Cloudinary)                                                                                                                                                                                              |
| Controller          | `POST/GET/DELETE /research/projects/:id/assets` (FileInterceptor, `ASSET_MAX_SIZE_MB` default 25, allowed pdf/image/office/csv) — 201 upload / 202 delete                                                                                                                                                                                                                      |
| Frontend            | `lib/api/research.ts` asset methods; `ResearchDocuments` section in `ResearchWorkspace` (collapsible, search, sort by newest/oldest/name/category, inline details `category • size • date`, upload with category picker)                                                                                                                                                       |
| Tests               | `assets.service.spec.ts` (3) + `research.service.spec.ts` extended (upload delegates, async delete). 9 new pass                                                                                                                                                                                                                                                                |

Deferred (by design): OCR, embeddings, parsing, AI ingestion (`processing_status` already hooks it), `knowledge_assets`→`assets` unification, cross-owner asset reuse, external scheduler lib.

### Phase 7: AI Workspace + Context Builder (Completed 2026-07-07)

Backend is the single source of truth for LLM context. Frontend sends intent (`ContextRequest`), not assembled data.

| Layer              | What shipped                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types              | `ContextRequest`, `ContextBlock`, `BuiltContext`, `ContextProvider` with `capabilities()`, `supports(request)`, `build(userId, request)`                                              |
| Providers          | 6 modular providers (trades, analytics, research, documents, portfolio, news) — each self-contained, queries own data, `supports` filters by request                                  |
| ContextBuilder     | `Promise.allSettled()` parallel execution, per-provider timeout (100-200ms), per-provider cache TTL, budget-aware sort (2000 token cap), `BuiltContext` with blocks/metadata/warnings |
| PromptBuilder      | `buildSystemPrompt(context, existingPrompt?)` — orders headings, separators, trims. ChatService owns prompt construction.                                                             |
| ChatService wiring | `CreateChatDto.contextRequest` → `ContextBuilder.buildContext()` → `PromptBuilder` → `AIClient.stream()`                                                                              |
| Context preview    | `GET /chat/context-preview` — returns `BuiltContext` for frontend explorer                                                                                                            |
| Frontend           | `ContextRequest` type + helpers (`buildReviewRequest`, `buildResearchRequest`, etc.), `useChat.send()` passes `contextRequest` to API                                                 |
| ContextExplorer    | Tabbed panel (Context/Trades/Research/Portfolio/Docs/News/Diagnostics) — shows what the AI receives + diagnostics (providers, latency, token usage, warnings)                         |
| AssistantWorkspace | 3-column layout: threads + chat + workspace panel (collapsible)                                                                                                                       |
| Slash commands     | `/review`, `/research [symbol]`, `/explain [id]`, `/portfolio` — produce structured `ContextRequest`                                                                                  |
| Tests              | `context-builder.spec.ts` — 6 pass (defined, parallel assembly, filter, timeout, budget, prompt build)                                                                                |

Deferred: Memory/Knowledge Engine (becomes `MemoryProvider`), tool calling, semantic retrieval, conversation memory.

### Phase 8.5: Unify Semantic Retrieval (Completed 2026-07-07)

Consolidated two parallel retrieval systems into one `SemanticRetrievalService`. Fixed dead code, correctness bugs, and orphaned embeddings.

| Layer                    | What shipped                                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types                    | `SemanticSourceType` enum (6 values), `RetrievalIntent` enum (5 intents incl. COACH), `SemanticDocument`, `SemanticResult`, `EmbeddingRecord`, `EmbeddingEvent` |
| Chunker                  | Extracted to `semantic/chunker.ts` — `ChunkingStrategy` interface, `DefaultChunkingStrategy` (512-char chunks, 50 overlap)                                      |
| EmbeddingRepository      | `EmbeddingRepository` interface + `PostgresEmbeddingRepository` (pgvector queries, dedup via contentHash, store/search/remove)                                  |
| EmbeddingPipeline        | `EmbeddingPipeline` interface + `ImmediateEmbeddingPipeline` — enqueue → chunk → embed → store. `handleEvent` for DELETE                                        |
| ProfileRegistry          | Injectable retrieval profiles (CHAT/REVIEW/REPORT/INSPECT/COACH) — tunable thresholds and budgets                                                               |
| SemanticRetrievalService | `retrieve(userId, query, intent)` + `removeIndex(sourceType, sourceId)` + `countEmbeddings(userId)`. Deduplicates by sourceId, sorted by similarity             |
| MemoryFormatter          | `DefaultMemoryFormatter` — formats SemanticResult[] into ContextBlock                                                                                           |
| MemoryProvider           | Thin adapter: `build()` calls `semantic.retrieve()` with last user message                                                                                      |
| SemanticModule           | Owns the entire subsystem: repository, pipeline, registry, retrieval, provider                                                                                  |
| userId bug fix           | Fixed hardcoded `"system"` in `retrieval.service.ts findRelated` — now threads actual userId                                                                    |
| Ingestion wiring         | Trades and journals embed on creation (fire-and-forget via MemoryService adapter). MemoryService is now an adapter over pipeline                                |
| Cleanup                  | Removed redundant EmbeddingService registrations, dead code cleanup                                                                                             |

Deferred: vector index (HNSW/IVFFlat), background queue (BullMQ), PDF text extraction, conversation memory.

### Phase 9: Knowledge Ingestion (Completed 2026-07-07)

Four vertical slices: Research Embedding, Observability, Document Extraction, Research Asset Embedding.

| Slice                        | What shipped                                                                                                                                                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Research Embedding       | `SemanticSourceType.RESEARCH_PROJECT` + `SemanticFormatter<T>` interface + `FormatterRegistry` + `ResearchProjectFormatter` + `embedProject()` helper in ResearchService (create/update/delete re-embed fire-and-forget)                                             |
| B — Observability            | `SemanticMetrics` type + `SemanticMetricsService` (accumulates embedding/retrieval latency, chunk counts, similarity distribution) + `GET /chat/semantic/metrics` endpoint + metrics wired into pipeline + retrieval                                                 |
| C — Document Extraction      | `TextExtractor` interface + `ExtractorRegistry` (plugin-style) + 4 extractors (`PlainTextExtractor`, `PdfExtractor`, `DocxExtractor`, `MarkdownExtractor`) + `ExtractionResult` (text, wordCount, language, warnings) + `Normalizer` (UTF-8, whitespace, null bytes) |
| D — Research Asset Embedding | `uploadAsset()` wired: extract → embed (fire-and-forget) for extractable files; `processingStatus` lifecycle (none → processing → ready/failed)                                                                                                                      |

### Phase 10: AI Actions / Tool Calling (Completed 2026-07-08)

Agent runtime with tool support. Backend owns the tool loop; the Python AI service is a transparent OpenAI-compatible passthrough for `tools`/`tool_calls`.

| Layer        | What shipped                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| AIClient     | `complete()` accepts `tools` + parses `tool_calls`; `ChatMessage` gains `tool` role + `tool_calls`/`tool_call_id`                                |
| AgentRuntime | Conversation lifecycle + iteration only; delegates to Planner (decide) + ToolExecutor (run)                                                      |
| Planner      | `execute_tool \| finish \| max_iterations`                                                                                                       |
| ToolExecutor | Validates JSON args, enforces timeout, returns `ToolResult` (no chat state)                                                                      |
| ToolCatalog  | Definitions only (split from executors); `ToolDefinition` enriched with `permission`/`timeoutMs`/`cacheTTLMs`; `ToolResult` carries `metadata`   |
| Tools        | 4 read-only tools: `get_analytics`, `search_trades`, `get_portfolio`, `search_research` wired to real services                                   |
| Intent       | `intent.ts` maps slash commands → tool subset (UI never names tools)                                                                             |
| Python       | `OpenRouterProvider.raw_chat()` passthrough; `OpenAIRequest` accepts `tools`/`tool_choice`; route bypasses pipeline when provider supports tools |
| Frontend     | `ToolCallBlock` renders tool calls/results; `tool_status` SSE events; slash commands pass `intent`                                               |
| Tests        | `tools.spec.ts` (10): Planner, ToolExecutor, AgentRuntime, intent                                                                                |

### Phase 11: Conversation Memory (Completed 2026-07-08)

The agent recalls prior turns, including tool calls and their results, so it does not re-invoke tools and can reason across the conversation. Survives reload. No schema migration.

| Layer                          | What shipped                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ConversationSerializer         | Single translation layer between `chat_messages` rows and `ChatMessage`; `metadata.version` (v1), `type` (`tool_call`/`tool_result`/`message`), structured `result` + display `text` |
| ToolLifecycleStatus            | `STARTED \| RUNNING \| COMPLETED \| FAILED \| CANCELLED` (enum; RUNNING/CANCELLED reserved)                                                                                          |
| ConversationStore              | `abstract class` interface + `ChatThreadStore` adapter over `ChatThreadService`                                                                                                      |
| ConversationRepository         | `loadHistory(threadId, userId, policy) → ConversationHistory`; rehydrates with `historical: true`; trims via policy                                                                  |
| ConversationPersistenceService | `persistUser`/`persistAssistant`/`persistToolCall`/`persistToolResult`; fire-and-forget, never blocks stream                                                                         |
| ConversationHistory            | `{ threadId, messages, lastUpdated, summary?, contextSnapshot? }`; `ConversationHistoryPolicy` (`maxMessages` default 30, token-based later)                                         |
| ChatService                    | Injects repo + persistence; seeds `AgentRuntime` with rehydrated history; persists both agent and plain paths                                                                        |
| Invariants                     | Replay never executes tools; history is an audit log; persistence fire-and-forget (documented in `semantic-architecture-v1.md`)                                                      |
| Frontend                       | `streamChat` sends `threadId`; reload renders persisted tool calls/results via `ToolCallBlock`                                                                                       |
| Tests                          | `conversation-serializer/-store/-repository/-persistence.service.spec.ts` + `chat.service.spec.ts` (16 new)                                                                          |

### Phase 12: Portfolio Intelligence (Completed 2026-07-08)

The insight engine became portfolio-aware and gained an LLM narrative layer — without new infrastructure, tables, or endpoints. Deterministic rules stay the source of truth; the LLM only improves wording.

| Layer      | What shipped                                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Package    | New `apps/api/src/ai/insights/` — clean 4-layer split: `InsightContext` (snapshot) → `rules/*` (pure deterministic logic) → `AiInsightsService` (orchestration) → `AIClient` (narrative only)                                                                |
| Thresholds | `thresholds.ts` — all tunables centralized (concentration %, strategy dominance %, direction/symbol trade minimums, etc.)                                                                                                                                    |
| Metrics    | `portfolio-metrics.ts` — `computeDirectionalExpectancy()` helper isolates the derived-metric SQL; builder stays thin                                                                                                                                         |
| Rules      | Existing rules moved verbatim into `performance/risk/discipline/consistency.rules.ts`; `portfolio.rules.ts` adds 4 new rules: concentration risk, strategy over-reliance, losing-symbol (by expectancy, not win rate), directional imbalance (by expectancy) |
| Categories | New portfolio rules map to the existing 4 coaching categories (`performance`/`discipline`/`risk`/`consistency`); no new "portfolio" category                                                                                                                 |
| Registry   | `rules/index.ts` exposes `RULES: InsightSource[]`; future sources (journal, calendar, watchlist, research, macro) added by pushing one module — orchestrator unchanged                                                                                       |
| Narrative  | `generateNarrative()` runs only after deterministic cards; `AIClient.complete()` with a bounded prompt; wrapped in try/catch so it can never break insights; stored as `ai_insights` row type `portfolio_narrative`, shares the 6h TTL                       |
| Endpoint   | `GET /ai/insights` unchanged — returns `{ insights, narrative?, generatedAt }`                                                                                                                                                                               |
| Frontend   | `lib/api.ts` `AiInsightsResponse.narrative?`; `useAiInsights` exposes it; `AiCoachWidget` shows a compact "Portfolio Summary" narrative above the cards + a "View Portfolio" CTA                                                                             |
| Tests      | `portfolio.rules.spec.ts` (10) + `ai-insights.service.spec.ts` (5: cache hit, fresh gen+store, narrative-failure fallback, <5-trade guard, top-3/risk-cap)                                                                                                   |

**Post-Phase-12:** architecture frozen. Remaining work is product capability — retrieval-quality improvements, corpus expansion, Phase 14 (quiet hours, frequency preferences, scheduled digests).

### Phase 13: Autonomous Coaching Delivery (Completed 2026-07-08)

The insight engine now proactively reaches users via real-time notifications. Trade and journal creation events trigger deterministic analysis; the highest-priority pushable insight is delivered as a `coaching` notification, deduped per rule within a 24-hour window.

| Layer         | What shipped                                                                                                                                                                                                                                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule IDs      | `rule-ids.ts` — stable compile-time `RULE_IDS` constants shared by rules + tests (no scattered string literals)                                                                                                                                                                                                                                                                     |
| Card contract | `InsightCard` gains `ruleId`, `pushable`, `source` fields; `InsightCandidate` keeps `priority` as a runtime property (never deserialized from stored metadata)                                                                                                                                                                                                                      |
| Push policy   | New `push-policy.ts` — pure `selectPushCandidate()` (highest-priority pushable) + injectable `CoachingPushPolicy` (`wasPushedRecently` / `recordPush` via `ai_insights` row type `coaching_push`; `evaluate()` orchestrates select → dedupe → record → return `PushCandidate`)                                                                                                      |
| Thresholds    | `COACHING_DEDUPE_MS` (24h), `COACHING_SEVERITY_BY_CATEGORY` map                                                                                                                                                                                                                                                                                                                     |
| Service       | `AiInsightsService` gains in-memory candidate cache (`buildCandidates`, shared by `getInsights` and `getCoachingPush`) + `getCoachingPush()` → `pushPolicy.evaluate()`; `storeInsights` persists `ruleId`/`priority`/`pushable`/`source` as first-class metadata fields; `selectTopInsights` returns `InsightCandidate[]` (not `InsightCard[]`) to preserve priority at every layer |
| Triggers      | `NotificationTriggersService.checkAndNotify` — legacy losing-streak block replaced by deterministic insight engine call (`getCoachingPush`); enriched metadata `{ruleId, source, category, severity, priority}`; `coaching` type checks `isTypeEnabled` first                                                                                                                       |
| Controllers   | `TradesController.create` + `JournalsController.create` — fire-and-forget `checkAndNotify(userId).catch(() => {})` after successful creation                                                                                                                                                                                                                                        |
| Rules         | `pushable` flag set per plan: risk (true), discipline/FOMO/revenge/directional (true), losing-streak/strategy-reliance/concentration (true); positive signals (best-strategy, session, best-day, winning-streak, trend) = false                                                                                                                                                     |
| Tests         | `push-policy.spec.ts` (5: selectPushCandidate pure + CoachingPushPolicy evaluate/dedupe) + `ai-insights.service.spec.ts` (3 new: coaching-push returns candidate, null when non-pushable, cache reuse) + `notification-triggers.service.spec.ts` (2: creates enriched coaching notification, suppresses when null)                                                                  |
| Frontend      | Existing `NotificationItem.tsx` already renders `coaching` type (blue + 🎯); `NotificationBell.tsx` listens `notification:created` — no changes needed                                                                                                                                                                                                                              |

**Out of scope (Phase 14):** scheduler/cron digests, quiet hours, per-user frequency preferences, merged coaching sessions, additional event hooks (edits, imports, sync).

### Week 2: Workspace Shell + Journal (Pending)

| Day | Task                                                                |
| --- | ------------------------------------------------------------------- |
| 6   | Enhance WorkspaceShell with tabs, breadcrumbs, context panel        |
| 7   | Renderer Registry + Context Engine wiring                           |
| 8   | Journal module definition + JournalWorkspace + JournalContext       |
| 9   | Module index + Placeholder modules (research allows empty creation) |
| 10  | Polish: keyboard shortcuts, deep linking, error boundaries          |

### Week 3: Watchlist + Search + Polish (Pending)

| Day   | Task                                                                      |
| ----- | ------------------------------------------------------------------------- |
| 11    | DB schema (symbols + watchlists) + migration                              |
| 12    | Backend: Symbols service + controller + module                            |
| 13    | Backend: Watchlist service + controller + module                          |
| 14    | Frontend API + Watchlist module definition                                |
| 15    | WatchlistWorkspace + WatchlistTable + WatchlistItemRow + WatchlistContext |
| 16    | Search Registry + Sidebar/MobileBottomNav/CommandPalette integration      |
| 17    | useKeyboard + Event Bus provider + Command Registry                       |
| 18    | Polish: keyboard shortcuts, deep linking, error boundaries                |
| 19-20 | Buffer / Testing                                                          |

## File Structure

```
apps/web/
├── app/
│   ├── assistant/page.tsx
│   └── workspace/[module]/page.tsx
├── components/
│   ├── workspace/
│   │   ├── WorkspaceShell.tsx
│   │   └── WorkspaceSidebar.tsx
│   ├── assistant/
│   │   ├── AssistantWorkspace.tsx
│   │   ├── ThreadList.tsx
│   │   ├── Conversation.tsx
│   │   ├── MessageViewport.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInput.tsx
│   │   ├── SuggestedPrompts.tsx
│   │   └── SlashCommandPalette.tsx
│   └── modules/
│       ├── journal/
│       ├── watchlist/
│       ├── research/
│       ├── portfolio/
│       ├── memory/
│       └── files/
├── lib/
│   ├── workspace/
│   │   ├── types.ts
│   │   ├── event-bus.ts
│   │   ├── resource-manager.ts
│   │   ├── selection-manager.ts
│   │   ├── module-registry.ts
│   │   ├── tool-registry.ts
│   │   ├── search-registry.ts
│   │   ├── command-registry.ts
│   │   ├── persistence.ts
│   │   ├── resource.ts
│   │   └── workspace-context.tsx
│   ├── api/assistant/
│   │   ├── conversation.ts
│   │   ├── stream.ts
│   │   ├── models.ts
│   │   └── index.ts
│   ├── assistant/prompts.ts
│   └── modules/
│       ├── index.ts
│       └── assistant/index.tsx
├── hooks/
│   └── useChat.ts
apps/api/src/
├── chat/
│   ├── chat.controller.ts (PATCH endpoint added)
│   └── chat-thread.service.ts (updateThreadTitle added)
```

## DB Schema (Pending - Week 3)

```sql
-- symbols (normalized)
CREATE TABLE symbols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  exchange TEXT,
  asset_type TEXT,
  currency TEXT,
  name TEXT,
  provider_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(ticker, exchange)
);

-- watchlists
CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- watchlist_items
CREATE TABLE watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol_id UUID NOT NULL REFERENCES symbols(id),
  priority INTEGER DEFAULT 0,
  notes TEXT,
  tags JSONB DEFAULT '[]',
  alerts JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
```

## Backend Endpoints

| Method   | Path                            | Purpose                                    |
| -------- | ------------------------------- | ------------------------------------------ |
| `PATCH`  | `/chat/threads/:id`             | Update thread title ✅                     |
| `GET`    | `/symbols/search?q=`            | Search symbols by ticker ✅                |
| `POST`   | `/symbols`                      | Create symbol (lookup-or-create) ✅        |
| `GET`    | `/symbols/:id`                  | Get symbol by ID ✅                        |
| `GET`    | `/watchlists`                   | List user's watchlists ✅                  |
| `POST`   | `/watchlists`                   | Create watchlist ✅                        |
| `DELETE` | `/watchlists/:id`               | Delete watchlist ✅                        |
| `GET`    | `/watchlists/:id/items`         | List items (joined with symbols) ✅        |
| `POST`   | `/watchlists/:id/items`         | Add item (symbol lookup-or-create) ✅      |
| `PUT`    | `/watchlists/:id/items/:itemId` | Update item ✅                             |
| `DELETE` | `/watchlists/:id/items/:itemId` | Remove item ✅                             |
| `POST`   | `/watchlists/:id/reorder`       | Reorder (operation-based: move from/to) ✅ |

## Success Criteria

- [x] Every new module can be added by registering a single `WorkspaceModule` without modifying existing workspace code
- [x] Workspace shell renders with sidebar, tabs, context panel
- [x] Tabs open resources via ResourceManager, persist across refresh
- [x] Event Bus publishes and subscribes with strongly typed events
- [x] Context Engine merges context from contributors with budgeting
- [x] AI chat works with thread management, streaming, slash commands
- [x] AI Layer consumes context from Context Engine
- [x] Search is plugin-based (modules register providers)
- [x] Journal opens in workspace tabs with context panel
- [x] Watchlist has full CRUD with normalized symbols table
- [x] Watchlist Workspace has three-panel layout (Lists | Symbols | Inspector)
- [x] Generic InspectorPanel reads InspectorCapability from modules
- [x] Research, Portfolio, Memory, Files placeholders with proper routing
- [x] Agent Runtime + Tool Registry contracts exist
- [x] Keyboard shortcuts work (Cmd+T, Cmd+W, Cmd+[, Cmd+])
- [x] Deep linking works via /workspace/[module]
- [x] Error boundaries catch module rendering failures
- [x] All existing pages still work (no regressions)
- [x] Frontend + backend compile clean, 101 API tests pass (+ web suite)

---

## Sprint 6: Intelligence Orchestration Layer

**Date:** 2026-07-08
**Tests:** 146 passing (132 existing + 14 new RetrievalPipeline)

### What shipped

| Phase | Deliverable                                                            | Key files                                                               |
| ----- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1     | RetrievalPipeline + scoring infrastructure                             | `context-provider.ts`, `retrieval-pipeline.ts`                          |
| 2     | All 7 providers with `scoringRules()`, `score()`, `dataCompleteness()` | `trades/analytics/portfolio/research/documents/news/memory.provider.ts` |
| 3     | ContextBuilder uses RetrievalPipeline                                  | `context-builder.service.ts`                                            |
| 4     | 6 new tools (journal, watchlist, knowledge) + `suggestedActions`       | `tools.module.ts`, `tool-catalog.ts`                                    |
| 5     | `WorkspaceAction` type + agent runtime passes `suggestedActions`       | `agent-runtime.ts`, `chat.controller.ts`                                |
| 6     | SSE `event: actions` + useChat parses them                             | `stream.ts`, `useChat.ts`                                               |
| 7     | Action buttons in UI                                                   | `MessageBubble.tsx`, `MessageViewport.tsx`, `AssistantWorkspace.tsx`    |
| 8     | Retrieval trace tab                                                    | `ContextExplorer.tsx`, `context.ts`                                     |

### Architecture changes

- **Provider self-scoring:** Each provider implements `scoringRules(): ScoringRule[]` (declarative weighted predicates) and `score(request, lastUserMessage): ProviderScore`. Additive, multi-intent, no global classifier.
- **DataCompleteness:** Separate from relevance — measures data quality per provider.
- **RetrievalPipeline:** Extracted from ContextBuilderService — score → filter (<0.1 threshold) → allocate budget proportionally → execute → trim → trace.
- **Budget:** 2000 tokens, proportional allocation by score.
- **Tool taxonomy:** Read (get_portfolio, search_trades, etc.), Write (create_journal, add_watchlist, etc.), Analysis (portfolio_summary, behavior_analysis).
- **WorkspaceAction<T>:** versioned (`version: 1`), generic params, `suggestedActions?` optional on ToolResult.
- **Traces:** `TraceEvent` base type → `RetrievalTrace` + `ToolTrace` for observability.

### Post-sprint fixes

- Added `relevance`, `dataCompleteness`, `retrievalReason` to frontend `ContextBlock`
- 14 RetrievalPipeline unit tests (scoring, filtering, budget, trim, trace)
- ContextExplorer now passes last `contextRequest` for accurate preview
