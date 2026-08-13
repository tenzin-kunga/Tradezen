# FIX-008: User Settings — De-duplicate API Key Validation

Status: Draft
Owner: TradeZen API
Date: 2026-08-01
Severity: Medium

---

## Problem

`UserSettingsController` duplicates the same provider-key validation logic in
two handlers:

- `validateApiKey` (GET-test only)
- `setApiKey` (validates, then encrypts and stores)

The duplicated block covers endpoint lookup, header selection
(`x-api-key` vs `Authorization: Bearer`), fetch with timeout, error mapping, and
model-count extraction. Any future change to validation rules must be applied in
two places and can silently drift.

## Root Cause

`apps/api/src/user-settings/user-settings.controller.ts`, the try/catch fetch
blocks in `validateApiKey` (lines 80–103) and `setApiKey` (lines 124–147) are
near-identical.

## Expected Behavior

```
validateProviderKey(provider, apiKey)  [private, controller]
  → VALIDATION_ENDPOINTS lookup; unsupported → 400
  → header selection (x-api-key | Bearer)
  → fetch(endpoint, { headers, signal: 10s timeout })
  → !res.ok → 400 "Invalid API key"
  → network/other error → 502 "Failed to validate API key"
  → returns { modelCount }
```

Both public handlers call it:

- `validateApiKey` → returns `{ valid: true, modelCount }`
- `setApiKey` → validates, then `service.setApiKey(..., modelCount)`

## Edge Cases

- Unsupported provider → `400 Unsupported provider: <p>` (both handlers)
- Provider returning non-2xx → `400 Invalid API key`
- Network timeout / DNS failure → `502 Failed to validate API key`
- `ApiKeyHeaderProviders` (`anthropic`) still uses `x-api-key`; all others Bearer
- `modelCount` from `data.data?.length ?? 0` preserved in both response paths

## Error Cases

Unchanged from current behavior (400 / 502 mapping preserved exactly).

## Compatibility

Breaking: No

API Contract: Unchanged — same endpoints, same request/response shapes, same
error codes. Pure internal refactor.

## Regression Risk

Medium

Affected Areas:

- Settings → AI provider connection flow (frontend `AIProviderSection`)
- `PATCH /user-settings/api-key` save flow

## Acceptance Criteria

- [ ] `validateProviderKey` extracted and used by both handlers
- [ ] Both endpoints behave identically before/after (same status codes and
      response bodies)
- [ ] No duplicated fetch/header/error-mapping code remains

## Implementation Notes

Extract a private method on the controller returning `{ modelCount }`. Preserve
the exact `HttpException` messages and statuses. Do not change the DTO.

No migration. No dependency changes.

## Files Affected

- `apps/api/src/user-settings/user-settings.controller.ts`

## Test Plan

Unit (Jest, mocked `fetch`):

- `validateApiKey` valid key → `{ valid: true, modelCount: N }`
- `validateApiKey` invalid key → `400 Invalid API key`
- `setApiKey` valid key → calls `service.setApiKey`, returns `{ ...status, modelCount }`
- `setApiKey` invalid key → `400`, `service.setApiKey` NOT called
- Unsupported provider → `400` from both
- Anthropic provider → request uses `x-api-key` header

Regression:

- Manual: settings provider validation + save flow.
