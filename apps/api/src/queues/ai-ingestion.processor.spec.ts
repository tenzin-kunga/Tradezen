import { AiIngestionProcessor } from './ai-ingestion.processor';
import { Job } from 'bullmq';
import type { IngestionJobData } from './ingestion-enqueuer.service';

describe('AiIngestionProcessor', () => {
  const originalUrl = process.env.AI_SERVICE_URL;
  const originalKey = process.env.AI_SERVICE_API_KEY;
  const originalTimeout = process.env.INGESTION_CLIENT_TIMEOUT_MS;

  beforeEach(() => {
    process.env.AI_SERVICE_URL = 'http://ai:8000';
    process.env.AI_SERVICE_API_KEY = 'test-key';
    process.env.INGESTION_CLIENT_TIMEOUT_MS = '5000';
  });

  afterAll(() => {
    process.env.AI_SERVICE_URL = originalUrl;
    process.env.AI_SERVICE_API_KEY = originalKey;
    process.env.INGESTION_CLIENT_TIMEOUT_MS = originalTimeout;
  });

  function makeJob(
    overrides: Record<string, unknown> = {},
  ): Job<IngestionJobData> {
    return {
      name: 'ingest:upsert',
      data: {
        action: 'upsert',
        userId: 'u1',
        sourceType: 'research_project',
        sourceId: 'src-1',
        title: 'AAPL',
        content: 'report',
        metadata: { symbol: 'AAPL' },
        ...overrides,
      },
    } as unknown as Job<IngestionJobData>;
  }

  it('POSTs the event to Python /ingest/document', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'upserted' }),
    });
    globalThis.fetch = fetchMock;

    const processor = new AiIngestionProcessor();
    const result = await processor.process(makeJob());

    expect(fetchMock).toHaveBeenCalledWith(
      'http://ai:8000/ingest/document',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': 'test-key',
        },
        body: JSON.stringify({
          action: 'upsert',
          user_id: 'u1',
          source_type: 'research_project',
          source_id: 'src-1',
          title: 'AAPL',
          content: 'report',
          metadata: { symbol: 'AAPL' },
        }),
      }),
    );
    expect(result).toEqual({ status: 'upserted' });
  });

  it('throws on non-ok response so BullMQ retries', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('unavailable'),
    });
    globalThis.fetch = fetchMock;

    const processor = new AiIngestionProcessor();
    await expect(processor.process(makeJob())).rejects.toThrow(
      '503 unavailable',
    );
  });

  it('sends delete payload without content fields', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'deleted', deleted: 1 }),
    });
    globalThis.fetch = fetchMock;

    const processor = new AiIngestionProcessor();
    await processor.process(
      makeJob({
        action: 'delete',
        title: undefined,
        content: undefined,
        metadata: undefined,
      }),
    );

    const callArgs = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string },
    ];
    const body = JSON.parse(callArgs[1].body) as Record<string, unknown>;
    expect(body).toEqual({
      action: 'delete',
      user_id: 'u1',
      source_type: 'research_project',
      source_id: 'src-1',
      title: undefined,
      content: undefined,
      metadata: undefined,
    });
  });
});
