import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeEnrichmentService } from './knowledge-enrichment.service';
import { AssetsService } from '../assets/assets.service';
import { NotFoundException } from '@nestjs/common';

jest.mock('../db/drizzle', () => {
  const rows: Record<string, any[]> = {};
  const makeChain = () => {
    const c: any = {};
    const resolve = () => Promise.resolve(rows['__select__'] ?? []);
    c.from = () => c;
    c.where = () => c;
    c.orderBy = () => c;
    c.limit = () => c;
    c.offset = () => c;
    c.then = (res: any) => resolve().then(res);
    c.catch = (rej: any) => resolve().catch(rej);
    return c;
  };
  return {
    db: {
      select: jest.fn(() => makeChain()),
      insert: jest.fn(() => ({
        values: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([])),
        })),
      })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([])),
          })),
        })),
      })),
      delete: jest.fn(() => ({ where: jest.fn(() => Promise.resolve([])) })),
      __setRows: (r: any[]) => {
        rows['__select__'] = r;
      },
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { db } = require('../db/drizzle');

describe('KnowledgeService enrichment', () => {
  let service: KnowledgeService;
  const enrichment = {
    enrichDocument: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: KnowledgeEnrichmentService, useValue: enrichment },
        {
          provide: AssetsService,
          useValue: {
            upload: jest.fn().mockResolvedValue({
              providerKey: 'key',
              mimeType: 'text/plain',
              fileName: 'f',
              fileSize: 1,
            }),
            getUrl: jest.fn().mockReturnValue('https://example.com/k'),
          },
        },
      ],
    }).compile();
    service = module.get<KnowledgeService>(KnowledgeService);
  });

  it('dispatches enrichment on create with content', async () => {
    (db.insert as jest.Mock).mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([{ id: 'doc1', currentVersion: 1 }]),
      }),
    });

    await service.createDocument('u1', {
      title: 'Research',
      content: 'Some research content',
    });

    expect(enrichment.enrichDocument).toHaveBeenCalledWith(
      'u1',
      'doc1',
      'Some research content',
    );
  });

  it('does not dispatch enrichment on create without content', async () => {
    (db.insert as jest.Mock).mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([{ id: 'doc1', currentVersion: 1 }]),
      }),
    });

    await service.createDocument('u1', { title: 'Empty' });

    expect(enrichment.enrichDocument).not.toHaveBeenCalled();
  });

  it('dispatches enrichment on update when content actually changes', async () => {
    db.__setRows([{ id: 'doc1', currentVersion: 1, content: 'old content' }]);
    (db.insert as jest.Mock).mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([{ id: 'v1', version: 2 }]),
      }),
    });
    (db.update as jest.Mock).mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([{ id: 'doc1', currentVersion: 2 }]),
        }),
      }),
    });

    await service.updateDocument('u1', 'doc1', { content: 'new content' });

    expect(enrichment.enrichDocument).toHaveBeenCalledWith(
      'u1',
      'doc1',
      'new content',
    );
  });

  it('does not dispatch enrichment on update with title-only change', async () => {
    db.__setRows([{ id: 'doc1', currentVersion: 1, content: 'same content' }]);

    await service.updateDocument('u1', 'doc1', { title: 'Renamed' });

    expect(enrichment.enrichDocument).not.toHaveBeenCalled();
  });

  it('does not dispatch enrichment when updated content is unchanged', async () => {
    db.__setRows([{ id: 'doc1', currentVersion: 1, content: 'same content' }]);

    await service.updateDocument('u1', 'doc1', { content: 'same content' });

    expect(enrichment.enrichDocument).not.toHaveBeenCalled();
  });

  it('throws NotFoundException for missing document and does not enrich', async () => {
    db.__setRows([]);

    await expect(
      service.updateDocument('u1', 'missing', { title: 'x' }),
    ).rejects.toThrow(NotFoundException);
    expect(enrichment.enrichDocument).not.toHaveBeenCalled();
  });
});

describe('KnowledgeService delete authorization', () => {
  let service: KnowledgeService;
  const enrichment = { enrichDocument: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: KnowledgeEnrichmentService, useValue: enrichment },
        {
          provide: AssetsService,
          useValue: {
            upload: jest.fn(),
            getUrl: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get<KnowledgeService>(KnowledgeService);
  });

  it('throws NotFoundException when asset does not exist', async () => {
    db.__setRows([]);

    await expect(service.deleteAsset('u1', 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws NotFoundException when asset belongs to another user', async () => {
    db.__setRows([{ id: 'asset1', documentId: 'd-other' }]);
    const getDoc = jest
      .spyOn(service, 'getDocument')
      .mockResolvedValue(null as any);

    await expect(service.deleteAsset('u1', 'asset1')).rejects.toThrow(
      NotFoundException,
    );
    getDoc.mockRestore();
  });

  it('deletes asset when user owns the document', async () => {
    db.__setRows([{ id: 'asset1', documentId: 'd1' }]);
    const getDoc = jest
      .spyOn(service, 'getDocument')
      .mockResolvedValue({ id: 'd1' } as any);

    await service.deleteAsset('u1', 'asset1');

    expect(db.delete).toHaveBeenCalled();
    getDoc.mockRestore();
  });

  it('throws NotFoundException when link does not exist', async () => {
    db.__setRows([]);

    await expect(service.deleteLink('u1', 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws NotFoundException when link belongs to another user', async () => {
    db.__setRows([{ id: 'link1', sourceDocumentId: 'd-other' }]);
    const getDoc = jest
      .spyOn(service, 'getDocument')
      .mockResolvedValue(null as any);

    await expect(service.deleteLink('u1', 'link1')).rejects.toThrow(
      NotFoundException,
    );
    getDoc.mockRestore();
  });

  it('deletes link when user owns the source document', async () => {
    db.__setRows([{ id: 'link1', sourceDocumentId: 'd1' }]);
    const getDoc = jest
      .spyOn(service, 'getDocument')
      .mockResolvedValue({ id: 'd1' } as any);

    await service.deleteLink('u1', 'link1');

    expect(db.delete).toHaveBeenCalled();
    getDoc.mockRestore();
  });
});

describe('KnowledgeService search minimum query length', () => {
  let service: KnowledgeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: KnowledgeEnrichmentService, useValue: {} },
        { provide: AssetsService, useValue: {} },
      ],
    }).compile();
    service = module.get<KnowledgeService>(KnowledgeService);
  });

  it.each(['', ' ', 'a', 'a '])(
    'returns [] for query %j without DB hit',
    async (q) => {
      db.__setRows([{ id: 'doc1' }]);

      const result = await service.search('u1', q);

      expect(result).toEqual([]);
      expect(db.select).not.toHaveBeenCalled();
    },
  );

  it('executes search for 2+ char queries', async () => {
    db.__setRows([{ id: 'doc1', title: 'Matching doc' }]);

    const result = await service.search('u1', 'ab');

    expect(result).toHaveLength(1);
    expect(db.select).toHaveBeenCalled();
  });
});
