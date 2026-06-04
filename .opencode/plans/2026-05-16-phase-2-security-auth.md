# Phase 2: Security & Auth Modernization — Implementation Plan

> **Date:** 2026-05-16
> **Branch:** develop
> **Predecessor:** Phase 1 (TZ-001 through TZ-004) — complete
> **Execution Strategy:** Subagent-driven development (parallel tasks)

---

## Overview

Three independent tasks. TZ-010 and TZ-014 implemented in parallel. TZ-011 research runs in parallel (read-only analysis).

| Task | Type | Risk | Dependencies |
|------|------|------|--------------|
| TZ-010: Rate Limiting | Implementation | Low | None |
| TZ-011: Auth Evaluation | Research | None | None |
| TZ-014: Security Hardening | Implementation | Medium | TZ-010 (headers applied after rate limiting) |

---

## TZ-010: Rate Limiting & Abuse Protection

### Goal
Protect auth endpoints and AI endpoints from brute-force and abuse.

### Tasks

#### Step 1: Install @nestjs/throttler
```bash
cd apps/api
npm install @nestjs/throttler
```

#### Step 2: Configure ThrottlerModule in app.module.ts
Add to AppModule imports:
```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60000,    // 1 minute window
    limit: 10,     // 10 requests per minute (default)
  },
]),
```

#### Step 3: Apply strict throttling to auth endpoints
In `auth.controller.ts`, add `@Throttle({ default: { limit: 5, ttl: 60000 } })` to login/register endpoints.

#### Step 4: Apply throttling to AI/chat endpoints
In `chat.controller.ts`, add `@Throttle({ default: { limit: 20, ttl: 60000 } })` to chat endpoints.

#### Step 5: Add suspicious activity logging
Create `apps/api/src/common/decorators/throttled-event.decorator.ts` that logs when rate limits are hit.

Create `apps/api/src/common/guards/throttler.guard.ts`:
```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Logger } from '@nestjs/common';

@Injectable()
export class ThrottlerEventsGuard extends ThrottlerGuard {
  private readonly logger = new Logger('ThrottlerEvents');

  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    const result = await super.handleRequest(context, limit, ttl);
    if (!result) {
      const req = context.switchToHttp().getRequest();
      this.logger.warn({
        event: 'rate_limit_exceeded',
        ip: req.ip,
        url: req.url,
        requestId: req.id,
        limit,
        ttl,
      });
    }
    return result;
  }
}
```

Replace the default `ThrottlerGuard` in app.module.ts providers.

#### Step 6: Add login brute-force tracking
Create `apps/api/src/common/services/brute-force.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectPool } from 'nestjs-pg';
import { Pool } from 'pg';

@Injectable()
export class BruteForceService {
  private readonly logger = new Logger('BruteForce');
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor(@InjectPool() private readonly pool: Pool) {}

  async recordFailedAttempt(identifier: string, ip: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO login_attempts (identifier, ip, created_at)
       VALUES ($1, $2, NOW())`,
      [identifier, ip],
    );
  }

  async isLockedOut(identifier: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as attempts
       FROM login_attempts
       WHERE identifier = $1
       AND created_at > NOW() - INTERVAL '15 minutes'`,
      [identifier],
    );
    return parseInt(result.rows[0].attempts) >= this.MAX_ATTEMPTS;
  }

  async clearAttempts(identifier: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM login_attempts WHERE identifier = $1`,
      [identifier],
    );
  }
}
```

#### Step 7: Create login_attempts table migration
Create `apps/api/migrations/005_login_attempts.sql`:
```sql
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_identifier ON login_attempts(identifier);
CREATE INDEX idx_login_attempts_created_at ON login_attempts(created_at);
```

#### Step 8: Integrate brute-force check into auth service
In `auth.service.ts`, check `isLockedOut` before validating credentials. Record failed attempts. Clear on success.

### Acceptance Criteria
- [ ] `@nestjs/throttler` installed and configured
- [ ] Auth endpoints: 5 req/min limit
- [ ] Chat endpoints: 20 req/min limit
- [ ] Rate limit exceeded events logged with IP, URL, request ID
- [ ] Login brute-force: 5 attempts → 15 min lockout
- [ ] `login_attempts` table created via migration
- [ ] TypeScript compiles, lint passes

---

## TZ-011: Better Auth Evaluation (Research)

### Goal
Research migration feasibility from custom JWT auth to Better Auth. Produce decision document.

### Tasks

#### Step 1: Analyze current auth architecture
- Read `auth.service.ts`, `jwt.strategy.ts`, `jwt-auth.guard.ts`
- Document: token flow, refresh mechanism, cookie strategy, user isolation

#### Step 2: Research Better Auth
- Fetch Better Auth docs: https://www.better-auth.com/docs
- Compare: session management, SSR compatibility, cookie security, OAuth support

#### Step 3: Write evaluation report
Create `.planning/research/better-auth-evaluation.md`:

```markdown
# Better Auth Evaluation Report

