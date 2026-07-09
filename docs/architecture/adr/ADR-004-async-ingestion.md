# ADR-004: Why Ingestion Is Asynchronous

**Status:** Accepted
**Date:** 2026-07-07

## Problem

Embedding API calls can fail (network, rate limits, service outage) or be slow (100-500ms per chunk). If embedding is awaited inside trade/journal creation, the user's primary workflow is blocked by an AI infrastructure concern.

## Constraints

- Trade creation must never fail due to embedding unavailability
- Journal save must never fail due to embedding unavailability
- Research save must never fail due to embedding unavailability
- Asset upload must never fail due to embedding unavailability

## Decision

All ingestion is fire-and-forget (`.catch(() => {})`). Errors are logged but not propagated. `ImmediateEmbeddingPipeline` runs synchronously but callers don't `await` the result.

## Alternatives considered

| Alternative               | Why rejected                               |
| ------------------------- | ------------------------------------------ |
| Await embedding           | User workflow blocked by AI infrastructure |
| Queue with retry (BullMQ) | Adds infrastructure dependency for MVP     |
| Skip on failure silently  | Same as current, but without logging       |

## Consequences

- - Trade/journal/research creation always succeeds
- - Embedding failures are observable via logs
- - Lost embeddings are not retried (acceptable — data is still in primary store)
- - Semantic index may lag behind primary data (acceptable gap)

## Migration notes

Existing `MemoryService.embedNewTrade()`/`embedNewJournal()` already used `.catch(() => {})`. The pipeline formalizes this pattern across all ingestion sources.
