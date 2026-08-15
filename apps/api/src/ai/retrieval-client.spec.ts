import { RetrievalClient } from './retrieval-client';

const SAVED_URL = process.env.AI_SERVICE_URL;
const SAVED_KEY = process.env.AI_SERVICE_API_KEY;

describe('RetrievalClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    if (SAVED_URL === undefined) delete process.env.AI_SERVICE_URL;
    else process.env.AI_SERVICE_URL = SAVED_URL;
    if (SAVED_KEY === undefined) delete process.env.AI_SERVICE_API_KEY;
    else process.env.AI_SERVICE_API_KEY = SAVED_KEY;
    delete process.env.RETRIEVAL_CLIENT_ENABLED;
    delete process.env.RETRIEVAL_CLIENT_SHADOW;
    delete process.env.RETRIEVAL_CLIENT_TIMEOUT_MS;
  });

  it('is disabled by default', () => {
    expect(new RetrievalClient().isEnabled()).toBe(false);
  });

  it('is enabled when flag is set', () => {
    process.env.RETRIEVAL_CLIENT_ENABLED = 'true';
    expect(new RetrievalClient().isEnabled()).toBe(true);
  });

  it('is in shadow mode when flag is set', () => {
    process.env.RETRIEVAL_CLIENT_SHADOW = 'true';
    const client = new RetrievalClient();
    expect(client.isShadow()).toBe(true);
    expect(client.isEnabled()).toBe(false);
    expect(client.shouldCall()).toBe(true);
  });

  it('marks result degraded when disabled (never calls Python)', async () => {
    process.env.RETRIEVAL_CLIENT_ENABLED = 'false';
    global.fetch = jest.fn();
    const client = new RetrievalClient();
    const result = await client.search('u1', {
      query: 'AAPL',
      intent: 'chat',
      requestId: 'r1',
    });
    expect(result.documents).toEqual([]);
    expect(result.debug.degraded).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sends user_id from trusted server-side auth, not client input', async () => {
    process.env.RETRIEVAL_CLIENT_ENABLED = 'true';
    process.env.AI_SERVICE_URL = 'http://python:8000';
    process.env.AI_SERVICE_API_KEY = 'sekret';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          requestId: 'r1',
          documents: [
            {
              documentId: 'd1',
              sourceType: 'trade',
              content: 'Bought AAPL',
              score: 0.8,
              retrievalMethod: 'rrf',
            },
          ],
          debug: {
            candidates: 1,
            filtered: 1,
            latencyMs: 5,
            method: 'hybrid',
            breakdown: {},
          },
        }),
    });

    const client = new RetrievalClient();
    const result = await client.search('user-123', {
      query: 'AAPL',
      intent: 'chat',
      requestId: 'r1',
      budgetTokens: 2000,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://python:8000/retrieval',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-internal-api-key': 'sekret',
        }),
        body: JSON.stringify({
          query: 'AAPL',
          intent: 'chat',
          requestId: 'r1',
          budgetTokens: 2000,
          user_id: 'user-123',
        }),
      }),
    );
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].documentId).toBe('d1');
  });

  it('returns empty result on HTTP error', async () => {
    process.env.RETRIEVAL_CLIENT_ENABLED = 'true';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    });
    const client = new RetrievalClient();
    const result = await client.search('u1', {
      query: 'q',
      intent: 'chat',
      requestId: 'r2',
    });
    expect(result.documents).toEqual([]);
  });

  it('returns empty result on malformed response', async () => {
    process.env.RETRIEVAL_CLIENT_ENABLED = 'true';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ requestId: 'r3', notDocuments: true }),
    });
    const client = new RetrievalClient();
    const result = await client.search('u1', {
      query: 'q',
      intent: 'chat',
      requestId: 'r3',
    });
    expect(result.documents).toEqual([]);
    expect(result.requestId).toBe('r3');
  });

  it('returns empty result on timeout', async () => {
    process.env.RETRIEVAL_CLIENT_ENABLED = 'true';
    process.env.RETRIEVAL_CLIENT_TIMEOUT_MS = '50';
    global.fetch = jest.fn().mockImplementation((_url, opts) => {
      const signal = opts.signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });
    const client = new RetrievalClient();
    const result = await client.search('u1', {
      query: 'q',
      intent: 'chat',
      requestId: 'r4',
    });
    expect(result.documents).toEqual([]);
  });

  it('returns empty result when Python unreachable', async () => {
    process.env.RETRIEVAL_CLIENT_ENABLED = 'true';
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const client = new RetrievalClient();
    const result = await client.search('u1', {
      query: 'q',
      intent: 'chat',
      requestId: 'r5',
    });
    expect(result.documents).toEqual([]);
  });
});
