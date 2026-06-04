# Memory remediation (TradeZen)

This document summarizes changes for browser and API memory pressure, and how to verify them.

## What changed

### Chat (SSE + web)

- **API** ([`apps/api/src/chat/chat.controller.ts`](../apps/api/src/chat/chat.controller.ts)): `AbortController` tied to `req.on("close")` so OpenRouter `fetch` is aborted when the client disconnects; removed per-token SSE `console.log`.
- **API** ([`apps/api/src/chat/chat.service.ts`](../apps/api/src/chat/chat.service.ts)): `fetch` and stream consumption respect `AbortSignal`; removed per-token logging; `finally` releases the stream reader.
- **Web** ([`apps/web/lib/api.ts`](../apps/web/lib/api.ts)): `streamChat` accepts optional `signal` (Abort); handles abort without throwing; cancels reader in `finally`.
- **Web** ([`apps/web/components/ChatPanel.tsx`](../apps/web/components/ChatPanel.tsx)): Aborts in-flight stream on unmount / panel close / new send; **batches** tokens via `requestAnimationFrame`; **caps** retained messages (`MAX_CHAT_MESSAGES`).

### Tags & journals (bounded lists)

- **Tags** `GET /tags/:id/trades`: Paginated with validated `limit` (1–100, default 50) and `offset`; response shape `{ data, total, limit, offset, page, totalPages }`.
- **Journals** `GET /journals`: Query validated via `QueryJournalsDto` (`limit` 1–100, default 30); service clamps again as defense in depth.
- **Journals** `GET /journals/streak`: Streak metrics computed in SQL (no full date list loaded in Node).

### Trades (analytics + CSV)

- **Analytics** `GET /trades/analytics`: Uses parallel **aggregate SQL** queries instead of `SELECT *` and large in-memory structures. Ordered `pnl` list is still loaded for consecutive win/loss (one numeric column per trade). Max drawdown uses a window-function SQL CTE.
- **CSV export** `GET /trades/export/csv`: **Streams** rows in chunks (`CSV_EXPORT_CHUNK = 500`) via `res.write` instead of building one giant string.

### Other web hygiene

- **Settings** ([`apps/web/app/settings/page.tsx`](../apps/web/app/settings/page.tsx)): “Saved” indicator `setTimeout` cleared on unmount and before rescheduling.

## How to verify (manual)

1. **Chat / browser**
   - Open AI panel, start a long reply, close the panel mid-stream: CPU/network should drop quickly; no runaway `setState` after navigating away.
   - Chrome DevTools → Memory → take heap snapshot before/after many messages; growth should plateau (message cap + batched updates).

2. **API CSV**
   - Export with a large account: response should stream; API RSS should not spike with a single huge string allocation (watch OS task manager or `node --inspect` heap timeline).

3. **API analytics**
   - Hit `GET /trades/analytics` with a large account: response time and heap should stay reasonable compared to loading full `SELECT *` into memory.

4. **Tags / journals**
   - `GET /tags/{id}/trades?limit=10&offset=0` returns only 10 rows and `total` metadata.
   - `GET /journals?limit=200` should be rejected or clamped (max 100).

## Notes

- Tag trades response shape changed from a bare array to a **paginated object**. Update any clients that assumed a raw array (the bundled web app did not call this endpoint from `api.ts`).
- Profit factor with no losing trades but positive PnL is returned as **999999** (JSON-safe) instead of `Infinity`.
