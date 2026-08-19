# FIX-001: Route Ordering — `threads/search` shadowed by `threads/:id`

Status: Draft
Owner: TradeZen API
Date: 2026-08-01
Severity: High

---

## Problem

`GET /chat/threads/search` is unreachable. NestJS matches routes in declaration
order, and `@Get('threads/:id')` is declared before `@Get('threads/search')`, so
`/chat/threads/search` is captured by `:id` with `id = 'search'` and returns 404
(or resolves against the thread handler). Search-by-title on chat threads is
dead functionality.

Additionally, `@UseGuards(JwtAuthGuard)` on `GET threads/:id/messages` is
redundant: `JwtAuthGuard` is registered globally via `APP_GUARD` in
`app.module.ts`.

## Root Cause

Route declaration order in `apps/api/src/chat/chat.controller.ts`:

- Line 115: `@Get('threads/:id')` (matches `/threads/search`)
- Line 145: `@Get('threads/search')` (never reached)

NestJS/Express resolve path segments in declaration order; a literal segment
(`search`) declared after a parameterized segment (`:id`) is shadowed.

## Expected Behavior

```
GET /chat/threads/search?q=<term>  (authenticated)
  ↓
threadService.searchThreads(userId, q)
  ↓
200 OK — array of threads matching title ILIKE %q%
```

`GET /chat/threads/:id` continues to return a single thread by UUID, or 404 if
the thread does not exist or is not owned by the user.

## Edge Cases

- Thread IDs are UUIDs, so the literal `search` never collides with a real ID —
  the endpoint was always shadowed, never sometimes-shadowed.
- `threads/:id/messages` and `threads/:id/pin` are multi-segment patterns and
  are NOT affected by this bug — no change needed there.
- `GET /chat/threads/search` with no `q` → returns `[]` (existing behavior via
  `query || ''`), unchanged.

## Error Cases

- None new. `GET /chat/threads/:id` with unknown ID → `404 Thread not found`
  (unchanged).

## Compatibility

Breaking: No

API Contract: Unchanged — the endpoint existed in the contract but was
unreachable; this fix makes it reachable. No response shapes change.

## Regression Risk

Medium

Affected Areas:

- Chat thread search (frontend `ConversationSidebar`)
- Chat thread fetch-by-id

## Acceptance Criteria

- [ ] `GET /chat/threads/search?q=<term>` returns matching threads (previously 404)
- [ ] `GET /chat/threads/:id` still returns the thread for a valid UUID
- [ ] `GET /chat/threads/:id` still returns 404 for unknown IDs
- [ ] Redundant `@UseGuards(JwtAuthGuard)` removed from `threads/:id/messages`

## Implementation Notes

Move the `@Get('threads/search')` handler to immediately after
`@Get('threads')`, before `@Get('threads/:id')`. Remove the redundant
`@UseGuards(JwtAuthGuard)` decorator on `threads/:id/messages`.

No migration. No dependency changes.

## Files Affected

- `apps/api/src/chat/chat.controller.ts`

## Test Plan

Unit (NestJS `Test.createTestingModule`):

- Route registration: assert search route is registered before `:id` route
  (e.g., via `app.getHttpServer()` + supertest, or by checking the handler
  bound to `/chat/threads/search`).
- Controller-level: mock `ChatThreadService`; `searchThreads` invoked for
  `/threads/search`, `getThread` invoked for `/threads/:uuid`.

Regression:

- Existing thread CRUD spec (if any) still passes.
