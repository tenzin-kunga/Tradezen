import { BadRequestException } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';

describe('KnowledgeController uploadAsset', () => {
  let controller: KnowledgeController;
  const service = {
    uploadAsset: jest.fn().mockResolvedValue({ id: 'asset1' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new KnowledgeController(service as any);
  });

  it('throws BadRequestException when no file provided', async () => {
    await expect(
      controller.uploadAsset('u1', 'doc1', undefined as any, 'file'),
    ).rejects.toThrow(BadRequestException);
    expect(service.uploadAsset).not.toHaveBeenCalled();
  });

  it('delegates to service when a file is provided', async () => {
    const file = { buffer: Buffer.from('x'), mimetype: 'text/plain', size: 1 };
    await expect(
      controller.uploadAsset('u1', 'doc1', file as any, 'file'),
    ).resolves.toEqual({ id: 'asset1' });
    expect(service.uploadAsset).toHaveBeenCalledWith(
      'u1',
      'doc1',
      file,
      'file',
    );
  });
});
