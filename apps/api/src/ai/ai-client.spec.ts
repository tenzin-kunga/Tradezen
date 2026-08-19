import { AIClient } from './ai-client';

describe('AIClient context-owned passthrough (Slice 7)', () => {
  const SAVED_URL = process.env.AI_SERVICE_URL;
  const SAVED_KEY = process.env.AI_SERVICE_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    if (SAVED_URL === undefined) delete process.env.AI_SERVICE_URL;
    else process.env.AI_SERVICE_URL = SAVED_URL;
    if (SAVED_KEY === undefined) delete process.env.AI_SERVICE_API_KEY;
    else process.env.AI_SERVICE_API_KEY = SAVED_KEY;
  });

  function mockStreamFetch() {
    const chunks = [
      'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n',
      'data: [DONE]\n\n',
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader() {
          const encoder = new TextEncoder();
          let i = 0;
          return {
            read: async () => {
              if (i < chunks.length) {
                return { done: false, value: encoder.encode(chunks[i++]) };
              }
              return { done: true, value: undefined };
            },
            cancel: async () => undefined,
          };
        },
      },
    });
    return global.fetch as jest.Mock;
  }

  it('sends x-context-owned-by-nestjs when contextOwned is true', async () => {
    const fetchMock = mockStreamFetch();
    const client = new AIClient({} as any);
    const out: string[] = [];
    for await (const t of client.stream([{ role: 'user', content: 'hi' }], {
      model: 'm',
      contextOwned: true,
    })) {
      out.push(t);
    }
    expect(out.join('')).toBe('hi');
    const headers = fetchMock.mock.calls[0][1].headers as Record<
      string,
      string
    >;
    expect(headers['x-context-owned-by-nestjs']).toBe('true');
  });

  it('omits the header when contextOwned is false', async () => {
    const fetchMock = mockStreamFetch();
    const client = new AIClient({} as any);
    const out: string[] = [];
    for await (const t of client.stream([{ role: 'user', content: 'hi' }], {
      model: 'm',
    })) {
      out.push(t);
    }
    expect(out.join('')).toBe('hi');
    const headers = fetchMock.mock.calls[0][1].headers as Record<
      string,
      string
    >;
    expect(headers['x-context-owned-by-nestjs']).toBeUndefined();
  });
});
