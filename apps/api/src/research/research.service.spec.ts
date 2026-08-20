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
    const resolve = () => Promise.resolve(rows['__select__'] ?? []);
    const c: {
      from: () => typeof c;
      where: () => typeof c;
      orderBy: () => typeof c;
      limit: () => typeof c;
      offset: () => typeof c;
      then: <T>(res: (value: any[]) => T) => Promise<T>;
      catch: <T>(rej: (reason: unknown) => T) => Promise<T | any[]>;
    } = {
      from: () => c,
      where: () => c,
      orderBy: () => c,
      limit: () => c,
      offset: () => c,
      then: (res) => resolve().then(res),
      catch: (rej) => resolve().catch(rej),
    };
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

import { db } from '../db/drizzle';

const mockedDb = db as unknown as {
  __setRows: (rows: any[]) => void;
  insert: jest.Mock;
  select: jest.Mock;
  update: jest.Mock;
};

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
    mockedDb.__setRows([]); // getProject select returns nothing
    await expect(service.getProject('u1', 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects notes update on optimistic-lock conflict', async () => {
    // getProject resolves a project...
    mockedDb.__setRows([
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
    mockedDb.__setRows([{ content: 'old', version: 2 }]);

    await expect(
      service.updateNotes('u1', 'p1', { content: 'new', base_version: 1 }),
    ).rejects.toThrow(ConflictException);
  });

  it('uploadAsset delegates to AssetsService after ownership check', async () => {
    mockedDb.__setRows([
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
    mockedDb.insert.mockReturnValueOnce({
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
    mockedDb.__setRows([
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
    mockedDb.select.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ projectId: 'p1', assetId: 'a1' }]),
        }),
      }),
    });

    await service.deleteAsset('u1', 'p1', 'a1');

    // enqueueAssetDeletion updates assets.status -> 'deleting'
    expect(mockedDb.update).toHaveBeenCalled();
    expect(assetsService.deleteStorageObject).not.toHaveBeenCalled();
  });
});
