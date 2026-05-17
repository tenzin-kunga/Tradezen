# Phase 5: Realtime Infrastructure — Implementation Plan

> **Date:** 2026-05-16
> **Branch:** develop
> **Strategy:** Socket.IO + Redis pub/sub, single-process gateway

---

## Architecture Overview

### Current State
- **Zero WebSocket infrastructure** — only SSE for chat streaming
- **Redis available** — used only for BullMQ, no pub/sub
- **Frontend**: raw `fetch()` via `authFetch()` wrapper, no TanStack Query usage
- **Auth**: JWT access tokens (15 min expiry) + HTTP-only refresh cookies
- **CORS**: Single origin, credentials enabled
- **Helmet CSP**: `connectSrc` allows HTTP only — needs `ws://`/`wss://`

### Target State
- Socket.IO WebSocket gateway with JWT auth via query param
- Redis pub/sub for event broadcasting (enables horizontal scaling)
- Realtime trade CRUD events broadcast to connected clients
- Live dashboard updates: PnL, job progress, analytics
- Frontend: Socket.IO client + React hooks for subscriptions

---

## TZ-050: Socket.IO Realtime Layer

### Goal
Establish authenticated WebSocket gateway with rooms per user.

### Step 1: Install dependencies
```bash
cd apps/api
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### Step 2: Update Helmet CSP
In `apps/api/src/main.ts`, update Helmet `connectSrc`:
```typescript
connectSrc: [
  "'self'",
  process.env.WEB_URL ?? 'http://localhost:3000',
  'ws://localhost:3001',
  'wss://localhost:3001',
],
```

### Step 3: Create WebSocket gateway
Create `apps/api/src/gateway/trades.gateway.ts`:
```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/realtime',
})
export class TradesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('TradesGateway');

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.query.token as string;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      client.data.userId = userId;
      client.join(`user:${userId}`);
      this.logger.log(`Client connected: user ${userId}`);
    } catch {
      this.logger.warn('Invalid JWT on WebSocket connection');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}
```

### Step 4: Create gateway module
Create `apps/api/src/gateway/gateway.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TradesGateway } from './trades.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [TradesGateway],
  exports: [TradesGateway],
})
export class GatewayModule {}
```

### Step 5: Register GatewayModule in app.module.ts
Add `GatewayModule` to imports.

### Step 6: Verify TypeScript compiles
```bash
cd apps/api && npx tsc --noEmit
```

### Step 7: Run lint
```bash
npm run lint -- --filter=api
```

### Step 8: Commit
```bash
git add apps/api/src/gateway/trades.gateway.ts apps/api/src/gateway/gateway.module.ts apps/api/src/app.module.ts apps/api/src/main.ts apps/api/package.json apps/api/package-lock.json
git commit -m "feat: Socket.IO realtime gateway with JWT auth (TZ-050)

