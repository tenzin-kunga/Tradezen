jest.mock('@langchain/langgraph', () => {
  const Annotation = Object.assign(() => ({}), { Root: () => () => ({}) });
  return {
    Annotation,
    StateGraph: jest.fn(() => ({
      addNode: jest.fn().mockReturnThis(),
      addEdge: jest.fn().mockReturnThis(),
      compile: jest.fn(),
    })),
    END: 'END',
  };
});
jest.mock('@langchain/core/messages', () => ({
  HumanMessage: class {},
  SystemMessage: class {},
}));
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import passport from 'passport';
import request from 'supertest';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatThreadService } from './chat-thread.service';
import { JournalIntelligenceService } from '../ai/journal-intelligence.service';
import { CoachingEngineService } from '../ai/coaching-engine.service';
import { NotificationService } from '../common/services/notification.service';
import { ContextBuilderService } from '../ai/context/context-builder.service';
import { SemanticMetricsService } from '../ai/context/semantic/semantic-metrics.service';
import { JobStatusService } from '../queues/job-status.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const UUID = '11111111-1111-1111-1111-111111111111';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('ChatController routes', () => {
  let app: INestApplication;

  const searchThreads = jest
    .fn()
    .mockResolvedValue([{ id: 't1', title: 'Tesla' }]);
  const getThread = jest
    .fn()
    .mockImplementation((_userId: string, id: string) => {
      if (!UUID_RE.test(id)) {
        return Promise.reject(new NotFoundException('Thread not found'));
      }
      return Promise.resolve({ id, title: 'My Thread' });
    });
  const getMessages = jest.fn().mockResolvedValue([]);

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: {} },
        {
          provide: ChatThreadService,
          useValue: { searchThreads, getThread, getMessages },
        },
        { provide: JournalIntelligenceService, useValue: {} },
        { provide: CoachingEngineService, useValue: {} },
        { provide: NotificationService, useValue: {} },
        { provide: ContextBuilderService, useValue: {} },
        { provide: SemanticMetricsService, useValue: {} },
        { provide: getQueueToken('ai-processing'), useValue: {} },
        { provide: JobStatusService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /chat/threads/search routes to searchThreads, not :id', async () => {
    const res = await request(app.getHttpServer())
      .get('/chat/threads/search')
      .query({ q: 'tesla' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 't1', title: 'Tesla' }]);
    expect(searchThreads).toHaveBeenCalled();
    expect(getThread).not.toHaveBeenCalled();
  });

  it('GET /chat/threads/:id still routes to getThread for a UUID', async () => {
    const res = await request(app.getHttpServer()).get(`/chat/threads/${UUID}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: UUID, title: 'My Thread' });
    expect(getThread.mock.calls[0]?.[1]).toBe(UUID);
  });

  it('GET /chat/threads/:id returns 404 for unknown IDs', async () => {
    const res = await request(app.getHttpServer()).get(
      '/chat/threads/not-a-thread',
    );

    expect(res.status).toBe(404);
  });

  it('GET /chat/threads/:id/messages still works without an explicit guard', async () => {
    const res = await request(app.getHttpServer()).get(
      `/chat/threads/${UUID}/messages`,
    );

    expect(res.status).toBe(200);
    expect(getMessages.mock.calls[0]?.[0]).toBe(UUID);
  });
});

describe('ChatController provider auth', () => {
  let app: INestApplication;

  class MockJwtStrategy {
    name = 'jwt';
    authenticate(req: any) {
      const auth = req.headers?.authorization ?? '';
      if (auth === 'Bearer valid-token') {
        (this as any).success({ id: 'u1' });
      } else {
        (this as any).fail('Unauthorized', 401);
      }
    }
  }

  const chatService = {
    getProviderHealth: jest
      .fn()
      .mockResolvedValue([{ id: 'ollama', status: 'healthy' }]),
    refreshModels: jest
      .fn()
      .mockResolvedValue({ status: 'ok', providers: ['ollama'] }),
    addProvider: jest
      .fn()
      .mockResolvedValue({ id: 'openai', models: ['gpt-4o'] }),
    removeProvider: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    passport.use('jwt', new MockJwtStrategy());

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: chatService },
        { provide: ChatThreadService, useValue: {} },
        { provide: JournalIntelligenceService, useValue: {} },
        { provide: CoachingEngineService, useValue: {} },
        { provide: NotificationService, useValue: {} },
        { provide: ContextBuilderService, useValue: {} },
        { provide: SemanticMetricsService, useValue: {} },
        { provide: getQueueToken('ai-processing'), useValue: {} },
        { provide: JobStatusService, useValue: {} },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /chat/models/providers is public (no token → 200)', async () => {
    const res = await request(app.getHttpServer()).get(
      '/chat/models/providers',
    );

    expect(res.status).toBe(200);
  });

  it('POST /chat/models/refresh requires auth', async () => {
    const noToken = await request(app.getHttpServer()).post(
      '/chat/models/refresh',
    );
    expect(noToken.status).toBe(401);

    const withToken = await request(app.getHttpServer())
      .post('/chat/models/refresh')
      .set('Authorization', 'Bearer valid-token');
    expect(withToken.status).toBe(201);
  });

  it('POST /chat/models/providers requires auth', async () => {
    const noToken = await request(app.getHttpServer())
      .post('/chat/models/providers')
      .send({ name: 'openai', baseUrl: 'https://api.openai.com/v1' });
    expect(noToken.status).toBe(401);

    const withToken = await request(app.getHttpServer())
      .post('/chat/models/providers')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'openai', baseUrl: 'https://api.openai.com/v1' });
    expect(withToken.status).toBe(201);
  });

  it('DELETE /chat/models/providers/:id requires auth', async () => {
    const noToken = await request(app.getHttpServer()).delete(
      '/chat/models/providers/openai',
    );
    expect(noToken.status).toBe(401);

    const withToken = await request(app.getHttpServer())
      .delete('/chat/models/providers/openai')
      .set('Authorization', 'Bearer valid-token');
    expect(withToken.status).toBe(200);
  });
});

describe('ChatController stream usage event', () => {
  let app: INestApplication;

  class MockJwtStrategy {
    name = 'jwt';
    authenticate(req: any) {
      const auth = req.headers?.authorization ?? '';
      if (auth === 'Bearer valid-token') {
        (this as any).success({ id: 'u1' });
      } else {
        (this as any).fail('Unauthorized', 401);
      }
    }
  }

  const streamChat = jest.fn(
    async (
      _userId: string,
      _dto: any,
      _signal: AbortSignal | undefined,
      handlers: any,
    ) => {
      handlers.onToken('hello');
      handlers.onUsage({ promptTokens: 10, completionTokens: 5 });
      handlers.onDone();
    },
  );

  beforeEach(async () => {
    jest.clearAllMocks();
    passport.use('jwt', new MockJwtStrategy());

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: {
            streamChat,
          },
        },
        { provide: ChatThreadService, useValue: {} },
        { provide: JournalIntelligenceService, useValue: {} },
        { provide: CoachingEngineService, useValue: {} },
        { provide: NotificationService, useValue: {} },
        { provide: ContextBuilderService, useValue: {} },
        { provide: SemanticMetricsService, useValue: {} },
        { provide: getQueueToken('ai-processing'), useValue: {} },
        { provide: JobStatusService, useValue: {} },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /chat/stream emits a usage event after tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/chat/stream')
      .set('Authorization', 'Bearer valid-token')
      .send({ messages: [{ role: 'user', content: 'hi' }], model: 'm' });

    expect(res.status).toBe(201);
    expect(res.text).toContain('event: token');
    expect(res.text).toContain('event: usage');
    expect(res.text).toContain(
      'data: {"promptTokens":10,"completionTokens":5}',
    );
    expect(res.text).toContain('event: done');
  });
});
