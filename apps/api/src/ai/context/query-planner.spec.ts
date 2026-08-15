import { QueryPlanner } from './query-planner';

describe('QueryPlanner', () => {
  const planner = new QueryPlanner();

  it('honors explicit provider lists (web slash commands)', () => {
    const plan = planner.plan({
      request: { providers: ['trades', 'analytics'], intent: 'review' },
      intent: 'review',
      lastUserMessage: 'review my trades',
    });
    expect(plan.selectedBy).toBe('explicit');
    expect(plan.providers).toEqual(['trades', 'analytics']);
  });

  it('maps intent to SQL/RAG providers', () => {
    const plan = planner.plan({ request: {}, intent: 'review' });
    expect(plan.selectedBy).toBe('intent');
    expect(plan.providers).toContain('trades');
    expect(plan.providers).toContain('analytics');
    expect(plan.providers).not.toContain('memory');
  });

  it('maps coach intent to include RAG', () => {
    const plan = planner.plan({ request: {}, intent: 'coach' });
    expect(plan.providers).toContain('memory');
    expect(plan.providers).toContain('trades');
  });

  it('routes factual/temporal questions to RAG', () => {
    const plan = planner.plan({
      request: {},
      lastUserMessage: 'What did I write about liquidity last week?',
    });
    expect(plan.selectedBy).toBe('auto');
    expect(plan.providers).toContain('memory');
    expect(plan.providers).toContain('trades');
  });

  it('does not route generic definition questions to RAG', () => {
    expect(planner.isFactualOrMemoryQuery('What is a stop loss?')).toBe(false);
  });

  it('defaults to full context when no signal', () => {
    const plan = planner.plan({ request: {} });
    expect(plan.selectedBy).toBe('auto');
    expect(plan.providers).toContain('memory');
    expect(plan.providers).toContain('trades');
    expect(plan.providers.length).toBeGreaterThan(3);
  });

  it('dedupes providers (each source selected once)', () => {
    const plan = planner.plan({ request: {}, intent: 'report' });
    expect(new Set(plan.providers).size).toBe(plan.providers.length);
  });
});
