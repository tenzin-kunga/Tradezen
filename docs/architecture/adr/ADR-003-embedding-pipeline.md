# ADR-003: Embedding Pipeline as Ingestion Layer

**Status:** Accepted
**Date:** 2026-07-07

## Problem

Embedding logic was scattered across 4+ services with inconsistent dedup strategies and sourceId conventions. Some used timestamps as IDs (orphaning old embeddings), some used contentHash, some had no dedup.

## Constraints

- Must not block trade/journal creation (embedding API can be slow/unavailable)
- Must support multiple sourceTypes with different chunking needs
- Must be swappable (MVP synchronous, future BullMQ)

## Decision

Introduce `EmbeddingPipeline` interface with `enqueue(SemanticDocument)`. `ImmediateEmbeddingPipeline` (MVP) chunks, embeds, and stores synchronously but callers don't await (fire-and-forget). `EmbeddingRepository` abstracts pgvector storage. `SemanticFormatter<T>` converts domain entities to `SemanticDocument`.

## Alternatives considered

| Alternative                           | Why rejected                                           |
| ------------------------------------- | ------------------------------------------------------ |
| Keep inline embedding in each service | Scattered, inconsistent, no dedup                      |
| BullMQ queue from day one             | Premature optimization, adds infrastructure dependency |
| Single embedding function             | Doesn't handle chunking for long documents             |

## Consequences

- - All ingestion follows one path
- - Pipeline can be swapped (BullMQ) without changing callers
- - Formatters keep ingestion logic separate from domain services
- - Fire-and-forget errors are silently logged (acceptable for MVP)
- - No retry for failed embeddings (yet)
