import { ChatService } from './chat.service';

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
