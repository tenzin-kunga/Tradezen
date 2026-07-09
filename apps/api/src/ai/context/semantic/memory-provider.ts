import { Injectable } from '@nestjs/common';
import { SemanticRetrievalService } from './semantic-retrieval.service';
import { DefaultMemoryFormatter } from './memory-formatter';
import { RetrievalIntent } from './types';
import type {
  ContextProvider,
  ContextRequest,
  ContextBlock,
  ProviderCapability,
  ScoringRule,
  ProviderScore,
} from '../context-provider';

@Injectable()
export class MemoryProvider implements ContextProvider {
  id = 'memory';
  priority = 15;
  timeoutMs = 300;
  cacheMs = 30_000;

  private formatter = new DefaultMemoryFormatter();

  constructor(private readonly semantic: SemanticRetrievalService) {}

  capabilities(): ProviderCapability[] {
    return [
      {
        id: 'memory',
        description: 'Semantic memory retrieval',
        patterns: ['memory'],
      },
    ];
  }

  scoringRules(): ScoringRule[] {
    return [
      {
        id: 'remember',
        weight: 0.4,
        predicate: (msg) =>
          /remember|recall|previously|before|last time/i.test(msg),
      },
      {
        id: 'pattern',
        weight: 0.3,
        predicate: (msg) => /pattern|habit|tendency|usually|always/i.test(msg),
      },
      {
        id: 'history',
        weight: 0.3,
        predicate: (msg) => /history|past|learned|experience/i.test(msg),
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
    const hasResults = /similarity/.test(block.content);
    return hasResults ? 0.8 : 0.2;
  }

  supports(request: ContextRequest): boolean {
    if (request.providers && !request.providers.includes('memory'))
      return false;
    return true;
  }

  async build(
    userId: string,
    _request: ContextRequest,
    lastUserMessage?: string,
  ): Promise<ContextBlock> {
    if (!lastUserMessage) {
      return this.formatter.format([]);
    }

    const results = await this.semantic.retrieve(
      userId,
      lastUserMessage,
      RetrievalIntent.CHAT,
    );

    return this.formatter.format(results);
  }
}
