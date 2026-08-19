import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { IngestionEnqueuer } from './ingestion-enqueuer.service';
import { IngestionOutboxRepository } from './ingestion-outbox.repository';
import { SemanticSourceType } from '../ai/context/semantic/types';

describe('IngestionEnqueuer', () => {
  let enqueuer: IngestionEnqueuer;
  const queue = { add: jest.fn() };
  const outbox = {
    insert: jest.fn(),
    markDelivered: jest.fn().mockResolvedValue(undefined),
  };
  const originalEnv = process.env.INGESTION_CLIENT_ENABLED;

  beforeEach(async () => {
    process.env.INGESTION_CLIENT_ENABLED = 'true';
    queue.add.mockReset();
    outbox.insert.mockReset();
    outbox.markDelivered.mockReset();
    outbox.markDelivered.mockResolvedValue(undefined);
    enqueuer = await buildEnqueuer(queue, outbox);
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.INGESTION_CLIENT_ENABLED;
    } else {
      process.env.INGESTION_CLIENT_ENABLED = originalEnv;
    }
  });

  async function buildEnqueuer(q: { add: jest.Mock }, o: typeof outbox) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        IngestionEnqueuer,
        { provide: getQueueToken('ai-ingestion'), useValue: q },
        { provide: IngestionOutboxRepository, useValue: o },
      ],
    }).compile();
    return moduleRef.get(IngestionEnqueuer);
  }

  it('enqueues an upsert job from a SemanticDocument', async () => {
    outbox.insert.mockResolvedValue('outbox-1');
    await enqueuer.enqueueUpsert({
      id: 'src-1',
      userId: 'u1',
      sourceType: SemanticSourceType.RESEARCH_PROJECT,
      title: 'AAPL analysis',
      content: 'Full report text',
      metadata: { symbol: 'AAPL' },
    });

    expect(outbox.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'upsert',
        userId: 'u1',
        sourceType: 'research_project',
        sourceId: 'src-1',
      }),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'ingest:upsert',
      {
        action: 'upsert',
        userId: 'u1',
        sourceType: 'research_project',
        sourceId: 'src-1',
        title: 'AAPL analysis',
        content: 'Full report text',
        metadata: { symbol: 'AAPL' },
      },
      expect.objectContaining({
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      }),
    );
    expect(outbox.markDelivered).toHaveBeenCalledWith('outbox-1');
  });

  it('enqueues a delete job from an EmbeddingEvent', async () => {
    outbox.insert.mockResolvedValue('outbox-2');
    await enqueuer.enqueueDelete({
      sourceType: SemanticSourceType.RESEARCH_PROJECT,
      sourceId: 'src-1',
      userId: 'u1',
      operation: 'DELETE',
    });

    expect(queue.add).toHaveBeenCalledWith(
      'ingest:delete',
      {
        action: 'delete',
        userId: 'u1',
        sourceType: 'research_project',
        sourceId: 'src-1',
      },
      expect.any(Object),
    );
    expect(outbox.markDelivered).toHaveBeenCalledWith('outbox-2');
  });

  it('does nothing when feature flag is disabled', async () => {
    process.env.INGESTION_CLIENT_ENABLED = 'false';
    const disabled = await buildEnqueuer(queue, outbox);
    await disabled.enqueueUpsert({
      id: 'src-1',
      userId: 'u1',
      sourceType: SemanticSourceType.TRADE,
      content: 'x',
      metadata: {},
    });
    expect(outbox.insert).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
    process.env.INGESTION_CLIENT_ENABLED = 'true';
  });

  it('swallows queue errors (never on the critical path)', async () => {
    queue.add.mockRejectedValue(new Error('redis down'));
    await expect(
      enqueuer.enqueueUpsert({
        id: 'src-1',
        userId: 'u1',
        sourceType: SemanticSourceType.TRADE,
        content: 'x',
        metadata: {},
      }),
    ).resolves.toBeUndefined();
  });

  it('still publishes directly when outbox insert fails', async () => {
    outbox.insert.mockRejectedValue(new Error('db down'));
    await enqueuer.enqueueUpsert({
      id: 'src-1',
      userId: 'u1',
      sourceType: SemanticSourceType.TRADE,
      content: 'x',
      metadata: {},
    });
    expect(queue.add).toHaveBeenCalled();
    expect(outbox.markDelivered).not.toHaveBeenCalled();
  });
});
