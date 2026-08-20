import type { InsightContext } from '../insight-context';
import type { InsightCandidate, InsightSource } from '../insight-source';
import { RULE_IDS } from '../rule-ids';
import {
  FOMO_RATE_THRESHOLD,
  VENGEANCE_RATE_THRESHOLD,
  TREND_ALIGNED_MIN,
} from '../thresholds';

export const disciplineRules: InsightSource = {
  generate(ctx: InsightContext): InsightCandidate[] {
    const analytics = ctx.analytics;
    const totalTrades = analytics.totalTrades ?? 0;
    const candidates: InsightCandidate[] = [];

    const fomoRate = analytics.behavioralStats?.fomoCount
      ? analytics.behavioralStats.fomoCount / totalTrades
      : 0;
    if (fomoRate > FOMO_RATE_THRESHOLD) {
      candidates.push({
        priority: 3,
        card: {
          id: '',
          ruleId: RULE_IDS.DISCIPLINE_FOMO,
          category: 'discipline',
          title: 'FOMO Entries',
          message: `${(fomoRate * 100).toFixed(0)}% of your trades are flagged as FOMO entries. Emotional entries typically have lower win rates — try using your pre-trade checklist before every entry.`,
          metrics: { fomoRate: Math.round(fomoRate * 100), totalTrades },
          pushable: true,
          source: 'analytics',
          createdAt: '',
        },
      });
    }

    const vengeanceRate = analytics.behavioralStats?.vengeanceCount
      ? analytics.behavioralStats.vengeanceCount / totalTrades
      : 0;
    if (vengeanceRate > VENGEANCE_RATE_THRESHOLD) {
      candidates.push({
        priority: 4,
        card: {
          id: '',
          ruleId: RULE_IDS.DISCIPLINE_REVENGE,
          category: 'discipline',
          title: 'Revenge Trading',
          message: `${(vengeanceRate * 100).toFixed(0)}% of your trades are revenge trades after a loss. Taking a 15-minute break after a loss can reduce revenge trading by up to 60%.`,
          metrics: {
            vengeanceRate: Math.round(vengeanceRate * 100),
            totalTrades,
          },
          pushable: true,
          source: 'analytics',
          createdAt: '',
        },
      });
    }

    const trendAlignedCount = analytics.behavioralStats?.trendAlignedCount ?? 0;
    const trendRate = totalTrades > 0 ? trendAlignedCount / totalTrades : 0;
    if (trendAlignedCount >= TREND_ALIGNED_MIN) {
      candidates.push({
        priority: 5,
        card: {
          id: '',
          ruleId: RULE_IDS.DISCIPLINE_TREND,
          category: 'discipline',
          title: 'Trend Alignment',
          message: `${(trendRate * 100).toFixed(0)}% of your trades are trend-aligned. Traders with >70% trend alignment typically see 15-20% higher win rates.`,
          metrics: {
            trendAlignmentRate: Math.round(trendRate * 100),
            trendAlignedCount,
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
