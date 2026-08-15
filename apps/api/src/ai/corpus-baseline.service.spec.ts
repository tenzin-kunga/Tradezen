import { CorpusBaselineService } from './corpus-baseline.service';

const mkRow = (over: Record<string, unknown> = {}) => ({
  source_type: 'trade',
  source_id: 'src-1',
  id: 'src-1',
  ...over,
});

jest.mock('../db/drizzle', () => ({
  db: {
    execute: jest.fn(),
  },
}));

import { db } from '../db/drizzle';
const execute = db.execute as jest.Mock;

describe('CorpusBaselineService', () => {
  const service = new CorpusBaselineService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports missing, orphaned, and duplicate chunk rows', async () => {
    // Corpus stats: trade has 2 corpus rows, distinct 1
    execute
      .mockResolvedValueOnce([
        { source_type: 'trade', corpus_count: 2, distinct_sources: 1 },
      ])
      // duplicates: trade src-1 chunk 0 appears twice
      .mockResolvedValueOnce([
        { source_type: 'trade', source_id: 'src-1', chunk_index: 0, n: 2 },
      ])
      // corpus distinct sources
      .mockResolvedValueOnce([
        mkRow({ source_type: 'trade', source_id: 'src-1' }),
        mkRow({ source_type: 'trade', source_id: 'src-orphan' }),
      ]);

    // Source tables: trades has src-1 and src-2 (src-2 missing from corpus,
    // src-orphan is not a real trade)
    for (let i = 0; i < 7; i++) {
      execute.mockResolvedValueOnce(
        i === 0 ? [mkRow({ id: 'src-1' }), mkRow({ id: 'src-2' })] : [],
      );
    }

    const baseline = await service.validate('u1');

    const trade = baseline.perSource.find((s) => s.sourceType === 'trade')!;
    expect(trade.sourceCount).toBe(2);
    expect(trade.corpusCount).toBe(2);
    expect(trade.distinctSources).toBe(1);
    expect(trade.missing).toEqual(['src-2']);
    expect(trade.orphaned).toEqual(['src-orphan']);
    expect(trade.duplicateChunkRows).toBe(1);

    expect(baseline.totals.missing).toBe(1);
    expect(baseline.totals.orphaned).toBe(1);
    expect(baseline.totals.duplicateChunkRows).toBe(1);
    expect(baseline.userId).toBe('u1');
  });

  it('reports a clean baseline when corpus matches source data', async () => {
    execute
      .mockResolvedValueOnce([
        { source_type: 'trade', corpus_count: 1, distinct_sources: 1 },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        mkRow({ source_type: 'trade', source_id: 'src-1' }),
      ]);

    for (let i = 0; i < 7; i++) {
      execute.mockResolvedValueOnce(i === 0 ? [mkRow({ id: 'src-1' })] : []);
    }

    const baseline = await service.validate('u1');

    const trade = baseline.perSource.find((s) => s.sourceType === 'trade')!;
    expect(trade.missing).toEqual([]);
    expect(trade.orphaned).toEqual([]);
    expect(trade.duplicateChunkRows).toBe(0);
    expect(baseline.totals.missing + baseline.totals.orphaned).toBe(0);
  });
});
