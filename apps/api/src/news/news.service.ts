import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import { getRedisConnection } from '../common/utils/redis-connection';
import { fetchCalendarEvents } from './calendar.mapper';
import type { EconomicEvent } from './news.types';

export interface MarketNewsEvent {
  id: string;
  title: string;
  lookupKey: string;
  country: string;
  currency: string;
  date: string;
  time: string;
  timestamp: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string;
  released: boolean;
}

const CACHE_TTL = 3600;

function getTodayKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `news:calendar:${y}-${m}-${d}`;
}

function normalizeNewsKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toDto(event: EconomicEvent): MarketNewsEvent {
  return {
    id: event.id,
    title: event.title,
    lookupKey: normalizeNewsKey(event.title),
    country: event.country,
    currency: event.currency,
    date: event.date,
    time: event.time,
    timestamp: event.timestamp,
    impact: event.impact,
    forecast: event.forecast,
    previous: event.previous,
    actual: event.actual,
    released: event.released,
  };
}

@Injectable()
export class NewsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('NewsService');
  private redis: Redis;
  private fetchPromise: Promise<MarketNewsEvent[]> | null = null;

  onModuleInit() {
    this.redis = new Redis(getRedisConnection());
    this.redis.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async getWeeklyNews(): Promise<MarketNewsEvent[]> {
    const cacheKey = getTodayKey();

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as MarketNewsEvent[];
        this.logger.log(`Cache hit: ${parsed.length} events (key=${cacheKey})`);
        if (parsed.length > 0) {
          return parsed;
        }
        this.logger.log('Cache has 0 events, refetching');
      } else {
        this.logger.log(`Cache miss (key=${cacheKey})`);
      }
    } catch (err) {
      this.logger.warn(`Redis read failed: ${(err as Error).message}`);
    }

    if (this.fetchPromise) {
      this.logger.log('Dedup: reusing in-flight fetch');
      return this.fetchPromise;
    }

    const utcNow = new Date();
    const y = utcNow.getUTCFullYear();
    const m = String(utcNow.getUTCMonth() + 1).padStart(2, '0');
    const d = String(utcNow.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    this.logger.log(`Starting calendar fetch for ${dateStr}`);
    this.fetchPromise = this.fetchAndCache(dateStr, cacheKey);
    try {
      return await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async fetchAndCache(
    dateStr: string,
    cacheKey: string,
  ): Promise<MarketNewsEvent[]> {
    try {
      const events = await fetchCalendarEvents();
      const dtos = events.map(toDto);

      try {
        await this.redis.set(cacheKey, JSON.stringify(dtos), 'EX', CACHE_TTL);
      } catch (err) {
        this.logger.warn(`Redis write failed: ${(err as Error).message}`);
      }

      return dtos;
    } catch (err) {
      this.logger.error(`Calendar fetch failed: ${(err as Error).message}`);
      return [];
    }
  }
}
