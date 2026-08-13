# FIX-005: Knowledge Search Minimum Query Length

Status: Draft
Owner: TradeZen API
Date: 2026-08-01
Severity: Medium

---

## Problem

`KnowledgeService.search` only rejects queries shorter than 1 character after
trim, so a single character like `"a"` passes and triggers an
`ILIKE '%a%'` scan over `knowledge_documents`. Every keystroke in the frontend
search box can fire a broad, expensive query.

## Root Cause

`apps/api/src/knowledge/knowledge.service.ts` line 335:

```ts
if (q.length < 1) return [];
```

## Expected Behavior

Queries shorter than 2 characters (after trim) return an empty result set
without touching the database.

```
GET /knowledge/search?q=<query>
  q = query.trim()
  q.length < 2 → 200 [] (no DB query)
  otherwise → ILIKE title %q%, limit 20
```

## Edge Cases

- `q=""` → `[]`
- `q=" "` → `[]`
- `q="a"` → `[]`
- `q="a "` → `[]`
- `q="ab"` → executes search
- Multi-byte/unicode single char (e.g. `"汉"`) → `[]` (length is measured in
  UTF-16 code units; acceptable and documented)

## Error Cases

- None new.

## Compatibility

Breaking: No

API Contract: Changed — 1-character searches now return `[]` instead of
executing a search. Documented behavior change; response shape unchanged.

## Regression Risk

Low

Affected Areas:

- Knowledge search UI (frontend `KnowledgeWorkspace` search)
- `SearchCapability` for knowledge module

## Acceptance Criteria

- [ ] 1-char and empty queries return `[]` without a DB hit
- [ ] 2+ char queries execute and return matches (existing behavior)
- [ ] Returned shape unchanged

## Implementation Notes

Change the guard to `if (q.length < 2) return [];`. Keep trimming first.

No migration. No dependency changes.

## Files Affected

- `apps/api/src/knowledge/knowledge.service.ts`
- `apps/api/src/knowledge/knowledge.service.spec.ts` (extend)

## Test Plan

Unit (extend `knowledge.service.spec.ts`):

- `search('u1', '')` → `[]`, `db` select not invoked
- `search('u1', 'a')` → `[]`, `db` select not invoked
- `search('u1', 'ab')` → invokes select with `%ab%`

Regression:

- Existing knowledge service specs still pass.
