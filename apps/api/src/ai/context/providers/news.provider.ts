import { Injectable } from '@nestjs/common';
import type {
  ContextProvider,
  ContextRequest,
  ContextBlock,
  ProviderCapability,
  ScoringRule,
  ProviderScore,
} from '../context-provider';

@Injectable()
export class NewsProvider implements ContextProvider {
  id = 'news';
  priority = 60;
  timeoutMs = 200;
  cacheMs = 300_000;

  capabilities(): ProviderCapability[] {
    return [
      {
        id: 'news',
        description: 'Upcoming economic events',
        patterns: ['news'],
      },
    ];
  }

  scoringRules(): ScoringRule[] {
    return [
      {
        id: 'market',
        weight: 0.5,
        predicate: (msg) => /news|market|event|sentiment|economy/i.test(msg),
      },
      {
        id: 'calendar',
        weight: 0.3,
        predicate: (msg) => /calendar|earnings|report|announcement/i.test(msg),
      },
      {
        id: 'macro',
        weight: 0.2,
        predicate: (msg) => /fed|interest rate|inflation|gdp/i.test(msg),
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

  dataCompleteness(_block: ContextBlock | null, _: ContextRequest): number {
    return 0.1; // stub — no real data yet
  }

  supports(request: ContextRequest): boolean {
    if (request.providers && !request.providers.includes('news')) return false;
    return true;
  }

  async build(
    _userId: string,
    _request: ContextRequest,
  ): Promise<ContextBlock> {
    return {
      source: 'news',
      title: 'Economic News',
      priority: this.priority,
      freshness: new Date(),
      tokens: 20,
      content:
        'Economic calendar: no events loaded (news service pending integration)',
    };
  }
}
