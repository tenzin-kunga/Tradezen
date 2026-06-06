import type { RedisOptions } from 'ioredis';

export function getRedisConnection(): RedisOptions {
  const url = process.env.REDIS_URL;
  if (url) {
    const parsed = new URL(url);
    const isTls = parsed.protocol === 'rediss:';
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      ...(isTls ? { tls: {} } : {}),
    };
  }

  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  };
}
