import { ReconciliationService } from './reconciliation.service';
import type { CorpusBaseline } from './corpus-baseline.service';

jest.mock('../db/drizzle', () => ({
  db: {
    execute: jest.fn(),
  },
}));

import { db } from '../db/drizzle';
// eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock, no `this`
const execute = db.execute as unknown as jest.Mock;

const mkBaseline = (over: Partial<CorpusBaseline> = {}): CorpusBaseline => ({
  userId: 'u1',
  generatedAt: '2026-08-14T00:00:00.000Z',
  perSource: [
    {
      sourceType: 'trade',
      sourceCount: 2,
      corpusCount: 1,
      distinctSources: 1,
      missing: ['src-2'],
      orphaned: ['src-orphan'],
      duplicateChunkRows: 1,
    },
  ],
  totals: {
    sourceCount: 2,
    corpusCount: 1,
    missing: 1,
    orphaned: 1,
    duplicateChunkRows: 1,
  },
  ...over,
});

const baseline = {
  listUserIds: jest.fn(),
  validate: jest.fn(),
};

const formatterRegistry = {
  get: jest.fn(),
};

const pipeline = {
  enqueue: jest.fn(),
};

const service = new ReconciliationService(
  baseline as never,
  formatterRegistry as never,
  pipeline as never,
);

describe('ReconciliationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    baseline.listUserIds.mockResolvedValue(['u1']);
    baseline.validate.mockResolvedValue(mkBaseline());
    formatterRegistry.get.mockImplementation((t: string) => ({
      format: (entity: { id: string }) => ({
        id: entity.id,
        userId: 'u1',
        sourceType: t,
        content: 'x',
      }),
    }));
    pipeline.enqueue.mockResolvedValue(undefined);
  });

  it('re-enqueues missing docs via the pipeline', async () => {
    execute.mockResolvedValue([{ id: 'src-2' }]);
    const reports = await service.run();

    expect(pipeline.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'src-2', sourceType: 'trade' }),
    );
    const trade = reports[0].perSource.find((s) => s.sourceType === 'trade')!;
    expect(trade.reenqueued).toEqual(['src-2']);
    expect(trade.unrepairable).toEqual([]);
  });

  it('reports research_document as unrepairable (no stored text)', async () => {
    baseline.validate.mockResolvedValue(
      mkBaseline({
        perSource: [
          {
            sourceType: 'research_document',
            sourceCount: 1,
            corpusCount: 0,
            distinctSources: 0,
            missing: ['doc-1'],
            orphaned: [],
            duplicateChunkRows: 0,
          },
        ],
      }),
    );
    const reports = await service.run();

    const rd = reports[0].perSource.find(
      (s) => s.sourceType === 'research_document',
    )!;
    expect(rd.unrepairable).toEqual(['doc-1']);
    expect(pipeline.enqueue).not.toHaveBeenCalled();
  });

  it('prunes orphaned and duplicate rows only when prune is authorized', async () => {
    execute.mockResolvedValue([]);
    await service.run();
    const noPrune = JSON.stringify(
      execute.mock.calls.map((c) => (c as unknown[])[0] as string),
    );
    expect(noPrune).not.toContain('DELETE FROM embeddings');

    jest.clearAllMocks();
    execute.mockResolvedValue([]);
    await service.run({ prune: true });
    const pruned = JSON.stringify(
      execute.mock.calls.map((c) => (c as unknown[])[0] as string),
    );
    expect(pruned).toContain('DELETE FROM embeddings');
  });
});
