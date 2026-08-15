import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { IngestionOutboxRelay } from './ingestion-outbox.relay';
import { IngestionOutboxRepository } from './ingestion-outbox.repository';

describe('IngestionOutboxRelay', () => {
  let relay: IngestionOutboxRelay;
  const queue = { add: jest.fn() };
  const outbox = {
    listPending: jest.fn(),
    markDelivered: jest.fn(),
    recordFailure: jest.fn(),
  };

  const pendingRow = {
    id: 'outbox-1',
    payload: {
      action: 'upsert' as const,
      userId: 'u1',
      sourceType: 'research_project',
      sourceId: 'src-1',
      content: 'x',
    },
    status: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    queue.add.mockReset();
    outbox.listPending.mockReset();
    outbox.markDelivered.mockReset();
    outbox.recordFailure.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        IngestionOutboxRelay,
        { provide: getQueueToken('ai-ingestion'), useValue: queue },
        { provide: IngestionOutboxRepository, useValue: outbox },
      ],
    }).compile();
    relay = moduleRef.get(IngestionOutboxRelay);
  });

  it('re-publishes pending rows and marks them delivered', async () => {
    outbox.listPending.mockResolvedValue([pendingRow]);
    const delivered = await relay.sweep();

    expect(outbox.listPending).toHaveBeenCalledWith(50);
    expect(queue.add).toHaveBeenCalledWith(
      'ingest:upsert',
      pendingRow.payload,
      expect.objectContaining({ attempts: 5 }),
    );
    expect(outbox.markDelivered).toHaveBeenCalledWith('outbox-1');
    expect(delivered).toBe(1);
  });

  it('records failure when re-publish throws and skips delivery', async () => {
    outbox.listPending.mockResolvedValue([pendingRow]);
    queue.add.mockRejectedValue(new Error('redis down'));

    const delivered = await relay.sweep();

    expect(outbox.recordFailure).toHaveBeenCalledWith('outbox-1', 'redis down');
    expect(outbox.markDelivered).not.toHaveBeenCalled();
    expect(delivered).toBe(0);
  });

  it('does nothing when there are no pending rows', async () => {
    outbox.listPending.mockResolvedValue([]);
    const delivered = await relay.sweep();
    expect(queue.add).not.toHaveBeenCalled();
    expect(delivered).toBe(0);
  });
});