## Current Auth Architecture
- JWT access tokens (15 min expiry)
- HTTP-only refresh tokens (7 day expiry)
- Cookie-based session storage
- User isolation via JWT payload

## Better Auth Comparison
| Feature | Current JWT | Better Auth |
|---------|------------|-------------|
| Session management | Manual JWT | Automatic |
| Refresh tokens | Custom implementation | Built-in |
| Cookie security | HTTP-only, secure | HTTP-only, secure, sameSite |
| OAuth support | Not implemented | Built-in (Google, GitHub, etc.) |
| SSR compatibility | Partial | Full |
| Migration complexity | N/A | Medium-High |

## Migration Risks
1. Session invalidation for all existing users
2. Cookie format change requires re-authentication
3. User table schema changes
4. Frontend auth flow changes

## Recommendation
[DEFER / PROCEED WITH CAUTION / NOT RECOMMENDED]

## Rationale
[Detailed reasoning]
```

### Acceptance Criteria
- [ ] Current auth architecture documented
- [ ] Better Auth features compared
- [ ] Migration risks identified
- [ ] Recommendation with rationale
- [ ] Report written to `.planning/research/better-auth-evaluation.md`

---

## TZ-014: Security Hardening Phase 2

### Goal
Defense-in-depth: security headers, audit logging, suspicious login detection, 2FA foundation.

### Tasks

#### Step 1: Install Helmet
```bash
cd apps/api
npm install helmet
```

#### Step 2: Configure Helmet in main.ts
Add after CORS setup:
```typescript
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", process.env.WEB_URL ?? 'http://localhost:3000'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    crossOriginEmbedderPolicy: false, // Allow embedded resources from same origin
  }),
);
```

#### Step 3: Create audit log table migration
Create `apps/api/migrations/006_audit_log.sql`:
```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  resource_id INTEGER,
  ip VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
```

#### Step 4: Create audit logging service
Create `apps/api/src/common/services/audit.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectPool } from 'nestjs-pg';
import { Pool } from 'pg';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGIN_LOCKOUT'
  | 'PASSWORD_CHANGE'
  | 'SETTINGS_UPDATE'
  | 'TRADE_CREATE'
  | 'TRADE_UPDATE'
  | 'TRADE_DELETE'
  | 'CSV_IMPORT'
  | 'CHAT_MESSAGE'
  | 'RATE_LIMIT_EXCEEDED';

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(@InjectPool() private readonly pool: Pool) {}

  async log(params: {
    userId?: number;
    action: AuditAction;
    resource?: string;
    resourceId?: number;
    ip?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO audit_log (user_id, action, resource, resource_id, ip, user_agent, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          params.userId,
          params.action,
          params.resource,
          params.resourceId,
          params.ip,
          params.userAgent,
          params.details ? JSON.stringify(params.details) : null,
        ],
      );
    } catch (error) {
      this.logger.error(`Audit log failed: ${(error as Error).message}`);
    }
  }
}
```

#### Step 5: Create suspicious login detection service
Create `apps/api/src/common/services/suspicious-login.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectPool } from 'nestjs-pg';
import { Pool } from 'pg';

@Injectable()
export class SuspiciousLoginService {
  private readonly logger = new Logger('SuspiciousLogin');

  constructor(@InjectPool() private readonly pool: Pool) {}

