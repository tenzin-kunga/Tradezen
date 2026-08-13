# FIX-004: Knowledge Authorization — deleteAsset / deleteLink Ownership

Status: Draft
Owner: TradeZen API
Date: 2026-08-01
Severity: High

---

## Problem

`KnowledgeService.deleteAsset` and `deleteLink` accept `userId` but never use it.
They delete rows by ID alone, so any authenticated user who knows a UUID can
delete another user's knowledge assets or document links (IDOR). These are the
only two methods in `KnowledgeService` that ignore ownership.

## Root Cause

`apps/api/src/knowledge/knowledge.service.ts`:

```ts
async deleteAsset(userId: string, assetId: string) {
  await db.delete(knowledgeAssets).where(eq(knowledgeAssets.id, assetId));
}

async deleteLink(userId: string, linkId: string) {
  await db.delete(knowledgeDocumentLinks).where(eq(knowledgeDocumentLinks.id, linkId));
}
```

Neither `knowledgeAssets` nor `knowledgeDocumentLinks` has a `userId` column;
ownership is indirect via `knowledgeDocuments` (which has `userId`). The
`userId` parameter is currently dead.

## Expected Behavior

Deletion is allowed only when the parent document belongs to the user:

```
deleteAsset(userId, assetId)
  asset.documentId → knowledgeDocuments.documentId
  join knowledgeDocuments ON knowledgeAssets.documentId = knowledgeDocuments.id
  WHERE knowledgeAssets.id = assetId AND knowledgeDocuments.userId = userId
  match? → delete  |  no match → 404
```

```
deleteLink(userId, linkId)
  join knowledgeDocuments ON knowledgeDocumentLinks.sourceDocumentId = knowledgeDocuments.id
  WHERE knowledgeDocumentLinks.id = linkId AND knowledgeDocuments.userId = userId
  match? → delete  |  no match → 404
```

## Edge Cases

- Asset/link does not exist → `404 Asset not found` / `404 Link not found`
  (same response whether missing or owned by another user — avoids leaking
  existence of other users' data).
- Document deleted → cascade deletes assets/links; no change to cascade behavior.
- `listAssets` / `listLinks` already scope by document ownership via
  `getDocument(userId, documentId)` — unaffected.

## Error Cases

- Deleting another user's asset → `404 Not Found` (not 403, per edge cases)
- Deleting a nonexistent asset/link → `404 Not Found`

## Compatibility

Breaking: No

API Contract: Unchanged — same endpoints, same 404 on unauthorized/missing;
the behavioral change is that cross-user deletes now fail instead of succeeding.

## Regression Risk

Medium

Affected Areas:

- Knowledge inspector delete actions (frontend)
- Any caller of `deleteAsset` / `deleteLink`

## Acceptance Criteria

- [ ] Deleting own asset succeeds
- [ ] Deleting another user's asset returns 404 and does NOT delete
- [ ] Deleting another user's link returns 404 and does NOT delete
- [ ] Deleting nonexistent asset/link returns 404
- [ ] `userId` is enforced in both methods (no dead parameter)

## Implementation Notes

Use a scoped join query before delete, matching the existing pattern
(`deleteFolder` / `deleteDocument` verify ownership first). Throw
`NotFoundException` on no match.

No migration. No dependency changes.

## Files Affected

- `apps/api/src/knowledge/knowledge.service.ts`
- `apps/api/src/knowledge/knowledge.service.spec.ts` (extend)

## Test Plan

Unit (extend existing `knowledge.service.spec.ts`; mock `db`):

- `deleteAsset` with matching ownership → delete called with asset id
- `deleteAsset` with non-matching ownership → rejects `NotFoundException`, no delete
- `deleteLink` with matching ownership → delete called with link id
- `deleteLink` with non-matching ownership → rejects `NotFoundException`, no delete

Regression:

- Existing knowledge service specs still pass.
