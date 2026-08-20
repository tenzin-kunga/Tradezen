import { HttpException } from '@nestjs/common';
import { UserSettingsController } from './user-settings.controller';
import type { UserSettingsService } from './user-settings.service';

const fetchMock = jest.fn();

describe('UserSettingsController API key validation', () => {
  let controller: UserSettingsController;
  const service = {
    setApiKey: jest.fn().mockResolvedValue({ provider: 'openai' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { fetch: unknown }).fetch = fetchMock;
    controller = new UserSettingsController(
      service as unknown as UserSettingsService,
    );
  });

  const dto = (provider: string, apiKey: string) => ({ provider, apiKey });

  it('validateApiKey returns valid for a valid key', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 'a' }, { id: 'b' }] }),
    });

    const result = await controller.validateApiKey('u1', dto('openai', 'k'));

    expect(result).toEqual({ valid: true, modelCount: 2 });
  });

  it('validateApiKey returns 400 for an invalid key', async () => {
    fetchMock.mockResolvedValue({
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

  it('validateApiKey validates a custom provider against its baseUrl', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 'a' }] }),
    });

    const result = await controller.validateApiKey('u1', {
      provider: 'custom',
      apiKey: 'k',
      baseUrl: 'https://integrate.api.nvidia.com/v1',
    });

    expect(result).toEqual({ valid: true, modelCount: 1 });
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(url).toBe('https://integrate.api.nvidia.com/v1/models');
    expect(init.headers).toEqual({ Authorization: 'Bearer k' });
  });

  it('validateApiKey requires baseUrl for custom providers', async () => {
    await expect(
      controller.validateApiKey('u1', dto('custom', 'k')),
    ).rejects.toThrow(
      new HttpException('baseUrl is required for custom providers', 400),
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('validateApiKey uses x-api-key header for anthropic', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    await controller.validateApiKey('u1', dto('anthropic', 'k'));

    const [, init] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(init.headers).toEqual({ 'x-api-key': 'k' });
  });

  it('setApiKey validates then stores when key is valid', async () => {
    fetchMock.mockResolvedValue({
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
    fetchMock.mockResolvedValue({
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
