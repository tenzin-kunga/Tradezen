import { AiInsightsService } from '../ai-insights.service';
import { buildInsightContext } from './insight-context';
import { CoachingPushPolicy } from './push-policy';
import { db } from '../../db/drizzle';
import type { InsightContext } from './insight-context';
import {
  CONCENTRATION_PCT,
  MIN_SYMBOL_TRADES,
  MIN_DIRECTION_TRADES,
} from './thresholds';

jest.mock('../../db/drizzle', () => {
  const db = { select: jest.fn(), insert: jest.fn() };
  return { db };
});

jest.mock('./insight-context', () => ({
  buildInsightContext: jest.fn(),
}));

function selectChain(rows: any[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue(rows),
  };
}

function makeCtx(overrides: Record<string, any> = {}): InsightContext {
  return {
    analytics: { totalTrades: 50, avgRR: 1.0 },
    advanced: { currentStreak: { type: 'none', count: 0 } },
    behavior: { timePatterns: { bySession: [] } },
    portfolio: {
      summary: { totalTrades: 50 },
      symbols: [],
      strategies: [],
      byDirection: { long: 25, short: 25 },
    },
    directionalExpectancy: { long: 0, short: 0, longTrades: 0, shortTrades: 0 },
    ...overrides,
  } as unknown as InsightContext;
}