- WebSocket gateway at /realtime namespace
- JWT authentication via query param
- User rooms: user:{userId}
- emitToUser and emitToAll helper methods
- Update Helmet CSP to allow ws:// connections"
```

---

## TZ-051: Redis Pub/Sub Architecture

### Goal
Enable event broadcasting via Redis pub/sub for horizontal scaling.

### Step 1: Create event publisher service
Create `apps/api/src/common/services/event-publisher.service.ts`:
```typescript
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class EventPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('EventPublisher');
  private pubClient: Redis;

  async onModuleInit() {
    this.pubClient = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
    });
    this.pubClient.on('error', (err) => {
      this.logger.error(`Redis pub error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.pubClient.quit();
  }

  async publish(channel: string, data: unknown) {
    try {
      await this.pubClient.publish(channel, JSON.stringify(data));
    } catch (error) {
      this.logger.error(`Failed to publish to ${channel}: ${(error as Error).message}`);
    }
  }
}
```

### Step 2: Create event subscriber service
Create `apps/api/src/common/services/event-subscriber.service.ts`:
```typescript
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { TradesGateway } from '../gateway/trades.gateway';

@Injectable()
export class EventSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('EventSubscriber');
  private subClient: Redis;

  constructor(private readonly gateway: TradesGateway) {}

  async onModuleInit() {
    this.subClient = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
    });

    this.subClient.on('message', (channel, message) => {
      const data = JSON.parse(message);
      this.handleEvent(channel, data);
    });

    // Subscribe to user-specific channels
    await this.subClient.subscribe('trades:*', 'jobs:*', 'analytics:*');
    this.logger.log('Redis subscriber connected');
  }

  async onModuleDestroy() {
    await this.subClient.quit();
  }

  private handleEvent(channel: string, data: unknown) {
    if (channel.startsWith('trades:')) {
      const userId = channel.split(':')[1];
      const [event, payload] = data as [string, unknown];
      this.gateway.emitToUser(userId, event, payload);
    }
  }
}
```

### Step 3: Register services in app.module.ts
Add `EventPublisherService` and `EventSubscriberService` to providers.

### Step 4: Verify TypeScript compiles
```bash
cd apps/api && npx tsc --noEmit
```

### Step 5: Run lint
```bash
npm run lint -- --filter=api
```

### Step 6: Commit
```bash
git add apps/api/src/common/services/event-publisher.service.ts apps/api/src/common/services/event-subscriber.service.ts apps/api/src/app.module.ts
git commit -m "feat: Redis pub/sub architecture for event broadcasting (TZ-051)

- EventPublisherService for publishing to Redis channels
- EventSubscriberService for subscribing and forwarding to WebSocket
- Separate ioredis instances for pub and sub (not shared with BullMQ)
- Channels: trades:{userId}, jobs:{userId}, analytics:{userId}"
```

---

## TZ-052: Live Trade Updates

### Goal
Broadcast trade CRUD events to connected clients.

### Step 1: Inject event publisher into trades service
Read `apps/api/src/trades/trades.service.ts`. Add `EventPublisherService` to constructor.

### Step 2: Emit events on trade CRUD
In `create` method, after successful insert:
```typescript
await this.eventPublisher.publish(`trades:${userId}`, ['trade:created', trade]);
```

In `update` method, after successful update:
```typescript
await this.eventPublisher.publish(`trades:${userId}`, ['trade:updated', updatedTrade]);
```

In `remove` method, after successful delete:
```typescript
await this.eventPublisher.publish(`trades:${userId}`, ['trade:deleted', { id }]);
```

### Step 3: Verify TypeScript compiles
```bash
cd apps/api && npx tsc --noEmit
```

### Step 4: Run lint
```bash
npm run lint -- --filter=api
```

### Step 5: Commit
```bash
git add apps/api/src/trades/trades.service.ts
git commit -m "feat: emit trade CRUD events via Redis pub/sub (TZ-052)

- trade:created, trade:updated, trade:deleted events
- Published to trades:{userId} channel
- Forwarded to WebSocket clients in user room"
```

---

## TZ-053: Realtime Dashboard Updates

### Goal
Live PnL updates, job progress streaming, analytics notifications on frontend.

### Step 1: Install socket.io-client in web app
```bash
cd apps/web
npm install socket.io-client
```

### Step 2: Create WebSocket client
Create `apps/web/lib/socket.ts`:
```typescript
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = getAccessToken();
    socket = io(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/realtime`, {
      query: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

### Step 3: Create useRealtime hook
Create `apps/web/hooks/use-realtime.ts`:
```typescript
import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../lib/socket';

export function useRealtime(event: string, handler: (data: unknown) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const wrappedHandler = (data: unknown) => handlerRef.current(data);

    socket.on(event, wrappedHandler);
    return () => {
      socket.off(event, wrappedHandler);
    };
  }, [event]);
}
```

### Step 4: Update dashboard page
Read `apps/web/app/page.tsx`. Add realtime subscriptions:

```typescript
'use client';

import { useRealtime } from '../hooks/use-realtime';

// In the Dashboard component:
useRealtime('trade:created', (data) => {
  // Refetch analytics and trades
  refetch();
});

useRealtime('trade:updated', (data) => {
  refetch();
});

useRealtime('trade:deleted', (data) => {
  refetch();
});
```

### Step 5: Update trades page
Read `apps/web/app/trades/page.tsx`. Add realtime subscriptions:

```typescript
useRealtime('trade:created', (data) => {
  fetchTrades(); // Refetch trade list
});

useRealtime('trade:updated', (data) => {
  fetchTrades();
});

useRealtime('trade:deleted', (data) => {
  fetchTrades();
});
```

### Step 6: Emit job progress events
In `apps/api/src/queues/csv-import.processor.ts`, after progress update:
```typescript
await this.eventPublisher.publish(`jobs:${userId}`, ['job:progress', { jobId: job.id, progress }]);
```

In `apps/api/src/queues/ai-processing.processor.ts`, same pattern.

### Step 7: Verify TypeScript compiles
```bash
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
```

### Step 8: Run lint
```bash
npm run lint
```

### Step 9: Commit
```bash
git add apps/web/lib/socket.ts apps/web/hooks/use-realtime.ts apps/web/app/page.tsx apps/web/app/trades/page.tsx apps/web/package.json apps/web/package-lock.json apps/api/src/queues/csv-import.processor.ts apps/api/src/queues/ai-processing.processor.ts
git commit -m "feat: realtime dashboard updates with WebSocket client (TZ-053)

- Socket.IO client with JWT auth via query param
- useRealtime hook for React event subscriptions
- Dashboard auto-refreshes on trade events
- Trades page auto-refreshes on trade events
- Job progress events published via Redis
- Reconnection with exponential backoff"
```

---

## Execution Order

```
TZ-050 (Socket.IO gateway) ──→ TZ-051 (Redis pub/sub)
                                    │
                                    ├──→ TZ-052 (live trade updates)
                                    └──→ TZ-053 (dashboard + job progress)
```

## Verification Checklist

- [ ] WebSocket gateway accepts connections with valid JWT
- [ ] WebSocket gateway rejects connections without JWT
- [ ] User connected to `user:{userId}` room
- [ ] Trade create/update/delete emits events to connected client
- [ ] Redis pub/sub forwards events to WebSocket
- [ ] Frontend receives `trade:created` event and refetches
- [ ] Job progress events stream to frontend
- [ ] Helmet CSP allows `ws://` connections
- [ ] TypeScript compiles with zero errors
- [ ] npm run lint passes

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| WebSocket auth token exposed in URL | Token is short-lived (15 min), HTTPS in production |
| Redis connection fails | Graceful degradation: direct WebSocket emit without pub/sub |
| Too many connections | Socket.IO has built-in connection limits, rate limiting via existing ThrottlerGuard |
| Memory leaks from subscriptions | Cleanup in `onModuleDestroy` and React `useEffect` cleanup |
| CORS issues | Matching CORS config between HTTP and WebSocket |
