# ADR 0001: Monorepo Structure

## Status

Accepted

## Context

TradeZen is a full-stack application with a Next.js frontend and NestJS backend. We need to decide on the project structure to support:
- Shared types between frontend and backend
- Shared UI components (if any)
- Independent deployments
- Developer experience (single repo, single install)

## Decision

Use Turborepo with Bun workspaces in a monorepo structure:
- `apps/web` - Next.js 14 (App Router)
- `apps/api` - NestJS 11
- `packages/db` - Drizzle ORM + pgvector
- `packages/types` - Shared TypeScript types
- `packages/ui` - Shared UI components
- `packages/eslint-config` - Shared ESLint configs
- `packages/typescript-config` - Shared TypeScript configs

## Consequences

**Easier:**
- Sharing types between frontend and backend
- Coordinated deployments
- Single `bun install` for all dependencies
- Turborepo caching for builds

**Harder:**
- More complex initial setup
- Need to understand workspace protocol
- Build order dependencies (db before api)
