import { Test, TestingModule } from '@nestjs/testing';
import { ResearchService } from './research.service';
import { AssetsService } from '../assets/assets.service';
import { FormatterRegistry } from '../ai/context/semantic/formatters/registry';
import { ExtractorRegistry } from '../ai/context/semantic/extractors/registry';
import { ConflictException, NotFoundException } from '@nestjs/common';

jest.mock('../db/drizzle', () => {
  // Generic chainable mock: every builder method returns the same thenable chain
  // that resolves to the currently configured rows.
  const rows: Record<string, any[]> = { data: [] };
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

describe('ResearchService', () => {
  let service: ResearchService;
  const assetsService = {
    upload: jest.fn(),
    getUrl: jest.fn((_s: any, kind: string) =>
      kind === 'thumbnail' ? 'thumb' : 'orig',
    ),
    deleteStorageObject: jest.fn(),
  };

  const mockPipeline = {
    enqueue: jest.fn(),
    handleEvent: jest.fn(),
  };

  const formatterRegistry = new FormatterRegistry();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResearchService,
        { provide: AssetsService, useValue: assetsService },
        { provide: FormatterRegistry, useValue: formatterRegistry },
        { provide: 'EmbeddingPipeline', useValue: mockPipeline },
        { provide: ExtractorRegistry, useValue: new ExtractorRegistry() },
      ],
    }).compile();
    service = module.get<ResearchService>(ResearchService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws NotFoundException for a missing project', async () => {
    db.__setRows([]); // getProject select returns nothing
    await expect(service.getProject('u1', 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects notes update on optimistic-lock conflict', async () => {
    // getProject resolves a project...
    db.__setRows([
      {
        id: 'p1',
        userId: 'u1',
        symbolId: null,
        title: 'AAPL',
        status: 'idea',
        conviction: 'medium',
        ticker: null,
        exchange: null,
        symbolName: null,
        notes: null,
        checklist: null,
        tags: [],
      },
    ]);
    // ...then researchNotes select returns version 2
    db.__setRows([{ content: 'old', version: 2 }]);

    await expect(
      service.updateNotes('u1', 'p1', { content: 'new', base_version: 1 }),
    ).rejects.toThrow(ConflictException);
  });

  it('uploadAsset delegates to AssetsService after ownership check', async () => {
    db.__setRows([
      {
        id: 'p1',
        userId: 'u1',
        symbolId: null,
        title: 'AAPL',
        status: 'idea',
        conviction: 'medium',
        ticker: null,
        exchange: null,
        symbolName: null,
        notes: null,
        checklist: null,
        tags: [],
      },
    ]);
    assetsService.upload.mockResolvedValue({
      id: 'a1',
      fileName: 'report.pdf',
      providerKey: 'k',
      mimeType: 'application/pdf',
      fileSize: 100,
      status: 'active',
    });
    // researchAssets insert returns the link with createdAt
    (db.insert as jest.Mock).mockReturnValueOnce({
      values: () => ({
        returning: () =>
          Promise.resolve([{ createdAt: new Date('2026-01-01') }]),
      }),
    });

    const doc = await service.uploadAsset(
      'u1',
      'p1',
      {
        buffer: Buffer.from('x'),
        mimetype: 'application/pdf',
        size: 100,
        originalname: 'report.pdf',
      },
      'annual_report',
    );

    expect(assetsService.upload).toHaveBeenCalled();
    expect(doc.id).toBe('a1');
    expect(doc.category).toBe('annual_report');
    expect(doc.downloadUrl).toBe('orig');
  });

  it('deleteAsset marks DELETING and removes the link (async lifecycle)', async () => {
    db.__setRows([
      {
        id: 'p1',
        userId: 'u1',
        symbolId: null,
        title: 'AAPL',
        status: 'idea',
        conviction: 'medium',
        ticker: null,
        exchange: null,
        symbolName: null,
        notes: null,
        checklist: null,
        tags: [],
      },
    ]);
    // researchAssets select for the link
    (db.select as jest.Mock).mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ projectId: 'p1', assetId: 'a1' }]),
        }),
      }),
    });

    await service.deleteAsset('u1', 'p1', 'a1');

    // enqueueAssetDeletion updates assets.status -> 'deleting'
    expect(db.update).toHaveBeenCalled();
    expect(assetsService.deleteStorageObject).not.toHaveBeenCalled();
  });
});
