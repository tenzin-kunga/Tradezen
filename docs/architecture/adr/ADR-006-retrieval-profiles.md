# ADR-006: Intent-Based Retrieval Profiles

**Status:** Accepted
**Date:** 2026-07-07

## Problem

Different use cases need different retrieval behavior: chat needs breadth (15 results, 0.7 threshold), coaching needs precision (5 results, 0.75 threshold), reports need depth (20 results, 0.6 threshold).

## Constraints

- Providers shouldn't know about retrieval internals
- Profiles must be tunable without code changes
- New intents should be addable without modifying existing code

## Decision

`RetrievalIntent` enum maps to `RetrievalProfile` (maxResults, similarityThreshold, maxTokens). `ProfileRegistry` is injectable and tunable. Providers pass intent to `SemanticRetrievalService.retrieve()`, which looks up the profile internally.

## Alternatives considered

| Alternative                       | Why rejected                           |
| --------------------------------- | -------------------------------------- |
| Hardcoded thresholds per provider | Not tunable, scattered configuration   |
| Expose profiles to frontend       | Leaks implementation detail            |
| Single universal profile          | Can't optimize for different use cases |

## Consequences

- - Tunable thresholds without code changes
- - New intents = new profile entry
- - Providers stay simple (just pass intent)
- - Profile selection is implicit (provider decides intent)
