import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service';
import { CloudinaryProvider } from '../storage/cloudinary.provider';

jest.mock('../db/drizzle', () => ({
  db: {
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve([])),
      })),
    })),
    select: jest.fn(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({ where: jest.fn(() => Promise.resolve([])) })),
    })),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { db } = require('../db/drizzle');

describe('AssetsService', () => {
  let service: AssetsService;
  const storage = {
    upload: jest.fn(),
    delete: jest.fn(),
    getThumbnailUrl: jest.fn((k: string) => `thumb:${k}`),
    getOriginalUrl: jest.fn((k: string) => `orig:${k}`),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: CloudinaryProvider, useValue: storage },
      ],
    }).compile();
    service = module.get<AssetsService>(AssetsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('upload stores the asset with a sha256 hash and returns metadata', async () => {
    storage.upload.mockResolvedValue({
      providerKey: 'tradezen/research/x',
      version: 1,
      width: 0,
      height: 0,
      format: 'pdf',
      bytes: 10,
    });
    (db.insert as jest.Mock).mockReturnValue({
      values: () => ({
        returning: () =>
          Promise.resolve([
            {
              id: 'a1',
              provider: 'cloudinary',
              providerKey: 'tradezen/research/x',
              mimeType: 'application/pdf',
              fileName: 'r.pdf',
              fileSize: 10,
              sha256Hash: 'h',
              status: 'active',
              processingStatus: 'none',
              createdAt: new Date(),
            },
          ]),
      }),
    });

    const stored = await service.upload(
      {
        buffer: Buffer.from('hello'),
        mimetype: 'application/pdf',
        size: 10,
        originalname: 'r.pdf',
      },
      'u1',
    );

    expect(storage.upload).toHaveBeenCalled();
    expect(stored.id).toBe('a1');
    expect(stored.sha256Hash).toBeTruthy();
    expect(service.getUrl(stored, 'original')).toBe('orig:tradezen/research/x');
  });

  it('retryDeletions deletes storage and marks DELETED on success', async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: 'a1',
                provider: 'cloudinary',
                providerKey: 'k',
                mimeType: 'application/pdf',
                fileName: 'r.pdf',
                fileSize: 10,
                sha256Hash: 'h',
                status: 'deleting',
                processingStatus: 'none',
                createdAt: new Date(),
              },
            ]),
        }),
      }),
    });
    storage.delete.mockResolvedValue(undefined);

    const done = await service.retryDeletions();

    expect(done).toBe(1);
    expect(storage.delete).toHaveBeenCalledWith('k');
    expect(db.update).toHaveBeenCalled();
  });

  it('retryDeletions marks FAILED when storage delete throws', async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: 'a1',
                provider: 'cloudinary',
                providerKey: 'k',
                mimeType: 'application/pdf',
                fileName: 'r.pdf',
                fileSize: 10,
                sha256Hash: 'h',
                status: 'failed',
                processingStatus: 'none',
                createdAt: new Date(),
              },
            ]),
        }),
      }),
    });
    storage.delete.mockRejectedValue(new Error('boom'));

    const done = await service.retryDeletions();

    expect(done).toBe(0);
    expect(db.update).toHaveBeenCalled();
  });
});
