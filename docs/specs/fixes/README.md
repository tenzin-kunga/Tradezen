# Fix Specs — Release Checklist

Spec-driven fixes for the TradeZen API. Each spec answers one question:
_what behavior is changing, and how do we know it's correct?_

Lifecycle: `Draft → Reviewed → Frozen → Implemented → Verified`.

| Spec | Status | Severity | Batch | Frozen | Implemented | Verified |
| ---- | ------ | -------- | ----- | ------ | ----------- | -------- |
| [FIX-001](FIX-001-routing-order.md) | Frozen | High | 1 | ✓ | ✓ | |
| [FIX-002](FIX-002-chat-provider-auth.md) | Frozen | Critical | 1 | ✓ | ✓ | |
| [FIX-003](FIX-003-chat-models-cache.md) | Frozen | Low | 1 | ✓ | ✓ | |
| [FIX-004](FIX-004-knowledge-authorization.md) | Frozen | High | 2 | ✓ | ✓ | |
| [FIX-005](FIX-005-knowledge-search.md) | Frozen | Medium | 2 | ✓ | ✓ | |
| [FIX-006](FIX-006-knowledge-upload.md) | Frozen | Low | 2 | ✓ | ✓ | |
| [FIX-007](FIX-007-knowledge-summary.md) | Frozen | Low | 2 | ✓ | ✓ | |
| [FIX-008](FIX-008-user-settings-validation.md) | Frozen | Medium | 3 | ✓ | ✓ | |
| [FIX-009](FIX-009-embedding-model-config.md) | Frozen | Medium | 3 | ✓ | ✓ | |

## Batches

- **Batch 1 (chat):** FIX-001 → FIX-002 → FIX-003
- **Batch 2 (knowledge):** FIX-004 → FIX-005 → FIX-006 → FIX-007
- **Batch 3 (config):** FIX-008 → FIX-009

Each batch leaves the repository in a releasable state.

## Release Gate (before PR)

- [x] All specs Frozen
- [ ] All acceptance criteria checked
- [x] All tests passing
- [x] No TODO/FIXME introduced
- [x] Lint clean
- [x] Typecheck clean
- [ ] Manual verification complete
- [ ] CHANGELOG / release notes updated (if applicable)
