# FIX-002: Chat Provider Management Requires Authentication

Status: Draft
Owner: TradeZen API
Date: 2026-08-01
Severity: Critical

---

## Problem

Four provider-management endpoints in `chat.controller.ts` are marked
`@Public()`, bypassing the global `JwtAuthGuard`:

- `GET /chat/models/providers` — provider health (read-only)
- `POST /chat/models/refresh` — forces model re-discovery
- `POST /chat/models/providers` — adds a custom provider (accepts arbitrary
  `baseUrl`, `apiKey`, `models`)
- `DELETE /chat/models/providers/:id` — removes a custom provider

The three write/admin endpoints are unauthenticated. `POST /chat/models/providers`
accepts an arbitrary base URL, creating an SSRF/abuse surface; `POST /models/refresh`
and `DELETE` allow unauthenticated disruption of the model catalog.

## Root Cause

`@Public()` decorators on lines 62, 71, 78, 93 of
`apps/api/src/chat/chat.controller.ts`. `JwtAuthGuard` skips any route carrying
the public metadata flag.

## Expected Behavior

Only the read-only health endpoint stays public.

| Endpoint | Auth after fix |
|----------|----------------|
| `GET /chat/models/providers` | Public (read-only health check) |
| `POST /chat/models/refresh` | Authenticated (JWT) |
| `POST /chat/models/providers` | Authenticated (JWT) |
| `DELETE /chat/models/providers/:id` | Authenticated (JWT) |

Unauthenticated write requests → `401 Unauthorized` from the global guard.

## Edge Cases

- Frontend `Settings → AI Provider` flow must already send the JWT; since the
  global guard is on everywhere except `@Public()`, this should hold — verify
  the frontend calls for these endpoints carry credentials.
- `GET /chat/models/providers` remains public so the dashboard can render
  provider health before/without login state.

## Error Cases

- Unauthenticated `POST /chat/models/refresh` → `401`
- Unauthenticated `POST /chat/models/providers` → `401`
- Unauthenticated `DELETE /chat/models/providers/:id` → `401`

## Compatibility

Breaking: No

API Contract: Changed — the three write/admin endpoints now require
`Authorization: Bearer <JWT>`. This is a hardening change; the request/response
shapes are otherwise unchanged.

## Regression Risk

Medium

Affected Areas:

- Frontend settings UI that manages providers
- Model catalog refresh flow (`getModelsV2`, `refreshModels`)
- Anything that currently calls `POST /chat/models/refresh` without auth

## Acceptance Criteria

- [ ] `POST /chat/models/providers`, `POST /chat/models/refresh`,
      `DELETE /chat/models/providers/:id` return `401` without a JWT
- [ ] The same endpoints return `200` with a valid JWT
- [ ] `GET /chat/models/providers` still returns provider health without auth

## Implementation Notes

Remove `@Public()` from the three write/admin handlers. Keep it on
`GET models/providers`. Verify the web client attaches the access token to
these requests.

No migration. No dependency changes.

## Files Affected

- `apps/api/src/chat/chat.controller.ts`

## Test Plan

Unit (NestJS `Test.createTestingModule` + supertest):

- No token on `POST /chat/models/refresh` → `401`
- Valid token on `POST /chat/models/refresh` → `200`
- No token on `POST /chat/models/providers` → `401`
- No token on `DELETE /chat/models/providers/:id` → `401`
- No token on `GET /chat/models/providers` → `200`

Regression:

- Authenticated model-catalog and provider-health flows still work.
