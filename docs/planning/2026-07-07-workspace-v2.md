# TradeZen Workspace v2 — Implementation Plan

**Status:** Week 3 Complete (Days 11-18), Architecture Frozen
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

| Decision | Choice |
|----------|--------|
| Event Bus | Synchronous, strongly typed `WorkspaceEventType` union |
| Symbols | Normalized table with `provider_metadata JSONB` |
| Agent Runtime | Contracts + registry (no tools) |
| Frontend services | Thin wrapper over backend |
| AI Layer | Owns conversations, streaming; Context Engine owns context |
| Context Engine | Simple `Promise.all` on contributors; cache/priority deferred |
| Search | Plugin-based `SearchRegistry`, modules register providers |
| Tabs | Resource-based → `RendererRegistry` maps resource type to component |
| Resource Manager | Centralized navigation (workspace.open instead of router.push) |
| Selection vs Context | Selection = what user clicked; Context = what AI receives |
| Module capabilities | Composable classes (Route, Search, Context, Tool, Widget, Command, Shortcut, Action) |

## Implementation Progress

### Week 1: Foundation + Assistant ✅

| Day | Task | Status |
|-----|------|--------|
| 1 | Workspace types + Event Bus + Resource Manager + Workspace Provider + Persistence | ✅ |
| 2 | Module Registry + Tool Registry + Search Registry + Command Registry | ✅ |
| 3 | Assistant API (conversation, stream, models) + useChat hook | ✅ |
| 4 | Assistant components (MessageBubble, MessageViewport, ChatInput, SuggestedPrompts, ThreadList, SlashCommandPalette) | ✅ |
| 5 | Minimal Workspace Shell + Assistant module + Backend PATCH endpoint | ✅ |

**Commit:** `5be1122` — 31 files, 2,796 lines

### Week 2: Workspace Shell + Journal (Pending)

| Day | Task |
|-----|------|
| 6 | Enhance WorkspaceShell with tabs, breadcrumbs, context panel |
| 7 | Renderer Registry + Context Engine wiring |
| 8 | Journal module definition + JournalWorkspace + JournalContext |
| 9 | Module index + Placeholder modules (research allows empty creation) |
| 10 | Polish: keyboard shortcuts, deep linking, error boundaries |

### Week 3: Watchlist + Search + Polish (Pending)

| Day | Task |
|-----|------|
| 11 | DB schema (symbols + watchlists) + migration |
| 12 | Backend: Symbols service + controller + module |
| 13 | Backend: Watchlist service + controller + module |
| 14 | Frontend API + Watchlist module definition |
| 15 | WatchlistWorkspace + WatchlistTable + WatchlistItemRow + WatchlistContext |
| 16 | Search Registry + Sidebar/MobileBottomNav/CommandPalette integration |
| 17 | useKeyboard + Event Bus provider + Command Registry |
| 18 | Polish: keyboard shortcuts, deep linking, error boundaries |
| 19-20 | Buffer / Testing |

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

| Method | Path | Purpose |
|--------|------|---------|
| `PATCH` | `/chat/threads/:id` | Update thread title ✅ |
| `GET` | `/symbols/search?q=` | Search symbols by ticker ✅ |
| `POST` | `/symbols` | Create symbol (lookup-or-create) ✅ |
| `GET` | `/symbols/:id` | Get symbol by ID ✅ |
| `GET` | `/watchlists` | List user's watchlists ✅ |
| `POST` | `/watchlists` | Create watchlist ✅ |
| `DELETE` | `/watchlists/:id` | Delete watchlist ✅ |
| `GET` | `/watchlists/:id/items` | List items (joined with symbols) ✅ |
| `POST` | `/watchlists/:id/items` | Add item (symbol lookup-or-create) ✅ |
| `PUT` | `/watchlists/:id/items/:itemId` | Update item ✅ |
| `DELETE` | `/watchlists/:id/items/:itemId` | Remove item ✅ |
| `POST` | `/watchlists/:id/reorder` | Reorder (operation-based: move from/to) ✅ |

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
- [x] Frontend + backend compile clean, 130 tests pass
