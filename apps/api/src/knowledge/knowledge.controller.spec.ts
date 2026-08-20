import { BadRequestException } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import type { KnowledgeService } from './knowledge.service';

describe('KnowledgeController uploadAsset', () => {
  let controller: KnowledgeController;
  const service = {
    uploadAsset: jest.fn().mockResolvedValue({ id: 'asset1' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new KnowledgeController(
      service as unknown as KnowledgeService,
    );
  });

  it('throws BadRequestException when no file provided', async () => {
    await expect(
      controller.uploadAsset(
        'u1',
        'doc1',
        undefined as unknown as Express.Multer.File,
        'file',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(service.uploadAsset).not.toHaveBeenCalled();
  });

  it('delegates to service when a file is provided', async () => {
    const file = { buffer: Buffer.from('x'), mimetype: 'text/plain', size: 1 };
    await expect(
      controller.uploadAsset(
        'u1',
        'doc1',
        file as unknown as Express.Multer.File,
        'file',
      ),
    ).resolves.toEqual({ id: 'asset1' });
    expect(service.uploadAsset).toHaveBeenCalledWith(
      'u1',
      'doc1',
      file,
      'file',
    );
  });
});
