# ADR-001: Unified Semantic Retrieval

**Status:** Accepted
**Date:** 2026-07-07

## Problem

Two retrieval systems existed with different scoring, dedup, and interfaces:

- `MemoryService` — simple vector search, 0.7 threshold, grouped by sourceType
- `KnowledgeRetrievalService` — chunked, profiled, with evidence model and hybrid ranking

Callers had to know which system to use. Scores weren't comparable across systems.

## Constraints

- Must not break existing knowledge retrieval (KnowledgeRetrievalService still used by knowledge workspace)
- Embeddings table is shared between both systems
- Must support multiple retrieval intents (chat, review, coaching)

## Decision

Introduce `SemanticRetrievalService` as the single entry point for all semantic queries. It wraps the `EmbeddingRepository` and `ProfileRegistry`. `MemoryService` becomes a thin adapter over the pipeline.

`KnowledgeRetrievalService` remains for knowledge-specific features (explicit document links, evidence model) but both systems query the same embeddings table.

## Alternatives considered

| Alternative                                 | Why rejected                            |
| ------------------------------------------- | --------------------------------------- |
| Keep both systems                           | Duplicate logic, inconsistent scoring   |
| Merge Memory into KnowledgeRetrievalService | Couples retrieval with knowledge domain |
| Facade over both                            | Still two internal paths                |

## Consequences

- - One retrieval path, one scoring method, one dedup strategy
- - Providers only call `semantic.retrieve()`
- - Migration effort to adapt existing callers
- - KnowledgeRetrievalService still exists (temporary, to be unified later)

## Migration notes

`MemoryService.getContextForChat()` was dead code (zero callers). `MemoryService.embedNewJournal()`/`embedNewTrade()` became adapters over `EmbeddingPipeline`. No breaking changes to existing APIs.
