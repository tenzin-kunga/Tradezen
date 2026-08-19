# FIX-009: Embedding Model Configurable via Env

Status: Draft
Owner: TradeZen API
Date: 2026-08-01
Severity: Medium

---

## Problem

`EmbeddingService.embeddingModel` is hardcoded to `'openai/text-embedding-3-small'`.
The base URL and API key come from the user's per-user settings (encrypted in DB),
but the model name cannot be changed without editing source and redeploying. The Python
AI service already exposes `embedding_model` config; the NestJS service ignores it.

## Root Cause

`apps/api/src/ai/embedding.service.ts` line 10:

```ts
private readonly embeddingModel = 'openai/text-embedding-3-small';
```

## Expected Behavior

```
EMBEDDING_MODEL=<model>  (optional env var)
  ↓
model name used for /embeddings requests
```

Default when unset/empty: `'openai/text-embedding-3-small'` (unchanged).

Note: changing the model to one with different output dimensions would require a
corresponding change to the `embeddings` table vector dimension (currently 1536).
This spec only makes the name configurable; dimension coupling is documented in
Implementation Notes, not changed here.

## Edge Cases

- `EMBEDDING_MODEL` unset → default `'openai/text-embedding-3-small'`
- `EMBEDDING_MODEL=""` → default
- `EMBEDDING_MODEL="openai/text-embedding-3-large"` → used for embeddings
  (assumes matching vector dimension)

## Error Cases

- None new; missing/empty falls back to default.

## Compatibility

Breaking: No

API Contract: Unchanged — env-only change.

## Regression Risk

Low

Affected Areas:

- Embedding generation (`generateEmbedding`, `embedAndStore`)
- `searchSimilar` vector similarity (depends on consistent dimensions)

## Acceptance Criteria

- [ ] Default model unchanged when env var unset
- [ ] `EMBEDDING_MODEL` overrides the model in the embeddings request body
- [ ] Empty env value falls back to default

## Implementation Notes

```ts
private readonly embeddingModel =
  process.env.EMBEDDING_MODEL?.trim() || 'openai/text-embedding-3-small';
```

Document that the DB vector column is `dimensions: 1536` in
`packages/db/src/schema/index.ts` (`embeddings` table). Changing to a model with
different output dimensions requires a schema migration + data re-embedding —
out of scope for this fix.

No migration. No dependency changes.

## Files Affected

- `apps/api/src/ai/embedding.service.ts`

## Test Plan

Unit (Jest, mocked `fetch`):

- env unset → request body `model: 'openai/text-embedding-3-small'`
- `EMBEDDING_MODEL="openai/text-embedding-3-large"` → request body uses it
- `EMBEDDING_MODEL=""` → default

Regression:

- Existing embedding flow (document enrichment on create/update) still works.
