import { Injectable } from '@nestjs/common';
import { db } from '../../../db/drizzle';
import { sql } from 'drizzle-orm';
import { rowsOf } from '../../corpus-baseline.service';
import type {
  ContextProvider,
  ContextRequest,
  ContextBlock,
  ProviderCapability,
  ScoringRule,
  ProviderScore,
} from '../context-provider';

@Injectable()
export class PortfolioProvider implements ContextProvider {
  id = 'portfolio';
  priority = 50;
  timeoutMs = 150;
  cacheMs = 30_000;

  capabilities(): ProviderCapability[] {
    return [
      {
        id: 'portfolio',
        description: 'Portfolio performance snapshot',
        patterns: ['portfolio'],
      },
    ];
  }

  scoringRules(): ScoringRule[] {
    return [
      {
        id: 'portfolio',
        weight: 0.5,
        predicate: (msg) => /portfolio|allocation|exposure|position/i.test(msg),
      },
      {
        id: 'ticker',
        weight: 0.3,
        predicate: (msg) =>
          /\b[A-Z]{2,5}\b/.test(msg) && /portfolio|holding|symbol/i.test(msg),
      },
      {
        id: 'risk',
        weight: 0.2,
        predicate: (msg) => /risk|drawdown|max loss|concentration/i.test(msg),
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
    const hasSymbols = /trades\)/.test(block.content);
    const hasPnl = /Total P&L/.test(block.content);
    return (hasPnl ? 0.5 : 0) + (hasSymbols ? 0.5 : 0);
  }

  supports(request: ContextRequest): boolean {
    if (request.providers && !request.providers.includes('portfolio'))
      return false;
    if (request.portfolio === false) return false;
    return true;
  }

  async build(userId: string, _: ContextRequest): Promise<ContextBlock> {
    const [summaryRes, symbolsRes] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COALESCE(SUM(pnl), 0)::float8 AS pnl,
          COUNT(*) FILTER (WHERE pnl > 0)::int AS wins
        FROM trades WHERE user_id = ${userId}
      `),
      db.execute(sql`
        SELECT symbol, COALESCE(SUM(pnl), 0)::float8 AS pnl, COUNT(*)::int AS trades
        FROM trades WHERE user_id = ${userId}
        GROUP BY symbol ORDER BY pnl DESC LIMIT 5
      `),
    ]);

    const s = rowsOf(summaryRes)[0] ?? {};
    const total = Number(s.total ?? 0);
    const pnl = Number(s.pnl ?? 0);
    const wins = Number(s.wins ?? 0);

    const symbolLines = rowsOf(symbolsRes).map(
      (r) =>
        `- ${String(r.symbol)}: ${Number(r.pnl) >= 0 ? '+' : ''}${Number(r.pnl).toFixed(2)} (${Number(r.trades)} trades)`,
    );

    const content = [
      `Portfolio Snapshot`,
      total > 0
        ? `Total P&L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} | Win rate: ${((wins / total) * 100).toFixed(1)}%`
        : 'No trades yet',
      ...symbolLines,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      source: 'portfolio',
      title: 'Portfolio Snapshot',
      priority: this.priority,
      freshness: new Date(),
      tokens: Math.ceil(content.split(/\s+/).length * 1.3),
      content,
    };
  }
}
