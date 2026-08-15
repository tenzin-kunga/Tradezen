import { Injectable } from '@nestjs/common';
import type { ContextRequest } from './context-provider';

export type PlanSelectionSource = 'explicit' | 'intent' | 'auto';

export interface ContextPlan {
  providers: string[];
  reasons: Record<string, string[]>;
  selectedBy: PlanSelectionSource;
  intent?: string;
}

export const SQL_PROVIDERS = [
  'trades',
  'analytics',
  'portfolio',
  'research',
  'documents',
  'news',
] as const;

export const RAG_PROVIDERS = ['memory'] as const;

const INTENT_PROVIDERS: Record<string, string[]> = {
  review: ['trades', 'analytics'],
  portfolio: ['portfolio', 'trades', 'analytics'],
  research: ['research', 'documents'],
  inspect: ['research', 'documents', 'trades', 'memory'],
  report: [
    'trades',
    'analytics',
    'portfolio',
    'research',
    'documents',
    'memory',
  ],
  coach: ['memory', 'trades', 'analytics'],
  chat: ['memory', 'trades', 'analytics'],
};

// Self-referential recall + temporal questions ("What did I write about
// liquidity last week?") route to RAG. Generic definitions ("What is a stop
// loss?") do not — the memory provider returns nothing relevant for them.
const FACTUAL_PATTERNS = [
  /\b(remember|recall|previously|before|earlier)\b/i,
  /\b(did i|did you|what did i)\b/i,
  /\b(last|this|past|previous)\s+(week|month|day|weekend|quarter|session)\b/i,
  /\bwhat (happened|wrote|said|did)\b/i,
];

@Injectable()
export class QueryPlanner {
  plan(input: {
    request: ContextRequest;
    lastUserMessage?: string;
    intent?: string;
  }): ContextPlan {
    const { request, lastUserMessage, intent } = input;
    const effectiveIntent = intent ?? request.intent;

    if (request.providers && request.providers.length > 0) {
      return {
        providers: request.providers,
        reasons: { _explicit: ['provider list requested by caller'] },
        selectedBy: 'explicit',
      };
    }

    if (effectiveIntent && INTENT_PROVIDERS[effectiveIntent]) {
      return {
        providers: INTENT_PROVIDERS[effectiveIntent],
        reasons: {
          _intent: [`intent '${effectiveIntent}' maps to SQL/RAG providers`],
        },
        selectedBy: 'intent',
        intent: effectiveIntent,
      };
    }

    if (lastUserMessage && this.isFactualOrMemoryQuery(lastUserMessage)) {
      return {
        providers: ['memory', 'trades', 'analytics'],
        reasons: {
          memory: ['factual/temporal question — routes to RAG'],
          trades: ['combined SQL+RAG'],
          analytics: ['combined SQL+RAG'],
        },
        selectedBy: 'auto',
      };
    }

    return {
      providers: [...SQL_PROVIDERS, ...RAG_PROVIDERS],
      reasons: {
        _auto: ['no intent or explicit providers — default full context'],
      },
      selectedBy: 'auto',
    };
  }

  isFactualOrMemoryQuery(msg: string): boolean {
    return FACTUAL_PATTERNS.some((re) => re.test(msg));
  }
}
