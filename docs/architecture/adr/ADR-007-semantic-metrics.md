# ADR-007: Separation of Metrics from Context

**Status:** Accepted
**Date:** 2026-07-07

## Problem

Operational telemetry (embedding latency, retrieval similarity, chunk counts) is useful for debugging and optimization but shouldn't pollute AI prompts.

## Constraints

- Metrics must be queryable for diagnostics
- Metrics must not increase token usage
- Metrics must be available per-request and aggregate

## Decision

`SemanticMetrics` is a separate service with its own endpoint (`GET /semantic/metrics`). Not part of `BuiltContext`. The `SemanticMetricsService` accumulates metrics in memory and exposes them via a dedicated API. The Context Explorer Diagnostics tab reads from this endpoint.

## Alternatives considered

| Alternative                    | Why rejected                              |
| ------------------------------ | ----------------------------------------- |
| Add metrics to BuiltContext    | Pollutes AI prompts with operational data |
| Embed metrics in system prompt | Wastes tokens, leaks internals            |
| Log-only                       | Not queryable, not visible in UI          |

## Consequences

- - Clean separation: context for AI, metrics for operators
- - Diagnostics tab shows real-time metrics
- - Metrics don't consume token budget
- - Separate endpoint to maintain
