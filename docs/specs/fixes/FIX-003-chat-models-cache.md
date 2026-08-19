# FIX-003: Models Cache TTL Configurable

Status: Draft
Owner: TradeZen API
Date: 2026-08-01
Severity: Low

---

## Problem

`ChatService.modelsCacheTtlMs` is hardcoded to `5 * 60 * 1000` (5 minutes). The
model catalog cache freshness cannot be tuned without a code change and
redeploy. During provider outages or high-throughput periods, operators have no
knob to trade freshness vs. load on the AI service.

## Root Cause

`apps/api/src/chat/chat.service.ts` line 252:

```ts
private readonly modelsCacheTtlMs = 5 * 60 * 1000;
```

## Expected Behavior

```
MODELS_CACHE_TTL_MS=<ms>  (optional env var)
  ↓
parse int, clamp to >= 0
  ↓
cache entries older than TTL are treated as stale
```

Default when the env var is absent, empty, or invalid: `300000` (5 min),
matching current behavior.

## Edge Cases

- `MODELS_CACHE_TTL_MS` unset → `300000`
- `MODELS_CACHE_TTL_MS=""` → `300000`
- `MODELS_CACHE_TTL_MS="abc"` (non-numeric) → `300000`
- `MODELS_CACHE_TTL_MS="0"` → cache disabled (always refresh)
- `MODELS_CACHE_TTL_MS="-1"` → treat as invalid → `300000`

## Error Cases

- None new; invalid input falls back to the default rather than throwing.

## Compatibility

Breaking: No

API Contract: Unchanged — env-only change, no request/response surface.

## Regression Risk

Low

Affected Areas:

- `ChatService.getModelsV2` / `getModelsCache`
- Model dropdown freshness

## Acceptance Criteria

- [ ] Default TTL is 5 minutes when `MODELS_CACHE_TTL_MS` is unset
- [ ] `MODELS_CACHE_TTL_MS=1000` makes cache entries stale after 1s
- [ ] Invalid/empty values fall back to the 5-minute default
- [ ] No behavior change when the env var is not set

## Implementation Notes

Read at construction time:

```ts
private readonly modelsCacheTtlMs = parseInt(
  process.env.MODELS_CACHE_TTL_MS ?? '',
  10,
);
```

with a helper or inline guard that falls back to `300000` when
`Number.isNaN` or `< 0`. Clamp `0` to `0` (cache disabled) — not to the default.

No migration. No dependency changes.

## Files Affected

- `apps/api/src/chat/chat.service.ts`

## Test Plan

Unit (Jest, isolated instance with mocked env):

- unset env → TTL `300000`
- `"1000"` → TTL `1000`
- `"abc"` → TTL `300000`
- `"0"` → TTL `0` (cache effectively disabled)
- `"-1"` → TTL `300000`

Regression:

- Existing `getModelsV2` cache behavior (5-min TTL path) still passes.
