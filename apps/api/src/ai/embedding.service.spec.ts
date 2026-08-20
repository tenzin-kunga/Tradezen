import { EmbeddingService } from './embedding.service';
import { UserSettingsService } from '../user-settings/user-settings.service';

jest.mock('../db/drizzle', () => ({
  db: { insert: jest.fn(), execute: jest.fn() },
}));

let fetchMock: jest.Mock = jest.fn();

describe('EmbeddingService embeddingModel', () => {
  const original = process.env.EMBEDDING_MODEL;

  afterEach(() => {
    if (original === undefined) delete process.env.EMBEDDING_MODEL;
    else process.env.EMBEDDING_MODEL = original;
    jest.clearAllMocks();
  });

  const setup = (model?: string) => {
    if (model === undefined) delete process.env.EMBEDDING_MODEL;
    else process.env.EMBEDDING_MODEL = model;
    const userSettings = {
      getDecryptedApiKey: jest
        .fn()
        .mockResolvedValue({ key: 'secret', provider: 'cloud' }),
    } as unknown as UserSettingsService;
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ embedding: [1, 2, 3] }] }),
    });
    globalThis.fetch = fetchMock;
    return new EmbeddingService(userSettings);
  };

  const requestBody = () =>
    (fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1];

  const requestedModel = () =>
    (JSON.parse(requestBody().body) as { model: string }).model;

  it('uses default model when env unset', async () => {
    const service = setup();

    await service.generateEmbedding('u1', 'hello');

    expect(requestedModel()).toBe('openai/text-embedding-3-small');
  });

  it('uses EMBEDDING_MODEL when set', async () => {
    const service = setup('openai/text-embedding-3-large');

    await service.generateEmbedding('u1', 'hello');

    expect(requestedModel()).toBe('openai/text-embedding-3-large');
  });

  it('falls back to default when env is empty', async () => {
    const service = setup('');

    await service.generateEmbedding('u1', 'hello');

    expect(requestedModel()).toBe('openai/text-embedding-3-small');
  });

  it('throws when user has no API key', async () => {
    const userSettings = {
      getDecryptedApiKey: jest.fn().mockResolvedValue(null),
    } as unknown as UserSettingsService;
    const service = new EmbeddingService(userSettings);

    await expect(service.generateEmbedding('u1', 'hello')).rejects.toThrow(
      'No API key configured for this user',
    );
  });
});
