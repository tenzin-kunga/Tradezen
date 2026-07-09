import { AIClient } from '../ai-client';
import { AiMetricsService } from '../ai-metrics.service';
import { AIServiceUnavailableError } from '../ai-errors';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// These tests involve real retry delays (100-900ms each × 4 attempts)
jest.setTimeout(30_000);

describe('AIClient circuit breaker', () => {
  let metrics: AiMetricsService;

  beforeEach(() => {
    metrics = new AiMetricsService();
    mockFetch.mockReset();
  });

  it('opens after 5 consecutive failed calls', async () => {
    const client = new AIClient(metrics);
    // Each call retries 3 times before failing, so 5 calls = 20 fetch failures
    mockFetch.mockRejectedValue(
      Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' }),
    );

    for (let i = 0; i < 5; i++) {
      try {
        await client.complete([{ role: 'user', content: 'test' }]);
      } catch {
        // expected
      }
    }

    // 6th call should fail immediately (circuit open) — no fetch call
    const beforeFetch = mockFetch.mock.calls.length;
    await expect(
      client.complete([{ role: 'user', content: 'test' }]),
    ).rejects.toThrow(AIServiceUnavailableError);
    expect(mockFetch).toHaveBeenCalledTimes(beforeFetch);
  });

  it('resets failure count on success', async () => {
    const client = new AIClient(metrics);
    // 4 failures
    mockFetch.mockRejectedValue(
      Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' }),
    );

    for (let i = 0; i < 4; i++) {
      try {
        await client.complete([{ role: 'user', content: 'test' }]);
      } catch {
        // expected
      }
    }

    // 1 success resets counter
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: 'ok' } }],
          model: 'm',
          usage: {},
        }),
    });
    await client.complete([{ role: 'user', content: 'test' }]);

    // Circuit should NOT be open — next call goes through (and fails/retries)
    mockFetch.mockRejectedValue(
      Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' }),
    );
    const beforeFetch = mockFetch.mock.calls.length;
    try {
      await client.complete([{ role: 'user', content: 'test' }]);
    } catch {
      // expected — but it went through (fetch was called, not short-circuited)
    }
    expect(mockFetch.mock.calls.length).toBeGreaterThan(beforeFetch);
  });

  it('tracks metrics', async () => {
    const client = new AIClient(metrics);
    mockFetch.mockRejectedValue(
      Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' }),
    );

    for (let i = 0; i < 5; i++) {
      try {
        await client.complete([{ role: 'user', content: 'test' }]);
      } catch {
        // expected
      }
    }

    const snap = metrics.snapshot();
    expect(snap.failures).toBeGreaterThan(0);
    expect(snap.retries).toBeGreaterThan(0);
    expect(snap.circuitBreakerOpens).toBe(1);
  });
});
