import { Test, TestingModule } from '@nestjs/testing';
import { ContextBuilderService } from './context-builder.service';
import { TradesProvider } from './providers/trades.provider';
import { AnalyticsProvider } from './providers/analytics.provider';
import { ResearchProvider } from './providers/research.provider';
import { DocumentsProvider } from './providers/documents.provider';
import { PortfolioProvider } from './providers/portfolio.provider';
import { NewsProvider } from './providers/news.provider';
import { MemoryProvider } from './semantic/memory-provider';
import { QueryPlanner } from './query-planner';
import type { ContextRequest } from './context-provider';

jest.mock('../../db/drizzle', () => ({
  db: {
    select: jest.fn(() => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    })),
    execute: jest.fn().mockResolvedValue({ rows: [] }),
  },
}));

function makeProvider(id: string, priority: number, content: string) {
  return {
    id,
    priority,
    timeoutMs: 100,
    cacheMs: 60_000,
    capabilities: jest.fn().mockReturnValue([]),
    scoringRules: jest.fn().mockReturnValue([]),
    score: jest
      .fn()
      .mockReturnValue({ provider: id, score: 0.5, reasons: ['test'] }),
    dataCompleteness: jest.fn().mockReturnValue(0.5),
    supports: jest.fn().mockImplementation((req: ContextRequest) => {
      if (req.providers && !req.providers.includes(id)) return false;
      return true;
    }),
    build: jest.fn().mockResolvedValue({
      source: id,
      title: id,
      priority,
      freshness: new Date(),
      tokens: 20,
      content,
    }),
  };
}

describe('ContextBuilderService', () => {
  let service: ContextBuilderService;

  const providers = {
    trades: makeProvider('trades', 10, 'trades data'),
    memory: makeProvider('memory', 15, 'memory data'),
    analytics: makeProvider('analytics', 20, 'analytics data'),
    research: makeProvider('research', 30, 'research data'),
    documents: makeProvider('documents', 40, 'documents data'),
    portfolio: makeProvider('portfolio', 50, 'portfolio data'),
    news: makeProvider('news', 60, 'news data'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextBuilderService,
        { provide: TradesProvider, useValue: providers.trades },
        { provide: AnalyticsProvider, useValue: providers.analytics },
        { provide: ResearchProvider, useValue: providers.research },
        { provide: DocumentsProvider, useValue: providers.documents },
        { provide: PortfolioProvider, useValue: providers.portfolio },
        { provide: NewsProvider, useValue: providers.news },
        { provide: MemoryProvider, useValue: providers.memory },
        QueryPlanner,
      ],
    }).compile();
    service = module.get<ContextBuilderService>(ContextBuilderService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('assembles context from all providers in parallel', async () => {
    const result = await service.buildContext('u-filter');
    expect(result.blocks).toHaveLength(7);
    expect(result.metadata.providersUsed).toContain('trades');
    expect(result.metadata.providersUsed).toContain('memory');
    expect(result.metadata.providersSkipped).toHaveLength(0);
  });

  it('filters providers by request.providers', async () => {
    const result = await service.buildContext('u-filter2', {
      providers: ['trades', 'news'],
    });
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks.map((b) => b.source)).toEqual(['trades', 'news']);
  });

  it('handles provider timeout gracefully', async () => {
    providers.trades.build.mockImplementation(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 200),
        ),
    );
    providers.trades.timeoutMs = 10;

    const result = await service.buildContext('u-timeout');
    expect(result.blocks.length).toBeLessThan(7);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('respects token budget', async () => {
    providers.news.build.mockResolvedValue({
      source: 'news',
      title: 'news',
      priority: 60,
      freshness: new Date(),
      tokens: 1900,
      content: 'a'.repeat(5000),
    });

    const result = await service.buildContext('u-budget');
    expect(result.totalTokens).toBeLessThanOrEqual(2000);
  });
});

describe('buildSystemPrompt', () => {
  it('builds a prompt from BuiltContext', async () => {
    const { buildSystemPrompt } = await import('./prompt-builder');
    const result = buildSystemPrompt({
      blocks: [
        {
          source: 'trades',
          title: 'Trades',
          priority: 10,
          freshness: new Date(),
          tokens: 10,
          content: 'AAPL +5.00',
        },
      ],
      totalTokens: 10,
      warnings: [],
      metadata: {
        providersUsed: ['trades'],
        providersSkipped: [],
        latencies: {},
        retrievalTrace: undefined,
      },
    });
    expect(result.systemPrompt).toContain('CONTEXTUAL DATA');
    expect(result.systemPrompt).toContain('AAPL +5.00');
    expect(result.blockCount).toBe(1);
  });
});
