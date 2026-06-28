import { Injectable, Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { aiInsights, trades } from '@tradezen/db';
import { eq, desc } from 'drizzle-orm';
import { TradesService } from '../trades/trades.service';
import { BehavioralService } from '../analytics/behavioral.service';

export interface InsightCard {
  id: string;
  category: 'performance' | 'discipline' | 'risk' | 'consistency';
  title: string;
  message: string;
  metrics: Record<string, unknown>;
  createdAt: string;
}

export interface InsightsResponse {
  insights: InsightCard[];
  generatedAt: string;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger('AiInsightsService');

  constructor(
    private readonly tradesService: TradesService,
    private readonly behavioralService: BehavioralService,
  ) {}

  async getInsights(userId: string): Promise<InsightsResponse> {
    const cached = await this.getCached(userId);
    if (cached) return cached;

    const cards = await this.generateInsights(userId);
    await this.storeInsights(userId, cards);
    return { insights: cards, generatedAt: new Date().toISOString() };
  }

  private async getCached(userId: string): Promise<InsightsResponse | null> {
    const rows = await db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.userId, userId))
      .orderBy(desc(aiInsights.createdAt))
      .limit(3);

    if (rows.length === 0) return null;

    const newest = new Date(rows[0].createdAt ?? 0).getTime();
    if (Date.now() - newest < CACHE_TTL_MS) {
      const insightTypeCounts: Record<string, number> = {};
      for (const r of rows) {
        insightTypeCounts[r.insightType] =
          (insightTypeCounts[r.insightType] ?? 0) + 1;
      }
      const topType = Object.entries(insightTypeCounts).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0];
      const metrics = (rows[0].metadata ?? {}) as Record<string, unknown>;

      const cards: InsightCard[] = rows.map((r) => ({
        id: r.id,
        category: (r.insightType as InsightCard['category']) || 'performance',
        title: '',
        message: r.content,
        metrics: (r.metadata ?? {}) as Record<string, unknown>,
        createdAt: (r.createdAt ?? new Date()).toISOString(),
      }));

      const generatedAt = rows.reduce(
        (latest, r) => Math.max(latest, new Date(r.createdAt ?? 0).getTime()),
        0,
      );

      return {
        insights: cards,
        generatedAt: new Date(generatedAt).toISOString(),
      };
    }

    return null;
  }

  private async generateInsights(userId: string): Promise<InsightCard[]> {
    const [analytics, advanced, behavioral] = await Promise.all([
      this.tradesService.getAnalytics(userId),
      this.tradesService.getAdvancedAnalytics(userId),
      this.behavioralService.analyzeBehavior(userId),
    ]);

    const totalTrades = (analytics as any).totalTrades ?? 0;
    if (totalTrades < 5) return [];

    const candidates: Array<{ card: InsightCard; priority: number }> = [];

    // ── Risk priority (highest) ──
    const avgRR = (analytics as any).avgRR ?? 0;
    if (avgRR > 0 && avgRR < 1.5) {
      candidates.push({
        priority: 1,
        card: {
          id: '',
          category: 'risk',
          title: 'Reward-to-Risk',
          message: `Your average risk-to-reward ratio is ${avgRR.toFixed(1)}R. Improving reward targets to at least 1.5R could significantly increase profitability.`,
          metrics: { avgRR, threshold: 1.5 },
          createdAt: '',
        },
      });
    }

    const worstTrade = Math.abs((analytics as any).worstTrade ?? 0);
    const bestTrade = (analytics as any).bestTrade ?? 0;
    if (worstTrade > 0 && bestTrade > 0 && worstTrade > bestTrade) {
      candidates.push({
        priority: 2,
        card: {
          id: '',
          category: 'risk',
          title: 'Risk Asymmetry',
          message: `Your largest loss (-$${worstTrade}) exceeds your largest win (+$${bestTrade}). Consider tightening stop losses to improve risk symmetry.`,
          metrics: { largestLoss: worstTrade, largestWin: bestTrade },
          createdAt: '',
        },
      });
    }

    // ── Discipline priority ──
    const fomoRate = (analytics as any).behavioralStats?.fomoCount
      ? (analytics as any).behavioralStats.fomoCount / totalTrades
      : 0;
    const vengeanceRate = (analytics as any).behavioralStats?.vengeanceCount
      ? (analytics as any).behavioralStats.vengeanceCount / totalTrades
      : 0;

    if (fomoRate > 0.2) {
      candidates.push({
        priority: 3,
        card: {
          id: '',
          category: 'discipline',
          title: 'FOMO Entries',
          message: `${(fomoRate * 100).toFixed(0)}% of your trades are flagged as FOMO entries. Emotional entries typically have lower win rates — try using your pre-trade checklist before every entry.`,
          metrics: { fomoRate: Math.round(fomoRate * 100), totalTrades },
          createdAt: '',
        },
      });
    }

    if (vengeanceRate > 0.1) {
      candidates.push({
        priority: 4,
        card: {
          id: '',
          category: 'discipline',
          title: 'Revenge Trading',
          message: `${(vengeanceRate * 100).toFixed(0)}% of your trades are revenge trades after a loss. Taking a 15-minute break after a loss can reduce revenge trading by up to 60%.`,
          metrics: {
            vengeanceRate: Math.round(vengeanceRate * 100),
            totalTrades,
          },
          createdAt: '',
        },
      });
    }

    const trendAlignedCount =
      (analytics as any).behavioralStats?.trendAlignedCount ?? 0;
    const trendRate = totalTrades > 0 ? trendAlignedCount / totalTrades : 0;
    if (trendAlignedCount >= 5) {
      candidates.push({
        priority: 5,
        card: {
          id: '',
          category: 'discipline',
          title: 'Trend Alignment',
          message: `${(trendRate * 100).toFixed(0)}% of your trades are trend-aligned. Traders with >70% trend alignment typically see 15-20% higher win rates.`,
          metrics: {
            trendAlignmentRate: Math.round(trendRate * 100),
            trendAlignedCount,
          },
          createdAt: '',
        },
      });
    }

    // ── Performance priority ──
    const byStrategy = (analytics as any).byStrategy ?? [];
    const validStrategies = byStrategy.filter((s: any) => s.trades >= 5);
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
          category: 'performance',
          title: 'Best Strategy',
          message: `${best.name} is your best-performing strategy with ${best.trades} trades and a ${wr}% win rate (${best.pnl > 0 ? '+' : ''}$${Number(best.pnl).toFixed(0)} P&L).`,
          metrics: {
            strategy: best.name,
            trades: best.trades,
            winRate: wr,
            pnl: Number(best.pnl),
          },
          createdAt: '',
        },
      });
    }

    const sessions = behavioral.timePatterns?.bySession ?? [];
    if (sessions.length >= 2) {
      sessions.sort((a: any, b: any) => b.trades - a.trades);
      const top = sessions[0];
      const bottom = sessions[sessions.length - 1];
      if (top.trades >= 5 && bottom.trades >= 3) {
        const topWr = top.winRate ?? 0;
        const bottomWr = bottom.winRate ?? 0;
        const gap = topWr - bottomWr;
        if (gap > 15) {
          candidates.push({
            priority: 7,
            card: {
              id: '',
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
              createdAt: '',
            },
          });
        }
      }
    }

    // ── Consistency priority ──
    const streak = (advanced as any).currentStreak;
    if (streak && streak.type === 'win' && streak.count >= 5) {
      candidates.push({
        priority: 8,
        card: {
          id: '',
          category: 'consistency',
          title: 'Winning Streak',
          message: `You're on a ${streak.count}-trade winning streak. Momentum is real, but maintain discipline — avoid increasing position sizes during streaks.`,
          metrics: { streakCount: streak.count, streakType: streak.type },
          createdAt: '',
        },
      });
    }

    if (streak && streak.type === 'loss' && streak.count >= 4) {
      candidates.push({
        priority: 1,
        card: {
          id: '',
          category: 'consistency',
          title: 'Losing Streak',
          message: `You're on a ${streak.count}-trade losing streak. Consider taking a break and reviewing your last ${streak.count} trades for common patterns before entering another position.`,
          metrics: { streakCount: streak.count, streakType: streak.type },
          createdAt: '',
        },
      });
    }

    const bestDay = (analytics as any).byDayOfWeek
      ?.slice()
      ?.sort((a: any, b: any) => b.pnl - a.pnl)[0];
    if (bestDay && bestDay.trades >= 5) {
      const worstDay = (analytics as any).byDayOfWeek
        ?.slice()
        ?.sort((a: any, b: any) => a.pnl - b.pnl)[0];
      candidates.push({
        priority: 9,
        card: {
          id: '',
          category: 'consistency',
          title: 'Best Trading Day',
          message: `${bestDay.day} is your most profitable day (${bestDay.trades} trades, ${(bestDay.winRate * 100).toFixed(0)}% WR, +$${Number(bestDay.pnl).toFixed(0)}).${worstDay && worstDay.day !== bestDay.day ? ` ${worstDay.day} is your weakest (${worstDay.trades} trades, ${(worstDay.winRate * 100).toFixed(0)}% WR).` : ''}`,
          metrics: {
            bestDay: bestDay.day,
            bestDayWR: Math.round(bestDay.winRate * 100),
            bestDayPnl: Number(bestDay.pnl),
            bestDayTrades: bestDay.trades,
          },
          createdAt: '',
        },
      });
    }

    // Pick top 3 by priority (lower number = higher priority)
    candidates.sort((a, b) => a.priority - b.priority);
    const selected = candidates.slice(0, 3);

    // Deduplicate by category — don't show 2 discipline cards
    const seenCategories = new Set<string>();
    const deduped: typeof selected = [];
    for (const c of selected) {
      const cat = c.card.category;
      if (seenCategories.has(cat) && cat !== 'risk') continue;
      seenCategories.add(cat);
      deduped.push(c);
    }

    return deduped.slice(0, 3).map((c) => c.card);
  }

  private async storeInsights(
    userId: string,
    cards: InsightCard[],
  ): Promise<void> {
    for (const card of cards) {
      await db.insert(aiInsights).values({
        userId,
        insightType: card.category,
        content: card.message,
        metadata: card.metrics,
      });
    }
  }
}
