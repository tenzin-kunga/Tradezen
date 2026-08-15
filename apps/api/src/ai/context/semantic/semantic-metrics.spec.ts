import { SemanticMetricsService } from './semantic-metrics.service';

describe('SemanticMetricsService', () => {
  let service: SemanticMetricsService;

  beforeEach(() => {
    service = new SemanticMetricsService();
  });

  it('records and returns shadow comparisons', () => {
    service.recordShadowComparison({
      oldLatencyMs: 10,
      newLatencyMs: 20,
      oldCount: 3,
      newCount: 2,
      oldAvgScore: 0.7,
      newAvgScore: 0.8,
      oldTokens: 100,
      newTokens: 90,
      degraded: false,
    });
    service.recordShadowComparison({
      oldLatencyMs: 5,
      newLatencyMs: 30,
      oldCount: 0,
      newCount: 0,
      oldAvgScore: 0,
      newAvgScore: 0,
      oldTokens: 10,
      newTokens: 10,
      degraded: true,
    });

    const metrics = service.getMetrics();
    expect(metrics.shadowComparisons).toHaveLength(2);
    expect(metrics.shadowComparisons[0]).toMatchObject({
      oldCount: 3,
      newCount: 2,
      degraded: false,
    });
    expect(metrics.shadowComparisons[1].degraded).toBe(true);
  });

  it('caps shadow comparisons at max samples', () => {
    for (let i = 0; i < 250; i++) {
      service.recordShadowComparison({
        oldLatencyMs: i,
        newLatencyMs: i,
        oldCount: 0,
        newCount: 0,
        oldAvgScore: 0,
        newAvgScore: 0,
        oldTokens: 0,
        newTokens: 0,
        degraded: false,
      });
    }
    expect(service.getMetrics().shadowComparisons).toHaveLength(100);
  });

  it('reset clears shadow comparisons', () => {
    service.recordShadowComparison({
      oldLatencyMs: 1,
      newLatencyMs: 2,
      oldCount: 1,
      newCount: 1,
      oldAvgScore: 1,
      newAvgScore: 1,
      oldTokens: 1,
      newTokens: 1,
      degraded: false,
    });
    service.reset();
    expect(service.getMetrics().shadowComparisons).toEqual([]);
  });
});