describe('AiInsightsService', () => {
  let service: AiInsightsService;
  let tradesService: any;
  let behavioralService: any;
  let portfolioService: any;
  let aiClient: any;
  let pushPolicy: CoachingPushPolicy;

  beforeEach(() => {
    jest.clearAllMocks();
    (db as any).select.mockReturnValue(selectChain([]));
    (db as any).insert.mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    });

    tradesService = {
      getAnalytics: jest.fn(),
      getAdvancedAnalytics: jest.fn(),
    };
    behavioralService = { analyzeBehavior: jest.fn() };
    portfolioService = { getPortfolio: jest.fn() };
    aiClient = {
      complete: jest.fn().mockResolvedValue({
        content: 'Narrative text',
        model: 'm',
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    };
    pushPolicy = new CoachingPushPolicy();

    service = new AiInsightsService(
      tradesService,
      behavioralService,
      portfolioService,
      aiClient,
      pushPolicy,
    );
  });

  it('returns cached insights without rebuilding context', async () => {
    const cachedRows = [
      {
        id: '1',
        insightType: 'risk',
        content: 'r',
        metadata: {},
        createdAt: new Date(),
      },
      {
        id: '2',
        insightType: 'portfolio_narrative',
        content: 'cached narrative',
        metadata: {},
        createdAt: new Date(),
      },
    ];
    (db as any).select.mockReturnValue(selectChain(cachedRows));

    const result = await service.getInsights('u');

    expect(buildInsightContext).not.toHaveBeenCalled();
    expect(result.insights).toHaveLength(1);
    expect(result.narrative).toBe('cached narrative');
  });

  it('generates, stores, and returns insights + narrative on a cache miss', async () => {
    (buildInsightContext as jest.Mock).mockResolvedValue(
      makeCtx({
        portfolio: {
          summary: { totalTrades: 50 },
          symbols: [
            {
              symbol: 'AAPL',
              trades: 30,
              realizedPnl: 500,
              winRate: 60,
              avgPnl: 16,
              longs: 20,
              shorts: 10,
              allocationPct: CONCENTRATION_PCT + 10,
            },
          ],
          strategies: [],
          byDirection: { long: 25, short: 25 },
        },
        directionalExpectancy: {
          long: 1.2,
          short: -0.8,
          longTrades: MIN_DIRECTION_TRADES + 5,
          shortTrades: MIN_DIRECTION_TRADES + 5,
        },
      }),
    );

    const result = await service.getInsights('u');

    expect(buildInsightContext).toHaveBeenCalledTimes(1);
    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.narrative).toBe('Narrative text');
    // cards + narrative row
    expect((db as any).insert.mock.calls.length).toBeGreaterThanOrEqual(
      result.insights.length,
    );
  });

  it('returns cards even when narrative generation fails', async () => {
    aiClient.complete.mockRejectedValue(new Error('llm down'));
    (buildInsightContext as jest.Mock).mockResolvedValue(
      makeCtx({
        portfolio: {
          summary: { totalTrades: 50 },
          symbols: [
            {
              symbol: 'AAPL',
              trades: 30,
              realizedPnl: 500,
              winRate: 60,
              avgPnl: 16,
              longs: 20,
              shorts: 10,
              allocationPct: CONCENTRATION_PCT + 10,
            },
          ],
          strategies: [],
          byDirection: { long: 25, short: 25 },
        },
      }),
    );

    const result = await service.getInsights('u');

    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.narrative).toBeUndefined();
  });

  it('returns empty insights and does not store when under the trade minimum', async () => {
    (buildInsightContext as jest.Mock).mockResolvedValue(
      makeCtx({ analytics: { totalTrades: 3, avgRR: 0 } }),
    );

    const result = await service.getInsights('u');

    expect(result.insights).toHaveLength(0);
    expect((db as any).insert).not.toHaveBeenCalled();
  });

  it('selects top 3 and caps risk at 2 cards', async () => {
    (buildInsightContext as jest.Mock).mockResolvedValue(
      makeCtx({
        analytics: { totalTrades: 50, avgRR: 1.0 },
        portfolio: {
          summary: { totalTrades: 50 },
          symbols: [
            {
              symbol: 'AAPL',
              trades: 30,
              realizedPnl: 500,
              winRate: 60,
              avgPnl: 16,
              longs: 20,
              shorts: 10,
              allocationPct: CONCENTRATION_PCT + 10,
            },
            {
              symbol: 'TSLA',
              trades: MIN_SYMBOL_TRADES + 5,
              realizedPnl: -200,
              winRate: 30,
              avgPnl: -20,
              longs: 5,
              shorts: 5,
              allocationPct: 5,
            },
          ],
          strategies: [],
          byDirection: { long: 25, short: 25 },
        },
        directionalExpectancy: {
          long: 1.2,
          short: -0.8,
          longTrades: MIN_DIRECTION_TRADES + 5,
          shortTrades: MIN_DIRECTION_TRADES + 5,
        },
      }),
    );

    const result = await service.getInsights('u');

    expect(result.insights).toHaveLength(3);
    const riskCount = result.insights.filter(
      (i) => i.category === 'risk',
    ).length;
    expect(riskCount).toBeLessThanOrEqual(2);
  });

  function pushableCtx() {
    return makeCtx({
      analytics: { totalTrades: 50, avgRR: 2.0 },
      portfolio: {
        summary: { totalTrades: 50 },
        symbols: [
          {
            symbol: 'AAPL',
            trades: 30,
            realizedPnl: 500,
            winRate: 60,
            avgPnl: 16,
            longs: 20,
            shorts: 10,
            allocationPct: CONCENTRATION_PCT + 10,
          },
        ],
        strategies: [],
        byDirection: { long: 25, short: 25 },
      },
    });
  }

  it('getCoachingPush returns the highest-priority pushable candidate', async () => {
    (buildInsightContext as jest.Mock).mockResolvedValue(pushableCtx());

    const push = await service.getCoachingPush('u');

    expect(push).not.toBeNull();
    expect(push!.ruleId).toBe('portfolio.concentration:AAPL');
    // records a coaching_push dedupe row
    expect((db as any).insert).toHaveBeenCalled();
  });

  it('getCoachingPush returns null when only non-pushable candidates exist', async () => {
    // Best strategy / session / best day are non-pushable (positive signals).
    (buildInsightContext as jest.Mock).mockResolvedValue(
      makeCtx({
        analytics: { totalTrades: 50, avgRR: 2.0 },
        behavior: {
          timePatterns: {
            bySession: [
              { session: 'morning', trades: 10, winRate: 0.9 },
              { session: 'evening', trades: 5, winRate: 0.5 },
            ],
          },
        },
        portfolio: {
          summary: { totalTrades: 50 },
          symbols: [],
          strategies: [],
          byDirection: { long: 25, short: 25 },
        },
        directionalExpectancy: {
          long: 0,
          short: 0,
          longTrades: 0,
          shortTrades: 0,
        },
      }),
    );

    const push = await service.getCoachingPush('u');

    expect(push).toBeNull();
  });

  it('getCoachingPush reuses the in-memory candidate cache (no rebuild)', async () => {
    (buildInsightContext as jest.Mock).mockResolvedValue(pushableCtx());

    await service.getCoachingPush('u');
    await service.getCoachingPush('u');

    expect(buildInsightContext).toHaveBeenCalledTimes(1);
  });
});
