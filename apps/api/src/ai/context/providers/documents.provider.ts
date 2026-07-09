import { Injectable } from '@nestjs/common';
import { db } from '../../../db/drizzle';
import { researchAssets, researchProjects } from '@tradezen/db';
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
export class DocumentsProvider implements ContextProvider {
  id = 'documents';
  priority = 40;
  timeoutMs = 150;
  cacheMs = 60_000;

  capabilities(): ProviderCapability[] {
    return [
      {
        id: 'documents',
        description: 'Research documents and assets',
        patterns: ['documents', 'research'],
      },
    ];
  }

  scoringRules(): ScoringRule[] {
    return [
      {
        id: 'playbook',
        weight: 0.4,
        predicate: (msg) =>
          /document|playbook|notes|guide|reference/i.test(msg),
      },
      {
        id: 'research_pair',
        weight: 0.3,
        predicate: (msg) => /research|thesis|analysis/i.test(msg),
      },
      {
        id: 'file',
        weight: 0.3,
        predicate: (msg) => /file|upload|attach|pdf|doc/i.test(msg),
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
    const docCount = (block.content.match(/^-/gm) ?? []).length;
    return Math.min(1, docCount / 3);
  }

  supports(request: ContextRequest): boolean {
    if (request.providers && !request.providers.includes('documents'))
      return false;
    return true;
  }

  async build(userId: string, _request: ContextRequest): Promise<ContextBlock> {
    const limit = _request?.limit ?? 10;

    const rows = await db
      .select({
        category: researchAssets.category,
        createdAt: researchAssets.createdAt,
      })
      .from(researchAssets)
      .innerJoin(
        researchProjects,
        eq(researchAssets.projectId, researchProjects.id),
      )
      .where(eq(researchProjects.userId, userId))
      .orderBy(desc(researchAssets.createdAt))
      .limit(limit);

    const byCat = new Map<string, number>();
    for (const r of rows) {
      byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1);
    }

    const lines = Array.from(byCat.entries()).map(
      ([cat, count]) => `- ${cat.replace(/_/g, ' ')}: ${count}`,
    );

    const content = [
      `Research Documents (${rows.length} total)`,
      ...lines,
    ].join('\n');

    return {
      source: 'documents',
      title: `Research Documents (${rows.length})`,
      priority: this.priority,
      freshness: new Date(),
      tokens: Math.ceil(content.split(/\s+/).length * 1.3),
      content,
    };
  }
}
