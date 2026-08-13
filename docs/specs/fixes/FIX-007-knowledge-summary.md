# FIX-007: Knowledge Summary — Named Truncation Limit + Logging

Status: Draft
Owner: TradeZen API
Date: 2026-08-01
Severity: Low

---

## Problem

`KnowledgeEnrichmentService.generateSummary` silently truncates document content
to 6000 characters before summarization. The value is a magic number with no
constant and no indication that truncation occurred. For long documents the
summary is built from only the head of the content, and there is no signal in
logs or metrics that this happened.

## Root Cause

`apps/api/src/knowledge/knowledge-enrichment.service.ts` line 44:

```ts
{ role: 'user', content: content.slice(0, 6000) },
```

## Expected Behavior

```
content longer than MAX_SUMMARY_INPUT_CHARS
  ↓
log warning: "Document <id> truncated from <n> to <6000> chars for summarization"
  ↓
summarize truncated content
```

Behavior is unchanged functionally (still summarize at most 6000 chars); the
change makes the limit named and observable.

## Edge Cases

- `content.length <= 6000` → no log, no truncation
- `content.length > 6000` → warn log + truncation
- Empty/whitespace content → early return in `enrichDocument` (unchanged)

## Error Cases

- None new.

## Compatibility

Breaking: No

API Contract: Unchanged — AI enrichment is internal; no request/response
surface change.

## Regression Risk

Low

Affected Areas:

- Knowledge enrichment (embedding + summary on create/update)
- `ai_summary` field contents

## Acceptance Criteria

- [ ] `MAX_SUMMARY_INPUT_CHARS` constant defined with value `6000`
- [ ] Warn log emitted when content is truncated
- [ ] No log when content fits within the limit
- [ ] Truncation behavior unchanged (still 6000 chars max)

## Implementation Notes

Add a module-level constant (or `static readonly` on the service) and a
`this.logger.warn(...)` guard before slicing.

No migration. No dependency changes.

## Files Affected

- `apps/api/src/knowledge/knowledge-enrichment.service.ts`

## Test Plan

Unit (Jest, service with mocked `AIClient` and `DocumentEmbedder`):

- `generateSummary` with content > 6000 → logger.warn called, AIClient receives
  `content.slice(0, 6000)`
- `generateSummary` with content <= 6000 → no warn, AIClient receives full content

Regression:

- `knowledge.service.spec.ts` (create/update enrichment dispatch) still passes.