  async detectAnomalies(userId: number, ip: string): Promise<string[]> {
    const flags: string[] = [];

    // Check for login from new IP
    const knownIps = await this.pool.query(
      `SELECT DISTINCT ip FROM login_attempts
       WHERE identifier = (SELECT email FROM users WHERE id = $1)
       AND created_at > NOW() - INTERVAL '30 days'`,
      [userId],
    );

    const isKnownIp = knownIps.rows.some((row) => row.ip === ip);
    if (!isKnownIp && knownIps.rows.length > 0) {
      flags.push('NEW_IP');
      this.logger.warn({
        event: 'suspicious_login',
        userId,
        ip,
        flag: 'NEW_IP',
      });
    }

    // Check for rapid successive logins
    const recentLogins = await this.pool.query(
      `SELECT COUNT(*) as count FROM login_attempts
       WHERE identifier = (SELECT email FROM users WHERE id = $1)
       AND created_at > NOW() - INTERVAL '5 minutes'`,
      [userId],
    );

    if (parseInt(recentLogins.rows[0].count) > 3) {
      flags.push('RAPID_LOGIN');
      this.logger.warn({
        event: 'suspicious_login',
        userId,
        ip,
        flag: 'RAPID_LOGIN',
      });
    }

    return flags;
  }
}
```

#### Step 6: Create 2FA schema and service foundation
Create `apps/api/migrations/007_two_factor.sql`:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB;
```

Create `apps/api/src/auth/services/two-factor.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectPool } from 'nestjs-pg';
import { Pool } from 'pg';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger('TwoFactor');

  constructor(@InjectPool() private readonly pool: Pool) {}

  async generateSecret(userId: number): Promise<string> {
    const secret = crypto.randomBytes(20).toString('base32');
    await this.pool.query(
      'UPDATE users SET two_factor_secret = $1 WHERE id = $2',
      [secret, userId],
    );
    return secret;
  }

  async verifyToken(userId: number, token: string): Promise<boolean> {
    // TOTP verification — implement RFC 6238 algorithm
    // For now, return false until full implementation
    this.logger.warn('2FA verification not yet implemented');
    return false;
  }

  async enableTwoFactor(userId: number): Promise<void> {
    await this.pool.query(
      'UPDATE users SET two_factor_enabled = true WHERE id = $1',
      [userId],
    );
  }

  async disableTwoFactor(userId: number): Promise<void> {
    await this.pool.query(
      'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1',
      [userId],
    );
  }
}
```

#### Step 7: Integrate audit logging into auth service
In `auth.service.ts`:
- Log `LOGIN_SUCCESS` on successful login
- Log `LOGIN_FAILURE` on failed login
- Log `LOGIN_LOCKOUT` when brute-force lockout triggers

#### Step 8: Integrate suspicious login detection into auth flow
After successful login, call `SuspiciousLoginService.detectAnomalies(userId, ip)`. If flags returned, include in response.

### Acceptance Criteria
- [ ] Helmet middleware applied with CSP, HSTS, and other security headers
- [ ] CSP directives: self-only scripts, no objects, no frames
- [ ] HSTS: 1 year max-age, includeSubDomains, preload
- [ ] `audit_log` table created via migration
- [ ] `AuditService` operational with typed actions
- [ ] Auth events logged: LOGIN_SUCCESS, LOGIN_FAILURE, LOGIN_LOCKOUT
- [ ] `SuspiciousLoginService` detects new IP and rapid logins
- [ ] 2FA schema columns added to users table
- [ ] `TwoFactorService` foundation created (secret generation, enable/disable)
- [ ] TypeScript compiles, lint passes

---

## Execution Order

```
TZ-010 (implementer) ──────────────────────┐
                                            ├──→ Verify all compile + lint
TZ-011 (researcher) ────────────────────────┤
                                            │
TZ-014 (implementer) ──────────────────────┘
```

All three tasks dispatched as fresh subagents in parallel. Each gets independent context.

## Verification Checklist

- [ ] `npx tsc --noEmit` passes in apps/api
- [ ] `npm run lint` passes (api only)
- [ ] Rate limiting tested: 5 requests to /auth/login in 1 minute → 429
- [ ] Security headers present: `curl -I http://localhost:3001` shows CSP, HSTS, X-Frame-Options
- [ ] Audit log table exists: `SELECT * FROM audit_log LIMIT 1`
- [ ] Login attempts table exists: `SELECT * FROM login_attempts LIMIT 1`
- [ ] Better auth evaluation report exists: `.planning/research/better-auth-evaluation.md`

## Commit Strategy

Each task commits independently:
1. `feat: rate limiting with brute-force protection (TZ-010)`
2. `docs: Better Auth evaluation report (TZ-011)`
3. `feat: security hardening with Helmet, audit logging, 2FA foundation (TZ-014)`

Quality fixes commit separately after review.
