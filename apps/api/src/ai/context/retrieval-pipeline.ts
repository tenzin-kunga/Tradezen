import type {
  ContextProvider,
  ContextRequest,
  ContextBlock,
  ProviderScore,
  RetrievalTrace,
} from './context-provider';
export type { RetrievalTrace } from './context-provider';
import { SCORE_THRESHOLD, TOTAL_TOKEN_BUDGET } from './context-provider';
import type { ContextPlan } from './query-planner';

export class RetrievalPipeline {
  constructor(
    private readonly providers: ContextProvider[],
    private readonly budget: number = TOTAL_TOKEN_BUDGET,
  ) {}

  async execute(
    userId: string,
    request: ContextRequest,
    lastUserMessage?: string,
    plan?: ContextPlan,
  ): Promise<{
    blocks: ContextBlock[];
    trace: RetrievalTrace;
    warnings: string[];
  }> {
    const scores = this.scoreProviders(request, lastUserMessage);
    const active = plan
      ? this.providers
          .filter((p) => plan.providers.includes(p.id))
          .map(
            (p) =>
              scores.find((s) => s.provider === p.id) ?? {
                provider: p.id,
                score: 0,
                reasons: [],
              },
          )
      : this.filterByThreshold(scores, request);
    const budgetMap = this.allocateBudget(active);
    const { blocks, warnings, latencies } = await this.executeProviders(
      userId,
      request,
      lastUserMessage,
      active,
    );
    const trimmed = this.trim(blocks, active, budgetMap);
    const trace = this.buildTrace(
      scores,
      trimmed,
      budgetMap,
      warnings,
      latencies,
    );
    return { blocks: trimmed, trace, warnings };
  }

  scoreProviders(
    request: ContextRequest,
    lastUserMessage?: string,
  ): ProviderScore[] {
    return this.providers.map((p) => p.score(request, lastUserMessage));
  }

  filterByThreshold(
    scores: ProviderScore[],
    request: ContextRequest,
  ): ProviderScore[] {
    return scores.filter((s) => {
      const provider = this.providers.find((p) => p.id === s.provider);
      // Respect supports() — same logic as old ContextBuilder
      if (provider && !provider.supports(request)) return false;
      if (s.score >= SCORE_THRESHOLD) return true;
      // Never skip explicitly requested providers
      if (request.providers?.includes(s.provider)) return true;
      return false;
    });
  }

  allocateBudget(active: ProviderScore[]): Record<string, number> {
    const totalScore = active.reduce((sum, s) => sum + s.score, 0);
    if (totalScore === 0) return {};

    const budgetMap: Record<string, number> = {};
    for (const s of active) {
      budgetMap[s.provider] = Math.floor((s.score / totalScore) * this.budget);
    }
    return budgetMap;
  }

  private async executeProviders(
    userId: string,
    request: ContextRequest,
    lastUserMessage: string | undefined,
    active: ProviderScore[],
  ): Promise<{
    blocks: ContextBlock[];
    warnings: string[];
    latencies: Record<string, number>;
  }> {
    const activeProviders = this.providers.filter((p) =>
      active.some((s) => s.provider === p.id),
    );

    const results = await Promise.allSettled(
      activeProviders.map(async (provider) => {
        const start = Date.now();
        try {
          const block = await this.withTimeout(
            provider.build(userId, request, lastUserMessage),
            provider.timeoutMs,
          );
          const score = active.find((s) => s.provider === provider.id);
          // Enrich block with scoring metadata
          block.relevance = score?.score ?? 0;
          block.dataCompleteness = provider.dataCompleteness(block, request);
          block.retrievalReason = score?.reasons.join('; ') ?? 'base';
          const latency = Date.now() - start;
          return { block, latency, provider };
        } catch (err) {
          const latency = Date.now() - start;
          return { error: err as Error, latency, provider };
        }
      }),
    );

    const blocks: ContextBlock[] = [];
    const warnings: string[] = [];
    const latencies: Record<string, number> = {};

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const provider = activeProviders[i];
      latencies[provider.id] =
        result.status === 'fulfilled' ? result.value.latency : 0;

      if (
        result.status === 'fulfilled' &&
        'block' in result.value &&
        result.value.block
      ) {
        blocks.push(result.value.block);
      } else {
        const reason =
          result.status === 'rejected' ? result.reason : result.value.error;
        warnings.push(
          `${provider.id}: ${reason instanceof Error ? reason.message : String(reason)}`,
        );
      }
    }

    return { blocks, warnings, latencies };
  }

  private trim(
    blocks: ContextBlock[],
    active: ProviderScore[],
    budgetMap: Record<string, number>,
  ): ContextBlock[] {
    // Sort by relevance descending
    blocks.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));

    const trimmed: ContextBlock[] = [];
    const usedBudget: Record<string, number> = {};
    let remaining = this.budget;

    for (const block of blocks) {
      const allocated = budgetMap[block.source] ?? 0;
      const used = usedBudget[block.source] ?? 0;
      const available = allocated - used;

      if (block.tokens <= remaining && block.tokens <= available) {
        trimmed.push(block);
        remaining -= block.tokens;
        usedBudget[block.source] = used + block.tokens;
      } else if (block.tokens <= remaining) {
        // Provider used less than allocated — take what we can
        trimmed.push(block);
        remaining -= block.tokens;
        usedBudget[block.source] = used + block.tokens;
      }
      // else: skip — would exceed budget
    }

    return trimmed;
  }

  private buildTrace(
    scores: ProviderScore[],
    blocks: ContextBlock[],
    budgetMap: Record<string, number>,
    warnings: string[],
    latencies: Record<string, number>,
  ): RetrievalTrace {
    const budgetUsed: Record<string, number> = {};
    for (const block of blocks) {
      budgetUsed[block.source] = (budgetUsed[block.source] ?? 0) + block.tokens;
    }

    return {
      type: 'retrieval',
      timestamp: new Date(),
      scores: scores.map((s) => ({
        provider: s.provider,
        score: s.score,
        reasons: s.reasons,
        filtered: !blocks.some((b) => b.source === s.provider),
      })),
      budgetAllocated: budgetMap,
      budgetUsed,
      totalTokens: blocks.reduce((sum, b) => sum + b.tokens, 0),
      warnings,
      latencies,
    };
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`timeout after ${ms}ms`)),
        ms,
      );
      promise.then(
        (val) => {
          clearTimeout(timer);
          resolve(val);
        },
        (err) => {
          clearTimeout(timer);
          reject(err instanceof Error ? err : new Error(String(err)));
        },
      );
    });
  }
}
