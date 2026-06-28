# ADR 0003: Authentication Strategy

## Status

Accepted

## Context

TradeZen needs:
- Secure user authentication
- OAuth support (Google, GitHub)
- JWT-based API authentication
- Refresh token rotation
- Two-factor authentication

## Decision

Implement JWT-based authentication with:
- Access tokens (short-lived, 15 minutes)
- Refresh tokens (HTTP-only cookies, 7 days)
- OAuth via Passport.js (Google, GitHub)
- Two-factor authentication (TOTP)
- Rate limiting and brute-force protection

## Consequences

**Easier:**
- Stateless API authentication
- OAuth for quick signup
- Refresh tokens for seamless UX
- 2FA for security-conscious users

**Harder:**
- Token rotation complexity
- OAuth provider integration
- Session management
- Rate limiting implementation
