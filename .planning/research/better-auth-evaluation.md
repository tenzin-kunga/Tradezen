# Better Auth Evaluation Report

> **Date:** 2026-05-16
> **Analyst:** AI Research Agent
> **Status:** RECOMMENDATION PENDING

## Current Auth Architecture

### Token Flow

TradeZen uses a dual-JWT strategy with NestJS + Passport:

1. **Login** (`POST /auth/login`): User submits `identifier` (email/username) + `password` + optional `remember_me`
2. Server validates credentials against PostgreSQL `users` table via raw `pg` pool
3. Brute-force protection checked before validation (lockout after failed attempts)
4. On success, two tokens are issued:
   - **Access token**: JWT signed with `JWT_SECRET`, 15-minute expiry, sent in response body as `{ access_token }`
   - **Refresh token**: JWT signed with `JWT_REFRESH_SECRET`, 7-day expiry, set as HTTP-only cookie `refresh_token`
5. Client uses Bearer token for API calls (`Authorization: Bearer <access_token>`)
6. Client calls `POST /auth/refresh` with cookie to get new access token when expired

### Refresh Mechanism

- Refresh tokens are stateless JWTs (not stored in database)
- No rotation tracking — old refresh tokens remain valid until expiry
- `remember_me` flag embedded in refresh payload, controls cookie `maxAge`
- No server-side session invalidation — logout only clears client cookie
- Token refresh re-verifies user exists in database (DB lookup on each refresh)

### Cookie Strategy

| Attribute | Value |
|-----------|-------|
| `httpOnly` | `true` — prevents XSS access |
| `secure` | `true` in production, `false` in dev |
| `sameSite` | `'none'` in production (cross-origin), `'lax'` in dev |
| `maxAge` | 7 days if `remember_me`, session cookie otherwise |
| `path` | `/` |

### User Isolation

- JWT payload contains `{ sub, email, username }`
- `@CurrentUser('id')` decorator extracts `sub` from validated JWT
- All data queries use `WHERE id = $1` with the extracted user ID
- No row-level security — isolation relies on correct query construction
- No tenant/organization model — single-user-per-account

## Better Auth Comparison

| Feature | Current JWT | Better Auth | Advantage |
|---------|------------|-------------|-----------|
| Session management | Stateless JWTs, no server-side tracking | Database-backed sessions with `session` table (id, token, userId, expiresAt, ipAddress, userAgent) + optional cookie cache | **Better Auth** — enables server-side revocation, session listing, device tracking |
| Refresh tokens | Stateless JWT in cookie, no rotation, no invalidation | Session token stored in DB, automatic expiry refresh via `updateAge`, cookie-based session with optional JWE/JWT cache | **Better Auth** — supports session revocation, multi-device management |
| Cookie security | Manual config: httpOnly, secure (prod), sameSite (none/lax) | Automatic: all cookies httpOnly + secure in production, configurable via `advanced.cookieOptions`, cross-subdomain support | **Better Auth** — safer defaults, less manual config |
| SSR compatibility | Bearer token in response body — requires client-side storage + manual injection into SSR requests | Cookie-based sessions — automatic with SSR, no client-side token management needed | **Better Auth** — native SSR support, simpler Next.js integration |
| OAuth support | None implemented — would require manual passport-strategy setup | Built-in: Google, GitHub, + 50+ providers via plugins, generic OAuth for custom providers | **Better Auth** — OAuth ready out of the box |
| Database requirements | Raw `pg` pool, manual `users` table | Requires `user`, `session`, `account`, `verification` tables. Supports Kysely (built-in), Prisma, Drizzle adapters. CLI migration tooling | **Mixed** — Better Auth needs schema changes, but provides migration tooling |
| NestJS compatibility | Native — built on NestJS + Passport | **Not natively designed for NestJS** — Better Auth is framework-agnostic but expects direct HTTP handler integration (Hono, Express, etc.). Would require custom adapter or Express middleware wrapper | **Current JWT** — Better Auth would need integration work |
| Migration complexity | N/A | Requires: new tables, auth config rewrite, cookie flow change from Bearer→session cookie, frontend token handling rewrite | **High risk** — breaking changes to auth flow |

## Migration Risks

1. **NestJS Integration Gap**: Better Auth is designed for Hono/Next.js/Express direct handlers, not NestJS's decorator-based controller model. Would require either (a) mounting Better Auth as Express middleware alongside NestJS, or (b) writing a custom NestJS module wrapper. Both approaches add complexity and potential edge cases.

2. **Frontend Auth Flow Rewrite**: Current frontend expects `{ access_token }` in response body and uses Bearer auth. Better Auth uses cookie-based sessions exclusively. All API interceptors, SSR data fetching, and token refresh logic would need rewriting.

3. **Session State Migration**: Current system has no server-side sessions — all state is in JWTs. Better Auth requires a `session` table. Existing logged-in users would be forced to re-login after migration. No graceful migration path for in-flight JWTs.

4. **Cookie Domain Mismatch**: Current setup uses `sameSite: 'none'` in production (cross-origin). Better Auth defaults to same-origin cookies. Cross-subdomain support exists but requires explicit configuration. If frontend and API are on different domains, additional proxy or domain config needed.

5. **Brute-Force Protection Loss**: Current implementation has custom brute-force lockout service. Better Auth has a built-in rate limiter, but the specific lockout behavior (IP tracking, per-identifier lockout) would need verification or custom implementation.

## Recommendation

**DEFER**

## Rationale

Better Auth is a compelling authentication framework with strong defaults, comprehensive plugin ecosystem, and excellent SSR support. However, for TradeZen's current architecture, migration is not justified:

**Security posture**: Current JWT implementation is sound — httpOnly cookies, separate refresh secret, brute-force protection, proper sameSite handling. Better Auth offers incremental improvements (server-side revocation, session tracking) but not a security upgrade that justifies migration risk.

**Development effort**: High. Requires: (1) NestJS integration layer, (2) database schema migration with new tables, (3) frontend auth flow rewrite (Bearer → cookie sessions), (4) all protected endpoint testing, (5) brute-force protection parity. Estimated 2-3 days of focused work with testing.

**User impact**: All existing sessions invalidated. Forced re-login for all users. Potential for auth bugs during transition period.

**Timeline**: TradeZen is in active development (phases 0-5 per PLAN.md). Auth migration would divert resources from core trading features. Better Auth's value proposition (OAuth, organizations, 2FA) is not currently needed.

**When to reconsider**:
- OAuth/social login becomes a requirement
- Multi-tenant/organization features are needed
- Server-side session revocation becomes critical
- Next.js App Server SSR becomes primary rendering mode

## Next Steps (if proceeding)

1. **Prototype NestJS integration**: Mount Better Auth as Express middleware at `/api/auth/*` path, verify it coexists with NestJS controllers without conflicts
2. **Run migration CLI**: Generate schema, review required tables (`user`, `session`, `account`, `verification`), assess impact on existing `users` table
3. **Build parallel auth flow**: Implement Better Auth alongside current JWT, run A/B testing, verify no regression in existing auth endpoints before cutover
