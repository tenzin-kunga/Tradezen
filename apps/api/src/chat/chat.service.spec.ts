import { ChatService } from './chat.service';
import { Logger } from '@nestjs/common';
import { ChatRole } from './dto/chat-message.dto';

const makeService = () =>
  new ChatService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

// Long plain prose (3+ paragraphs, no Markdown) so finalizeAssistant detects
// under-structured prose and forces the formatter.
const PROSE = [
  'The first paragraph explains market context. Trade with the higher timeframe trend rather than against it, and always mark the key supply and demand zones before you consider an entry of any kind.',
  'The second paragraph covers risk management. Size every position so a full stop out costs no more than two percent of the account, and place stops beyond structure rather than at arbitrary pip distances from entry.',
  'The third paragraph covers execution discipline. Wait for a clear trigger such as a break and retest, avoid the high impact news windows, and never average into a losing position without a written plan.',
].join('\n\n');

const FORMATTED = `## Overview\n\n${PROSE.split('\n\n')
  .map((p) => `- ${p}`)
  .join('\n')}`;

describe('ChatService models cache TTL', () => {
  const original = process.env.MODELS_CACHE_TTL_MS;

  afterEach(() => {
    if (original === undefined) delete process.env.MODELS_CACHE_TTL_MS;
    else process.env.MODELS_CACHE_TTL_MS = original;
  });

  it('defaults to 300000 when env unset', () => {
    delete process.env.MODELS_CACHE_TTL_MS;
    expect((makeService() as any).modelsCacheTtlMs).toBe(300000);
  });

  it('uses MODELS_CACHE_TTL_MS when set', () => {
    process.env.MODELS_CACHE_TTL_MS = '1000';
    expect((makeService() as any).modelsCacheTtlMs).toBe(1000);
  });

  it('falls back to default for non-numeric value', () => {
    process.env.MODELS_CACHE_TTL_MS = 'abc';
    expect((makeService() as any).modelsCacheTtlMs).toBe(300000);
  });

  it('allows 0 (cache disabled)', () => {
    process.env.MODELS_CACHE_TTL_MS = '0';
    expect((makeService() as any).modelsCacheTtlMs).toBe(0);
  });

  it('falls back to default for negative value', () => {
    process.env.MODELS_CACHE_TTL_MS = '-1';
    expect((makeService() as any).modelsCacheTtlMs).toBe(300000);
  });
});

describe('ChatService context-owned cutover (Slice 7)', () => {
  const original = process.env.RETRIEVAL_CLIENT_ENABLED;

  afterEach(() => {
    if (original === undefined) delete process.env.RETRIEVAL_CLIENT_ENABLED;
    else process.env.RETRIEVAL_CLIENT_ENABLED = original;
  });

  it('disables the cutover marker by default', () => {
    delete process.env.RETRIEVAL_CLIENT_ENABLED;
    expect((makeService() as any).contextOwnedEnabled).toBe(false);
  });

  it('enables the cutover marker when flag is on', () => {
    process.env.RETRIEVAL_CLIENT_ENABLED = 'true';
    expect((makeService() as any).contextOwnedEnabled).toBe(true);
  });
});

