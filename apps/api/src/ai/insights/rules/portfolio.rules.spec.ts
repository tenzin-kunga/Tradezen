import { portfolioRules } from './portfolio.rules';
import type { InsightContext } from '../insight-context';
import {
  CONCENTRATION_PCT,
  MIN_SYMBOL_TRADES,
  MIN_STRATEGY_TRADES,
  MIN_DIRECTION_TRADES,
} from '../thresholds';

function makeCtx(partial: Record<string, any> = {}): InsightContext {
  return {
    analytics: {},
    advanced: {},
    behavior: { timePatterns: { bySession: [] } },
    portfolio: {
      summary: { totalTrades: 20 },
      symbols: [],
      strategies: [],
      byDirection: { long: 5, short: 5 },
    },
    directionalExpectancy: { long: 0, short: 0, longTrades: 0, shortTrades: 0 },
    ...partial,
  } as unknown as InsightContext;
}

describe('portfolio.rules', () => {
  describe('concentration risk', () => {
    it('flags a symbol above the allocation threshold with enough trades', () => {
      const ctx = makeCtx({
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
          byDirection: { long: 30, short: 20 },
        },
      });

      const cards = portfolioRules.generate(ctx);
      expect(
        cards.find((c) => c.card.title === 'Concentration Risk'),
      ).toBeDefined();
    });

    it('does not flag a single high-allocation trade (sample guard)', () => {
      const ctx = makeCtx({
        portfolio: {
          summary: { totalTrades: 50 },
          symbols: [
            {
              symbol: 'AAPL',
              trades: 1,
              realizedPnl: 500,
              winRate: 100,
              avgPnl: 500,
              longs: 1,
              shorts: 0,
              allocationPct: 95,
            },
          ],
          strategies: [],
          byDirection: { long: 1, short: 0 },
        },
      });

      const cards = portfolioRules.generate(ctx);
      expect(
        cards.find((c) => c.card.title === 'Concentration Risk'),
      ).toBeUndefined();
    });

    it('does not flag below the allocation threshold', () => {
      const ctx = makeCtx({
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
              allocationPct: CONCENTRATION_PCT - 10,
            },
          ],
          strategies: [],
          byDirection: { long: 30, short: 20 },
        },
      });

      expect(
        portfolioRules
          .generate(ctx)
          .find((c) => c.card.title === 'Concentration Risk'),
      ).toBeUndefined();
    });
  });

  describe('strategy over-reliance', () => {
    it('flags a dominant strategy with enough total trades', () => {
      const ctx = makeCtx({
        portfolio: {
          summary: { totalTrades: MIN_STRATEGY_TRADES + 10 },
          symbols: [],
          strategies: [
            {
              strategy: 'Breakout',
              trades: MIN_STRATEGY_TRADES + 10,
              realizedPnl: 100,
              winRate: 55,
            },
          ],
          byDirection: { long: 10, short: 10 },
        },
      });
      const strat = (ctx as any).portfolio.strategies[0];
      strat.trades = MIN_STRATEGY_TRADES + 10;
      (ctx as any).portfolio.summary.totalTrades = MIN_STRATEGY_TRADES + 10;

      const cards = portfolioRules.generate(ctx);
      expect(
        cards.find((c) => c.card.title === 'Strategy Over-Reliance'),
      ).toBeDefined();
    });

    it('does not flag when total trades are too few', () => {
      const ctx = makeCtx({
        portfolio: {
          summary: { totalTrades: 3 },
          symbols: [],
          strategies: [
            { strategy: 'Breakout', trades: 3, realizedPnl: 100, winRate: 55 },
          ],
          byDirection: { long: 2, short: 1 },
        },
      });

      expect(
        portfolioRules
          .generate(ctx)
          .find((c) => c.card.title === 'Strategy Over-Reliance'),
      ).toBeUndefined();
    });
  });

  describe('losing symbol', () => {
    it('flags a symbol with negative expectancy', () => {
      const ctx = makeCtx({
        portfolio: {
          summary: { totalTrades: 20 },
          symbols: [
            {
              symbol: 'TSLA',
              trades: MIN_SYMBOL_TRADES + 5,
              realizedPnl: -200,
              winRate: 35,
              avgPnl: -10,
              longs: 10,
              shorts: 0,
              allocationPct: 10,
            },
          ],
          strategies: [],
          byDirection: { long: 10, short: 0 },
        },
      });

      expect(
        portfolioRules
          .generate(ctx)
          .find((c) => c.card.title === 'Losing Symbol'),
      ).toBeDefined();
    });

    it('does not flag a low-win-rate symbol with positive expectancy', () => {
      const ctx = makeCtx({
        portfolio: {
          summary: { totalTrades: 20 },
          symbols: [
            {
              symbol: 'TSLA',
              trades: MIN_SYMBOL_TRADES + 5,
              realizedPnl: 300,
              winRate: 35,
              avgPnl: 15,
              longs: 10,
              shorts: 0,
              allocationPct: 10,
            },
          ],
          strategies: [],
          byDirection: { long: 10, short: 0 },
        },
      });

      expect(
        portfolioRules
          .generate(ctx)
          .find((c) => c.card.title === 'Losing Symbol'),
      ).toBeUndefined();
    });
  });

  describe('directional imbalance', () => {
    it('flags when one direction is positive and the other negative expectancy', () => {
      const ctx = makeCtx({
        directionalExpectancy: {
          long: 1.2,
          short: -0.8,
          longTrades: MIN_DIRECTION_TRADES + 5,
          shortTrades: MIN_DIRECTION_TRADES + 5,
        },
      });

      const cards = portfolioRules.generate(ctx);
      expect(
        cards.find((c) => c.card.title === 'Directional Imbalance'),
      ).toBeDefined();
    });

    it('does not flag when both directions are profitable', () => {
      const ctx = makeCtx({
        directionalExpectancy: {
          long: 1.2,
          short: 0.5,
          longTrades: MIN_DIRECTION_TRADES + 5,
          shortTrades: MIN_DIRECTION_TRADES + 5,
        },
      });

      expect(
        portfolioRules
          .generate(ctx)
          .find((c) => c.card.title === 'Directional Imbalance'),
      ).toBeUndefined();
    });
  });

  it('maps rules to existing coaching categories, never "portfolio"', () => {
    const ctx = makeCtx({
      portfolio: {
        summary: { totalTrades: 40 },
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
        strategies: [
          { strategy: 'Breakout', trades: 40, realizedPnl: 100, winRate: 55 },
        ],
        byDirection: { long: 25, short: 15 },
      },
      directionalExpectancy: {
        long: 1.2,
        short: -0.8,
        longTrades: MIN_DIRECTION_TRADES + 5,
        shortTrades: MIN_DIRECTION_TRADES + 5,
      },
    });

    const cards = portfolioRules.generate(ctx);
    expect(cards.length).toBeGreaterThan(0);
    for (const c of cards) {
      expect(c.card.category).not.toBe('portfolio');
      expect(['performance', 'discipline', 'risk', 'consistency']).toContain(
        c.card.category,
      );
    }
  });
});
