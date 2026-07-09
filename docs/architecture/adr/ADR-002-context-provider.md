# ADR-002: Provider-Based Context Assembly

**Status:** Accepted
**Date:** 2026-07-07

## Problem

AI chat needed context from 6+ data sources (trades, analytics, research, portfolio, news, memory). Hardcoding context assembly in ChatService would create tight coupling.

## Constraints

- Backend must own context assembly (no frontend data assembly)
- Context must respect token budgets
- New data sources should not require modifying existing code

## Decision

Introduce `ContextProvider` interface with `supports(request)` + `build(userId, request, lastUserMessage?)`. `ContextBuilderService` runs all providers in parallel via `Promise.allSettled()`, budget-trims to 2000 tokens, and returns `BuiltContext`. Frontend sends `ContextRequest` (intent), not assembled data.

## Alternatives considered

| Alternative                   | Why rejected                            |
| ----------------------------- | --------------------------------------- |
| Frontend assembles context    | Two sources of truth, stale data risk   |
| Monolithic context function   | Not extensible, single point of failure |
| Sequential provider execution | Latency (7 providers × 100-300ms each)  |

## Consequences

- - New data source = new provider (zero existing code changes)
- - Frontend sends intent, not data → no duplication
- - Per-provider timeout prevents one slow provider from blocking
- - Token estimation is approximate (no real tokenizer)
- - In-memory cache not shared across instances
