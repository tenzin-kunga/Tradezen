# ADR-005: Immutable Embeddings

**Status:** Accepted
**Date:** 2026-07-07

## Problem

Updating embeddings in-place creates race conditions with concurrent searches. A search mid-update could see partial state.

## Constraints

- Must support update workflows (edit trade, edit journal, edit research)
- Must not require distributed locking
- Must be simple to implement and reason about

## Decision

Embeddings are immutable. Updates = delete old chunks + create new chunks. `EmbeddingEvent` model (CREATE/UPDATE/DELETE) handles lifecycle. The `EmbeddingRepository.store()` method always deletes existing rows for a sourceType+sourceId before inserting new ones.

## Alternatives considered

| Alternative          | Why rejected                             |
| -------------------- | ---------------------------------------- |
| Update in-place      | Race conditions with concurrent searches |
| Soft delete with TTL | Storage bloat, query pollution           |
| Versioned embeddings | Complexity overhead for minimal benefit  |

## Consequences

- - Simple, no concurrency issues
- - Clean dedup via contentHash
- - Delete is atomic (single DELETE statement)
- - Slightly more storage (old chunks deleted before new are inserted)
