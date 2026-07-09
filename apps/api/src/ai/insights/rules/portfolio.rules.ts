import type { InsightContext } from '../insight-context';
import type { InsightCandidate, InsightSource } from '../insight-source';
import { RULE_IDS } from '../rule-ids';
import {
  CONCENTRATION_PCT,
  MIN_SYMBOL_TRADES,
  STRATEGY_DOMINANCE_PCT,
  MIN_STRATEGY_TRADES,
  MIN_DIRECTION_TRADES,
} from '../thresholds';

function fmtMoney(n: number): string {
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${Math.abs(Number(n)).toFixed(0)}`;
}

export const portfolioRules: InsightSource = {
  generate(ctx: InsightContext): InsightCandidate[] {
    const candidates: InsightCandidate[] = [];
    const { symbols, strategies, summary } = ctx.portfolio;

    // ── Concentration risk (category: risk) ──
    // Dual signal: high allocation AND enough trades that it's meaningful.
    const topSymbol = symbols[0];
    if (
      topSymbol &&
      topSymbol.allocationPct > CONCENTRATION_PCT &&
      topSymbol.trades >= MIN_SYMBOL_TRADES
    ) {
      candidates.push({
        priority: 1,
        card: {
          id: '',
          ruleId: `${RULE_IDS.PORTFOLIO_CONCENTRATION}:${topSymbol.symbol}`,
          category: 'risk',
          title: 'Concentration Risk',
          message: `${topSymbol.allocationPct.toFixed(0)}% of your realized P&L is concentrated in ${topSymbol.symbol} across ${topSymbol.trades} trades. Diversify across more symbols to reduce single-name risk.`,
          metrics: {
            symbol: topSymbol.symbol,
            allocationPct: topSymbol.allocationPct,
            trades: topSymbol.trades,
          },
          pushable: true,
          source: 'portfolio',
          createdAt: '',
        },
      });
    }

    // ── Strategy over-reliance (category: consistency) ──
    // Dual signal: dominates trade share AND enough total trades to matter.
    const totalTrades = summary.totalTrades ?? 0;
    const topStrategy = strategies[0];
    if (
      topStrategy &&
      totalTrades >= MIN_STRATEGY_TRADES &&
      topStrategy.trades / totalTrades > STRATEGY_DOMINANCE_PCT / 100
    ) {
      const pct = Math.round((topStrategy.trades / totalTrades) * 100);
      candidates.push({
        priority: 4,
        card: {
          id: '',
          ruleId: `${RULE_IDS.PORTFOLIO_STRATEGY_RELIANCE}:${topStrategy.strategy}`,
          category: 'consistency',
          title: 'Strategy Over-Reliance',
          message: `${pct}% of your trades use ${topStrategy.strategy}. Over-reliance on one approach can hurt when that edge stalls — diversify your playbook.`,
          metrics: {
            strategy: topStrategy.strategy,
            sharePct: pct,
            trades: topStrategy.trades,
          },
          pushable: true,
          source: 'portfolio',
          createdAt: '',
        },
      });
    }

    // ── Losing symbol (category: performance) ──
    // Expectancy-based: negative realized P&L or negative avg P&L, not win rate.
    const loser = symbols.find(
      (s) =>
        s.trades >= MIN_SYMBOL_TRADES && (s.realizedPnl < 0 || s.avgPnl < 0),
    );
    if (loser) {
      const basis = loser.realizedPnl < 0 ? 'realized P&L' : 'avg P&L';
      const value = loser.realizedPnl < 0 ? loser.realizedPnl : loser.avgPnl;
      candidates.push({
        priority: 7,
        card: {
          id: '',
          ruleId: `${RULE_IDS.PORTFOLIO_LOSING_SYMBOL}:${loser.symbol}`,
          category: 'performance',
          title: 'Losing Symbol',
          message: `${loser.symbol} has ${loser.trades} trades with negative expectancy (${basis} ${fmtMoney(value)}). Review its edge or drop it from your plan.`,
          metrics: {
            symbol: loser.symbol,
            trades: loser.trades,
            realizedPnl: loser.realizedPnl,
            avgPnl: loser.avgPnl,
          },
          pushable: false,
          source: 'portfolio',
          createdAt: '',
        },
      });
    }

    // ── Directional imbalance (category: discipline) ──
    // Compare expectancy per direction, not trade count.
    const de = ctx.directionalExpectancy;
    if (
      de.longTrades >= MIN_DIRECTION_TRADES &&
      de.shortTrades >= MIN_DIRECTION_TRADES
    ) {
      const longBetter = de.long > de.short;
      const better = longBetter ? 'long' : 'short';
      const worse = longBetter ? 'short' : 'long';
      const betterExp = longBetter ? de.long : de.short;
      const worseExp = longBetter ? de.short : de.long;
      if (betterExp > 0 && worseExp < 0) {
        candidates.push({
          priority: 3,
          card: {
            id: '',
            ruleId: RULE_IDS.PORTFOLIO_DIRECTIONAL,
            category: 'discipline',
            title: 'Directional Imbalance',
            message: `Your ${worse} trades show ${worseExp.toFixed(2)}R expectancy while ${better} trades show ${betterExp.toFixed(2)}R. The imbalance is edge quality, not just trade count — check why ${worse} setups underperform.`,
            metrics: {
              longExpectancy: de.long,
              shortExpectancy: de.short,
              worseDirection: worse,
            },
            pushable: true,
            source: 'portfolio',
            createdAt: '',
          },
        });
      }
    }

    return candidates;
  },
};
