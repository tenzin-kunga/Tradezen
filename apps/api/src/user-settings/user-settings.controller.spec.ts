import { HttpException } from '@nestjs/common';
import { UserSettingsController } from './user-settings.controller';

describe('UserSettingsController API key validation', () => {
  let controller: UserSettingsController;
  const service = {
    setApiKey: jest.fn().mockResolvedValue({ provider: 'openai' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UserSettingsController(service as any);
    (global as any).fetch = jest.fn();
  });

  const dto = (provider: string, apiKey: string) => ({ provider, apiKey });

  it('validateApiKey returns valid for a valid key', async () => {
    (global as any).fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 'a' }, { id: 'b' }] }),
    });

    const result = await controller.validateApiKey('u1', dto('openai', 'k'));

    expect(result).toEqual({ valid: true, modelCount: 2 });
  });

  it('validateApiKey returns 400 for an invalid key', async () => {
    (global as any).fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    await expect(
      controller.validateApiKey('u1', dto('openai', 'bad')),
    ).rejects.toThrow(new HttpException('Invalid API key', 400));
  });

  it('validateApiKey returns 400 for an unsupported provider', async () => {
    await expect(
      controller.validateApiKey('u1', dto('unknown', 'k')),
    ).rejects.toThrow(new HttpException('Unsupported provider: unknown', 400));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('validateApiKey uses x-api-key header for anthropic', async () => {
    (global as any).fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    await controller.validateApiKey('u1', dto('anthropic', 'k'));

    const [, init] = (global as any).fetch.mock.calls[0];
    expect(init.headers).toEqual({ 'x-api-key': 'k' });
  });

  it('setApiKey validates then stores when key is valid', async () => {
    (global as any).fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 'a' }] }),
    });

    const result = await controller.setApiKey('u1', dto('openai', 'k'));

    expect(service.setApiKey).toHaveBeenCalledWith(
      'u1',
      'k',
      'openai',
      true,
      undefined,
      undefined,
    );
    expect(result).toEqual({ provider: 'openai', modelCount: 1 });
  });

  it('setApiKey does not store when key is invalid', async () => {
    (global as any).fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    await expect(
      controller.setApiKey('u1', dto('openai', 'bad')),
    ).rejects.toThrow(new HttpException('Invalid API key', 400));
    expect(service.setApiKey).not.toHaveBeenCalled();
  });

  it('setApiKey returns 400 for unsupported provider', async () => {
    await expect(
      controller.setApiKey('u1', dto('unknown', 'k')),
    ).rejects.toThrow(new HttpException('Unsupported provider: unknown', 400));
    expect(service.setApiKey).not.toHaveBeenCalled();
  });
});
