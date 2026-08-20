import { RetrievalPipeline } from './retrieval-pipeline';
import type {
  ContextProvider,
  ContextBlock,
  ProviderScore,
} from './context-provider';
import { SCORE_THRESHOLD } from './context-provider';

function makeProvider(
  id: string,
  overrides: Partial<ContextProvider> = {},
): ContextProvider {
  return {
    id,
    priority: 10,
    timeoutMs: 100,
    cacheMs: 60_000,
    capabilities: () => [],
    scoringRules: () => [],
    score: (): ProviderScore => ({
      provider: id,
      score: 0.5,
      reasons: ['default'],
    }),
    dataCompleteness: () => 0.5,
    supports: () => true,
    build: (): Promise<ContextBlock> =>
      Promise.resolve({
        source: id,
        title: id,
        priority: 10,
        freshness: new Date(),
        tokens: 10,
        content: `${id} data`,
      }),
    ...overrides,
  };
}

function makeBlock(
  source: string,
  tokens: number,
  relevance = 0.5,
): ContextBlock {
  return {
    source,
    title: source,
    priority: 10,
    freshness: new Date(),
    tokens,
    content: `${source} data`,
    relevance,
    dataCompleteness: 0.5,
    retrievalReason: 'test',
  };
}

describe('RetrievalPipeline', () => {
  describe('scoreProviders', () => {
    it('scores all providers', () => {
      const p1 = makeProvider('a', {
        score: () => ({ provider: 'a', score: 0.8, reasons: ['match'] }),
      });
      const p2 = makeProvider('b', {
        score: () => ({ provider: 'b', score: 0.2, reasons: ['partial'] }),
      });
      const pipeline = new RetrievalPipeline([p1, p2]);
      const scores = pipeline.scoreProviders({}, 'test message');
      expect(scores).toHaveLength(2);
      expect(scores[0].score).toBe(0.8);
      expect(scores[1].score).toBe(0.2);
    });

    it('passes lastUserMessage to score', () => {
      const spy = jest.fn().mockReturnValue({
        provider: 'a',
        score: 0.5,
        reasons: [],
      });
      const p = makeProvider('a', { score: spy });
      const pipeline = new RetrievalPipeline([p]);
      pipeline.scoreProviders({}, 'hello world');
      expect(spy).toHaveBeenCalledWith({}, 'hello world');
    });
  });

  describe('filterByThreshold', () => {
    it('filters out providers below threshold', () => {
      const pipeline = new RetrievalPipeline([]);
      const scores: ProviderScore[] = [
        { provider: 'a', score: 0.5, reasons: [] },
        { provider: 'b', score: SCORE_THRESHOLD - 0.01, reasons: [] },
      ];
      const result = pipeline.filterByThreshold(scores, {});
      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('a');
    });

    it('keeps explicitly requested providers even if below threshold', () => {
      const pipeline = new RetrievalPipeline([]);
      const scores: ProviderScore[] = [
        { provider: 'a', score: 0.01, reasons: [] },
      ];
      const result = pipeline.filterByThreshold(scores, {
        providers: ['a'],
      });
      expect(result).toHaveLength(1);
    });

    it('respects supports() — filters unsupported providers', () => {
      const p = makeProvider('a', {
        supports: (req) => req.providers?.includes('a') ?? false,
      });
      const pipeline = new RetrievalPipeline([p]);
      const scores: ProviderScore[] = [
        { provider: 'a', score: 0.9, reasons: [] },
      ];
      const result = pipeline.filterByThreshold(scores, {
        providers: ['other'],
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('allocateBudget', () => {
    it('allocates proportionally by score', () => {
      const pipeline = new RetrievalPipeline([], 1000);
      const active: ProviderScore[] = [
        { provider: 'a', score: 0.75, reasons: [] },
        { provider: 'b', score: 0.25, reasons: [] },
      ];
      const map = pipeline.allocateBudget(active);
      expect(map.a).toBe(750);
      expect(map.b).toBe(250);
    });

    it('returns empty map when total score is 0', () => {
      const pipeline = new RetrievalPipeline([], 1000);
      const active: ProviderScore[] = [
        { provider: 'a', score: 0, reasons: [] },
      ];
      const map = pipeline.allocateBudget(active);
      expect(Object.keys(map)).toHaveLength(0);
    });

    it('sums to budget (floor rounding)', () => {
      const pipeline = new RetrievalPipeline([], 1000);
      const active: ProviderScore[] = [
        { provider: 'a', score: 0.33, reasons: [] },
        { provider: 'b', score: 0.33, reasons: [] },
        { provider: 'c', score: 0.34, reasons: [] },
      ];
      const map = pipeline.allocateBudget(active);
      const total = Object.values(map).reduce((s, v) => s + v, 0);
      expect(total).toBeLessThanOrEqual(1000);
    });
  });

  describe('execute', () => {
    it('returns blocks from active providers', async () => {
      const p1 = makeProvider('a');
      const p2 = makeProvider('b');
      const pipeline = new RetrievalPipeline([p1, p2]);
      const { blocks, trace } = await pipeline.execute('user1', {});
      expect(blocks).toHaveLength(2);
      expect(trace.type).toBe('retrieval');
      expect(trace.scores).toHaveLength(2);
    });

    it('enriches blocks with relevance and dataCompleteness', async () => {
      const p = makeProvider('a', {
        score: () => ({ provider: 'a', score: 0.9, reasons: ['match'] }),
        dataCompleteness: () => 0.8,
      });
      const pipeline = new RetrievalPipeline([p]);
      const { blocks } = await pipeline.execute('user1', {});
      expect(blocks[0].relevance).toBe(0.9);
      expect(blocks[0].dataCompleteness).toBe(0.8);
      expect(blocks[0].retrievalReason).toBe('match');
    });

    it('handles provider errors gracefully', async () => {
      const p = makeProvider('a', {
        build: () => {
          throw new Error('db timeout');
        },
      });
      const pipeline = new RetrievalPipeline([p]);
      const { blocks, warnings } = await pipeline.execute('user1', {});
      expect(blocks).toHaveLength(0);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('db timeout');
    });

    it('trims blocks that exceed budget', async () => {
      const p = makeProvider('a', {
        build: () => Promise.resolve(makeBlock('a', 500)),
        score: () => ({ provider: 'a', score: 0.5, reasons: [] }),
      });
      // Budget of 100 tokens — block is 500
      const pipeline = new RetrievalPipeline([p], 100);
      const { blocks } = await pipeline.execute('user1', {});
      expect(blocks).toHaveLength(0);
    });
  });

  describe('execute with plan', () => {
    it('executes exactly the planned providers, each once', async () => {
      const p1 = makeProvider('a');
      const p2 = makeProvider('b');
      const p3 = makeProvider('c');
      const build1 = jest.spyOn(p1, 'build');
      const build2 = jest.spyOn(p2, 'build');
      const build3 = jest.spyOn(p3, 'build');
      const pipeline = new RetrievalPipeline([p1, p2, p3]);
      const plan = {
        providers: ['a', 'c'],
        selectedBy: 'intent' as const,
        reasons: {},
      };
      const { blocks } = await pipeline.execute('user1', {}, undefined, plan);
      expect(blocks.map((b) => b.source)).toEqual(
        expect.arrayContaining(['a', 'c']),
      );
      expect(blocks).toHaveLength(2);
      expect(build1).toHaveBeenCalledTimes(1);
      expect(build2).not.toHaveBeenCalled();
      expect(build3).toHaveBeenCalledTimes(1);
    });

    it('ignores planned providers that are not registered', async () => {
      const p1 = makeProvider('a');
      const build1 = jest.spyOn(p1, 'build');
      const pipeline = new RetrievalPipeline([p1]);
      const plan = {
        providers: ['a', 'ghost'],
        selectedBy: 'intent' as const,
        reasons: {},
      };
      const { blocks } = await pipeline.execute('user1', {}, undefined, plan);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].source).toBe('a');
      expect(build1).toHaveBeenCalledTimes(1);
    });
  });

  describe('buildTrace (via execute)', () => {
    it('includes budget allocated and used', async () => {
      const p = makeProvider('a', {
        build: () => Promise.resolve(makeBlock('a', 50)),
        score: () => ({ provider: 'a', score: 1.0, reasons: ['match'] }),
      });
      const pipeline = new RetrievalPipeline([p], 1000);
      const { trace } = await pipeline.execute('user1', {});
      expect(trace.budgetAllocated.a).toBe(1000);
      expect(trace.budgetUsed.a).toBe(50);
      expect(trace.totalTokens).toBe(50);
    });

    it('marks filtered providers', async () => {
      const p1 = makeProvider('a', {
        score: () => ({ provider: 'a', score: 0.9, reasons: [] }),
      });
      const p2 = makeProvider('b', {
        score: () => ({ provider: 'b', score: 0.01, reasons: [] }),
      });
      const pipeline = new RetrievalPipeline([p1, p2]);
      const { trace } = await pipeline.execute('user1', {});
      const scoreA = trace.scores.find((s) => s.provider === 'a');
      const scoreB = trace.scores.find((s) => s.provider === 'b');
      expect(scoreA?.filtered).toBe(false);
      expect(scoreB?.filtered).toBe(true);
    });
  });
});
