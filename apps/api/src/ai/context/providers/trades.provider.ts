import { Injectable } from '@nestjs/common';
import { db } from '../../../db/drizzle';
import { trades } from '@tradezen/db';
import { eq, desc, sql, and } from 'drizzle-orm';
import type {
  ContextProvider,
  ContextRequest,
  ContextBlock,
  ProviderCapability,
  ScoringRule,
  ProviderScore,
} from '../context-provider';

@Injectable()
export class TradesProvider implements ContextProvider {
  id = 'trades';
  priority = 10;
  timeoutMs = 100;
  cacheMs = 30_000;

  capabilities(): ProviderCapability[] {
    return [
      {
        id: 'tradeIds',
        description: 'Include specific trades',
        patterns: ['tradeIds'],
      },
      {
        id: 'review',
        description: 'Review recent trades',
        patterns: ['review'],
      },
    ];
  }

  scoringRules(): ScoringRule[] {
    return [
      {
        id: 'ticker',
        weight: 0.4,
        predicate: (msg) =>
          /\b[A-Z]{1,5}\b/.test(msg) &&
          /trade|position|entry|exit|pnl|buy|sell/i.test(msg),
      },
      {
        id: 'entry_exit',
        weight: 0.3,
        predicate: (msg) => /entry|exit|position|trade|open|close/i.test(msg),
      },
      {
        id: 'pnl',
        weight: 0.3,
        predicate: (msg) => /pnl|profit|loss|win|lose|gain/i.test(msg),
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
    // Estimate from content: more lines = more complete
    const lineCount = block.content
      .split('\n')
      .filter((l) => l.startsWith('-')).length;
    return Math.min(1, lineCount / 5);
  }

  supports(request: ContextRequest): boolean {
    if (request.providers && !request.providers.includes('trades'))
      return false;
    return true;
  }

  async build(userId: string, request: ContextRequest): Promise<ContextBlock> {
    const limit = request.limit ?? 10;

    let rows: any[];
    if (request.tradeIds && request.tradeIds.length > 0) {
      rows = await db
        .select()
        .from(trades)
        .where(
          and(
            eq(trades.userId, userId),
            sql`${trades.id} = ANY(${request.tradeIds})`,
          ),
        )
        .orderBy(desc(trades.createdAt));
    } else {
      rows = await db
        .select()
        .from(trades)
        .where(eq(trades.userId, userId))
        .orderBy(desc(trades.createdAt))
        .limit(limit);
    }

    const total = rows.length;
    const wins = rows.filter((r: any) => Number(r.pnl) > 0).length;
    const totalPnl = rows.reduce((s: number, r: any) => s + Number(r.pnl), 0);

    const lines = rows.map((r: any) => {
      const dir = r.direction === 'long' ? 'L' : 'S';
      const pnl = Number(r.pnl);
      const sign = pnl >= 0 ? '+' : '';
      return `- ${r.symbol} ${dir} entry=${r.entryPrice} exit=${r.exitPrice} pnl=${sign}${pnl.toFixed(2)}${r.strategy ? ` [${r.strategy}]` : ''}`;
    });

    const content = [
      `Recent Trades (${total})`,
      total > 0
        ? `Win rate: ${((wins / total) * 100).toFixed(1)}% | Total P&L: ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}`
        : '',
      ...lines,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      source: 'trades',
      title: `Recent Trades (${total})`,
      priority: this.priority,
      freshness: new Date(),
      tokens: Math.ceil(content.split(/\s+/).length * 1.3),
      content,
    };
  }
}
