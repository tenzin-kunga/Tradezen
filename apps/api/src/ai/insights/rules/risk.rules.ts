import type { InsightContext } from '../insight-context';
import type { InsightCandidate, InsightSource } from '../insight-source';
import { RULE_IDS } from '../rule-ids';
import { REWARD_RISK_THRESHOLD } from '../thresholds';

export const riskRules: InsightSource = {
  generate(ctx: InsightContext): InsightCandidate[] {
    const analytics = ctx.analytics as any;
    const candidates: InsightCandidate[] = [];

    const avgRR = analytics.avgRR ?? 0;
    if (avgRR > 0 && avgRR < REWARD_RISK_THRESHOLD) {
      candidates.push({
        priority: 1,
        card: {
          id: '',
          ruleId: RULE_IDS.RISK_AVG_RR,
          category: 'risk',
          title: 'Reward-to-Risk',
          message: `Your average risk-to-reward ratio is ${avgRR.toFixed(1)}R. Improving reward targets to at least ${REWARD_RISK_THRESHOLD}R could significantly increase profitability.`,
          metrics: { avgRR, threshold: REWARD_RISK_THRESHOLD },
          pushable: true,
          source: 'analytics',
          createdAt: '',
        },
      });
    }

    const worstTrade = Math.abs(analytics.worstTrade ?? 0);
    const bestTrade = analytics.bestTrade ?? 0;
    if (worstTrade > 0 && bestTrade > 0 && worstTrade > bestTrade) {
      candidates.push({
        priority: 2,
        card: {
          id: '',
          ruleId: RULE_IDS.RISK_ASYMMETRY,
          category: 'risk',
          title: 'Risk Asymmetry',
          message: `Your largest loss (-$${worstTrade}) exceeds your largest win (+$${bestTrade}). Consider tightening stop losses to improve risk symmetry.`,
          metrics: { largestLoss: worstTrade, largestWin: bestTrade },
          pushable: true,
          source: 'analytics',
          createdAt: '',
        },
      });
    }

    return candidates;
  },
};
