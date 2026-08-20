import type { InsightContext } from '../insight-context';
import type { InsightCandidate, InsightSource } from '../insight-source';
import { RULE_IDS } from '../rule-ids';
import { SESSION_GAP_WR } from '../thresholds';

export const performanceRules: InsightSource = {
  generate(ctx: InsightContext): InsightCandidate[] {
    const analytics = ctx.analytics;
    const candidates: InsightCandidate[] = [];

    const byStrategy = analytics.byStrategy ?? [];
    const validStrategies = byStrategy.filter((s) => s.trades >= 5);
    if (validStrategies.length > 0) {
      const best = validStrategies[0];
      const wr =
        best.wins && best.trades
          ? Math.round((best.wins / best.trades) * 100)
          : 0;
      candidates.push({
        priority: 6,
        card: {
          id: '',
          ruleId: RULE_IDS.PERFORMANCE_BEST_STRATEGY,
          category: 'performance',
          title: 'Best Strategy',
          message: `${best.name} is your best-performing strategy with ${best.trades} trades and a ${wr}% win rate (${best.pnl > 0 ? '+' : ''}$${Number(best.pnl).toFixed(0)} P&L).`,
          metrics: {
            strategy: best.name,
            trades: best.trades,
            winRate: wr,
            pnl: Number(best.pnl),
          },
          pushable: false,
          source: 'analytics',
          createdAt: '',
        },
      });
    }

    const sessions = ctx.behavior.timePatterns?.bySession ?? [];
    if (sessions.length >= 2) {
      sessions.sort((a, b) => b.trades - a.trades);
      const top = sessions[0];
      const bottom = sessions[sessions.length - 1];
      if (top.trades >= 5 && bottom.trades >= 3) {
        const topWr = top.winRate ?? 0;
        const bottomWr = bottom.winRate ?? 0;
        const gap = topWr - bottomWr;
        if (gap > SESSION_GAP_WR) {
          candidates.push({
            priority: 7,
            card: {
              id: '',
              ruleId: RULE_IDS.PERFORMANCE_SESSION,
              category: 'performance',
              title: 'Session Performance',
              message: `Your ${top.session} sessions (${top.trades} trades, ${(topWr * 100).toFixed(0)}% WR) significantly outperform ${bottom.session} (${bottom.trades} trades, ${(bottomWr * 100).toFixed(0)}% WR). Consider focusing on your best session times.`,
              metrics: {
                bestSession: top.session,
                bestWR: Math.round(topWr * 100),
                bestTrades: top.trades,
                worstSession: bottom.session,
                worstWR: Math.round(bottomWr * 100),
              },
              pushable: false,
              source: 'analytics',
              createdAt: '',
            },
          });
        }
      }
    }

    const bestDay = analytics.byDayOfWeek
      ?.slice()
      ?.sort((a, b) => b.pnl - a.pnl)[0];
    if (bestDay && bestDay.trades >= 5) {
      const worstDay = analytics.byDayOfWeek
        ?.slice()
        ?.sort((a, b) => a.pnl - b.pnl)[0];
      candidates.push({
        priority: 9,
        card: {
          id: '',
          ruleId: RULE_IDS.PERFORMANCE_BEST_DAY,
          category: 'performance',
          title: 'Best Trading Day',
          message: `${bestDay.day} is your most profitable day (${bestDay.trades} trades, ${(bestDay.winRate * 100).toFixed(0)}% WR, +$${Number(bestDay.pnl).toFixed(0)}).${worstDay && worstDay.day !== bestDay.day ? ` ${worstDay.day} is your weakest (${worstDay.trades} trades, ${(worstDay.winRate * 100).toFixed(0)}% WR).` : ''}`,
          metrics: {
            bestDay: bestDay.day,
            bestDayWR: Math.round(bestDay.winRate * 100),
            bestDayPnl: Number(bestDay.pnl),
            bestDayTrades: bestDay.trades,
          },
          pushable: false,
          source: 'analytics',
          createdAt: '',
        },
      });
    }

    return candidates;
  },
};