describe('ChatService response formatter (finalizeAssistant)', () => {
  const originalFormatModel = process.env.AI_FORMAT_MODEL;
  const originalModel = process.env.AI_MODEL;
  const originalPipeline = process.env.AI_FORMAT_PIPELINE;

  afterEach(() => {
    if (originalFormatModel === undefined) delete process.env.AI_FORMAT_MODEL;
    else process.env.AI_FORMAT_MODEL = originalFormatModel;
    if (originalModel === undefined) delete process.env.AI_MODEL;
    else process.env.AI_MODEL = originalModel;
    if (originalPipeline === undefined) delete process.env.AI_FORMAT_PIPELINE;
    else process.env.AI_FORMAT_PIPELINE = originalPipeline;
  });

  beforeEach(() => {
    process.env.AI_FORMAT_PIPELINE = '1';
  });

  const makeClient = (complete: any) => ({
    stream: jest.fn().mockImplementation(async function* () {
      yield PROSE;
    }),
    complete,
  });

  const runStreamChat = async (
    aiClient: any,
    persistence: any,
    userSettings: any,
    handlers: any,
  ) => {
    const service = new ChatService(
      aiClient,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      persistence,
      userSettings,
    );
    await service.streamChat(
      'user-1',
      {
        messages: [
          { role: ChatRole.USER, content: 'Explain trend following.' },
        ],
        threadId: 'thread-1',
      },
      undefined,
      handlers,
    );
  };

  const makePersistence = () => ({
    persistAssistant: jest.fn().mockResolvedValue(undefined),
    persistUser: jest.fn().mockResolvedValue(undefined),
  });

  const makeUserSettings = () => ({
    getDecryptedApiKey: jest.fn().mockResolvedValue({
      provider: 'openrouter',
      key: 'sk-test-secret',
      baseUrl: 'https://openrouter.ai/api/v1',
    }),
  });

  it('uses AI_FORMAT_MODEL when configured', async () => {
    process.env.AI_MODEL = 'default-model-x';
    process.env.AI_FORMAT_MODEL = 'formatter-model-x';
    const complete = jest.fn().mockResolvedValue({
      content: FORMATTED,
      model: 'formatter-model-x',
      usage: { prompt_tokens: 0, completion_tokens: 0 },
    });
    const handlers = { onToken: jest.fn(), onDone: jest.fn() };
    await runStreamChat(
      makeClient(complete),
      makePersistence(),
      makeUserSettings(),
      handlers,
    );
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][1].model).toBe('formatter-model-x');
  });

  it('falls back to defaultModel when AI_FORMAT_MODEL is unset', async () => {
    process.env.AI_MODEL = 'default-model-x';
    delete process.env.AI_FORMAT_MODEL;
    const complete = jest.fn().mockResolvedValue({
      content: FORMATTED,
      model: 'default-model-x',
      usage: { prompt_tokens: 0, completion_tokens: 0 },
    });
    const handlers = { onToken: jest.fn(), onDone: jest.fn() };
    await runStreamChat(
      makeClient(complete),
      makePersistence(),
      makeUserSettings(),
      handlers,
    );
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][1].model).toBe('default-model-x');
  });

  it('passes the user providerContext to the formatter', async () => {
    process.env.AI_MODEL = 'default-model-x';
    const complete = jest.fn().mockResolvedValue({
      content: FORMATTED,
      model: 'default-model-x',
      usage: { prompt_tokens: 0, completion_tokens: 0 },
    });
    const handlers = { onToken: jest.fn(), onDone: jest.fn() };
    await runStreamChat(
      makeClient(complete),
      makePersistence(),
      makeUserSettings(),
      handlers,
    );
    expect(complete.mock.calls[0][1].providerContext).toEqual({
      provider: 'openrouter',
      apiKey: 'sk-test-secret',
      baseUrl: 'https://openrouter.ai/api/v1',
    });
  });

  it('does not log provider credentials', async () => {
    process.env.AI_MODEL = 'default-model-x';
    const complete = jest.fn().mockResolvedValue({
      content: FORMATTED,
      model: 'default-model-x',
      usage: { prompt_tokens: 0, completion_tokens: 0 },
    });
    const debugSpy = jest.spyOn(Logger.prototype, 'debug');
    const logSpy = jest.spyOn(Logger.prototype, 'log');
    const warnSpy = jest.spyOn(Logger.prototype, 'warn');
    try {
      await runStreamChat(
        makeClient(complete),
        makePersistence(),
        makeUserSettings(),
        { onToken: jest.fn(), onDone: jest.fn() },
      );
    } finally {
      debugSpy.mockRestore();
      logSpy.mockRestore();
      warnSpy.mockRestore();
    }
    const captured = [
      ...debugSpy.mock.calls,
      ...logSpy.mock.calls,
      ...warnSpy.mock.calls,
    ]
      .map((c) => JSON.stringify(c))
      .join(' ');
    expect(captured).not.toContain('sk-test-secret');
  });

  it('persists and emits the reformatted reply via response_reformatted', async () => {
    process.env.AI_MODEL = 'default-model-x';
    const complete = jest.fn().mockResolvedValue({
      content: FORMATTED,
      model: 'default-model-x',
      usage: { prompt_tokens: 0, completion_tokens: 0 },
    });
    const persistence = makePersistence();
    const onReformatted = jest.fn();
    await runStreamChat(makeClient(complete), persistence, makeUserSettings(), {
      onToken: jest.fn(),
      onDone: jest.fn(),
      onResponseReformatted: onReformatted,
    });
    expect(onReformatted).toHaveBeenCalledTimes(1);
    expect(onReformatted).toHaveBeenCalledWith(FORMATTED);
    expect(persistence.persistAssistant).toHaveBeenCalledWith(
      'thread-1',
      FORMATTED,
    );
  });

  it('keeps the original response when the formatter throws', async () => {
    process.env.AI_MODEL = 'default-model-x';
    const complete = jest.fn().mockRejectedValue(new Error('formatter down'));
    const persistence = makePersistence();
    const onDone = jest.fn();
    await expect(
      runStreamChat(makeClient(complete), persistence, makeUserSettings(), {
        onToken: jest.fn(),
        onDone,
      }),
    ).resolves.toBeUndefined();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(persistence.persistAssistant).toHaveBeenCalledWith(
      'thread-1',
      PROSE,
    );
  });
});
