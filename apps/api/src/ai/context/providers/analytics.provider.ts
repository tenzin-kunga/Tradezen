import { Injectable } from '@nestjs/common';
import { db } from '../../../db/drizzle';
import { sql } from 'drizzle-orm';
import type {
  ContextProvider,
  ContextRequest,
  ContextBlock,
  ProviderCapability,
  ScoringRule,
  ProviderScore,
} from '../context-provider';

@Injectable()
export class AnalyticsProvider implements ContextProvider {
  id = 'analytics';
  priority = 20;
  timeoutMs = 150;
  cacheMs = 60_000;

  capabilities(): ProviderCapability[] {
    return [
      {
        id: 'analytics',
        description: 'Trade analytics and patterns',
        patterns: ['analytics', 'review'],
      },
    ];
  }

  scoringRules(): ScoringRule[] {
    return [
      {
        id: 'performance',
        weight: 0.4,
        predicate: (msg) =>
          /performance|stats|summary|overview|analytics/i.test(msg),
      },
      {
        id: 'win_rate',
        weight: 0.3,
        predicate: (msg) => /win rate|profit factor|accuracy/i.test(msg),
      },
      {
        id: 'behavior',
        weight: 0.3,
        predicate: (msg) =>
          /fomo|revenge|discipline|pattern|behavior/i.test(msg),
      },
    ];
  }

  score(_request: ContextRequest, lastUserMessage?: string): ProviderScore {
    const msg = lastUserMessage ?? '';
    let total = 0;
    const reasons: string[] = [];
    for (const rule of this.scoringRules()) {
      if (rule.predicate(msg)) {
        total += rule.weight;
        reasons.push(`${rule.id}: +${rule.weight}`);
      }
    }
    return { provider: this.id, score: Math.min(total, 1), reasons };
  }

  dataCompleteness(block: ContextBlock | null, _: ContextRequest): number {
    if (!block) return 0;
    const hasWinRate = /Win rate:/.test(block.content);
    const hasProfitFactor = /Profit factor:/.test(block.content);
    return (hasWinRate ? 0.5 : 0) + (hasProfitFactor ? 0.5 : 0);
  }

  supports(request: ContextRequest): boolean {
    if (request.providers && !request.providers.includes('analytics'))
      return false;
    return true;
  }

  async build(userId: string, _req: ContextRequest): Promise<ContextBlock> {
    const [summary] = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE pnl > 0)::int AS wins,
        COALESCE(SUM(pnl), 0)::float8 AS pnl,
        COALESCE(SUM(pnl) FILTER (WHERE pnl > 0), 0)::float8 AS gross_profit,
        COALESCE(ABS(SUM(pnl) FILTER (WHERE pnl < 0)), 0)::float8 AS gross_loss,
        COUNT(*) FILTER (WHERE fomo_check)::int AS fomo,
        COUNT(*) FILTER (WHERE vengeance_trade)::int AS revenge,
        COUNT(*) FILTER (WHERE trend_alignment)::int AS aligned
      FROM trades WHERE user_id = ${userId}
    `);

    const s = summary ?? {};
    const total = Number(s.total ?? 0);
    const wins = Number(s.wins ?? 0);
    const grossProfit = Number(s.gross_profit ?? 0);
    const grossLoss = Number(s.gross_loss ?? 0);
    const fomo = Number(s.fomo ?? 0);
    const revenge = Number(s.revenge ?? 0);
    const aligned = Number(s.aligned ?? 0);

    const lines = [
      `Analytics Summary`,
      total > 0
        ? `Win rate: ${((wins / total) * 100).toFixed(1)}%`
        : 'No trades yet',
      total > 0
        ? `Profit factor: ${grossLoss ? (grossProfit / grossLoss).toFixed(2) : '∞'}`
        : '',
      `FOMO trades: ${fomo} | Revenge trades: ${revenge} | Trend aligned: ${aligned}`,
    ].filter(Boolean);

    return {
      source: 'analytics',
      title: 'Trade Analytics',
      priority: this.priority,
      freshness: new Date(),
      tokens: Math.ceil(lines.join(' ').split(/\s+/).length * 1.3),
      content: lines.join('\n'),
    };
  }
}
