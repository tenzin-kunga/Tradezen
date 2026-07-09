import { Injectable } from '@nestjs/common';
import { db } from '../../../db/drizzle';
import { researchProjects } from '@tradezen/db';
import { eq, desc } from 'drizzle-orm';
import type {
  ContextProvider,
  ContextRequest,
  ContextBlock,
  ProviderCapability,
  ScoringRule,
  ProviderScore,
} from '../context-provider';

@Injectable()
export class ResearchProvider implements ContextProvider {
  id = 'research';
  priority = 30;
  timeoutMs = 200;
  cacheMs = 60_000;

  capabilities(): ProviderCapability[] {
    return [
      {
        id: 'symbol',
        description: 'Research for a symbol',
        patterns: ['symbol', 'research'],
      },
      {
        id: 'research',
        description: 'Active research projects',
        patterns: ['research'],
      },
    ];
  }

  scoringRules(): ScoringRule[] {
    return [
      {
        id: 'thesis',
        weight: 0.4,
        predicate: (msg) => /research|thesis|analysis|hypothesis/i.test(msg),
      },
      {
        id: 'company',
        weight: 0.3,
        predicate: (msg) => /company|fundamental|valuation|earnings/i.test(msg),
      },
      {
        id: 'ticker',
        weight: 0.3,
        predicate: (msg) =>
          /\b[A-Z]{2,5}\b/.test(msg) && /research|analysis|thesis/i.test(msg),
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
    const projectCount = (block.content.match(/^-/gm) ?? []).length;
    return Math.min(1, projectCount / 3);
  }

  supports(request: ContextRequest): boolean {
    if (request.providers && !request.providers.includes('research'))
      return false;
    return true;
  }

  async build(userId: string, request: ContextRequest): Promise<ContextBlock> {
    const limit = request.limit ?? 10;

    const rows = await db
      .select()
      .from(researchProjects)
      .where(eq(researchProjects.userId, userId))
      .orderBy(desc(researchProjects.updatedAt))
      .limit(limit);

    const lines = rows.map(
      (r: any) => `- ${r.title} [${r.status}] conviction=${r.conviction}`,
    );

    const content = [`Research Projects (${rows.length})`, ...lines].join('\n');

    return {
      source: 'research',
      title: `Research Projects (${rows.length})`,
      priority: this.priority,
      freshness: new Date(),
      tokens: Math.ceil(content.split(/\s+/).length * 1.3),
      content,
    };
  }
}
