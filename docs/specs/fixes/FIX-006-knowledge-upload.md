# FIX-006: Knowledge Upload — Missing File Returns 400

Status: Draft
Owner: TradeZen API
Date: 2026-08-01
Severity: Low

---

## Problem

`KnowledgeController.uploadAsset` throws a plain `Error('No file provided')`
when the multipart request has no file. NestJS converts uncaught `Error` into
`500 Internal Server Error`. This is a client error and should be `400`.

## Root Cause

`apps/api/src/knowledge/knowledge.controller.ts` line 167:

```ts
if (!file) throw new Error('No file provided');
```

Every other error path in this controller/service uses NestJS exceptions
(`NotFoundException`, `HttpException`).

## Expected Behavior

```
POST /knowledge/documents/:id/assets  (multipart, no file)
  ↓
400 Bad Request — "No file provided"
```

## Edge Cases

- Request with no `file` field → `400`
- Request with file → proceeds to upload (unchanged)
- Oversized file → existing `fileSize` limit behavior (unchanged)

## Error Cases

- Missing file → `400 Bad Request` with message `No file provided`

## Compatibility

Breaking: No

API Contract: Unchanged — error status code improves from 500 to 400 for a
client-side mistake. Response shape for success unchanged.

## Regression Risk

Low

Affected Areas:

- Knowledge document asset upload (frontend `AssetsInspector`)
- File upload error handling

## Acceptance Criteria

- [ ] Upload without a file returns `400 Bad Request`
- [ ] Upload with a valid file still returns `201`
- [ ] Other upload error paths (unsupported type, size limit) unchanged

## Implementation Notes

Replace `new Error('No file provided')` with
`new BadRequestException('No file provided')` and add `BadRequestException` to
the `@nestjs/common` import in the controller.

No migration. No dependency changes.

## Files Affected

- `apps/api/src/knowledge/knowledge.controller.ts`

## Test Plan

Unit (NestJS `Test.createTestingModule` + supertest, or controller unit test
with mocked service):

- Call handler with `file = undefined` → rejects `BadRequestException`
- Call handler with a file → returns service result (no exception)

Regression:

- Asset upload flow still works end to end.
