import type { InsightContext } from '../insight-context';
import type { InsightCandidate, InsightSource } from '../insight-source';
import { RULE_IDS } from '../rule-ids';
import { WIN_STREAK_MIN, LOSS_STREAK_MIN } from '../thresholds';

export const consistencyRules: InsightSource = {
  generate(ctx: InsightContext): InsightCandidate[] {
    const advanced = ctx.advanced;
    const candidates: InsightCandidate[] = [];

    const streak = advanced?.currentStreak;
    if (streak && streak.type === 'win' && streak.count >= WIN_STREAK_MIN) {
      candidates.push({
        priority: 8,
        card: {
          id: '',
          ruleId: RULE_IDS.CONSISTENCY_WINNING_STREAK,
          category: 'consistency',
          title: 'Winning Streak',
          message: `You're on a ${streak.count}-trade winning streak. Momentum is real, but maintain discipline — avoid increasing position sizes during streaks.`,
          metrics: { streakCount: streak.count, streakType: streak.type },
          pushable: false,
          source: 'analytics',
          createdAt: '',
        },
      });
    }

    if (streak && streak.type === 'loss' && streak.count >= LOSS_STREAK_MIN) {
      candidates.push({
        priority: 1,
        card: {
          id: '',
          ruleId: RULE_IDS.CONSISTENCY_LOSING_STREAK,
          category: 'consistency',
          title: 'Losing Streak',
          message: `You're on a ${streak.count}-trade losing streak. Consider taking a break and reviewing your last ${streak.count} trades for common patterns before entering another position.`,
          metrics: { streakCount: streak.count, streakType: streak.type },
          pushable: true,
          source: 'analytics',
          createdAt: '',
        },
      });
    }

    return candidates;
  },
};
