import { Logger } from '@nestjs/common';
import type { EconomicEvent } from './news.types';

const API_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const TIMEOUT_MS = 10000;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface RawCalendarEntry {
  title?: unknown;
  Name?: unknown;
  name?: unknown;
  country?: unknown;
  Currency?: unknown;
  currency?: unknown;
  impact?: unknown;
  Impact?: unknown;
  date?: unknown;
  Date?: unknown;
  actual?: unknown;
  Actual?: unknown;
  forecast?: unknown;
  Forecast?: unknown;
  previous?: unknown;
  Previous?: unknown;
}

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

export function mapEntry(raw: RawCalendarEntry): EconomicEvent {
  const title = str(raw.title ?? raw.Name ?? raw.name ?? 'Unknown');
  const country = str(raw.country ?? raw.Currency ?? '');
  const currency = str(raw.currency ?? '');
  const impact = str(
    raw.impact ?? raw.Impact ?? 'low',
  ).toLowerCase() as EconomicEvent['impact'];
  let date = str(raw.date ?? raw.Date ?? '');

  if (/^\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(date)) {
    date = date.replace(/(\d{4})\.(\d{2})\.(\d{2})\s+/, '$1-$2-$3T');
  }

  const actual = str(raw.actual ?? (raw.Actual != null ? raw.Actual : ''));
  const forecast = str(
    raw.forecast ?? (raw.Forecast != null ? raw.Forecast : ''),
  );
  const previous = str(
    raw.previous ?? (raw.Previous != null ? raw.Previous : ''),
  );

  let timestamp = '';
  let timeShort = '';
  try {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      timestamp = d.toISOString();
      timeShort = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  } catch {
    /* ignore */
  }

  const eventDate = date.slice(0, 10);

  return {
    id: `${country}-${normalizeTitle(title)}-${eventDate}`.replace(/\s+/g, '-'),
    title,
    country,
    currency,
    impact: impact === 'high' || impact === 'medium' ? impact : 'low',
    actual,
    forecast,
    previous,
    date: eventDate,
    time: timeShort,
    timestamp,
    provider: 'faireconomy',
    released: actual !== '' && actual !== '0',
  };
}

export async function fetchCalendarEvents(): Promise<EconomicEvent[]> {
  const logger = new Logger('CalendarFetcher');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      logger.error(`Calendar API returned ${res.status}`);
      return [];
    }

    const raw = (await res.json()) as RawCalendarEntry[];
    logger.log(`Fetched ${raw.length} raw events from calendar API`);

    const events = raw
      .map(mapEntry)
      .filter((e) => e.impact === 'high' || e.impact === 'medium')
      .sort(
        (a, b) =>
          new Date(a.timestamp || a.date).getTime() -
          new Date(b.timestamp || b.date).getTime(),
      );

    logger.log(`Filtered to ${events.length} high/medium events`);
    return events;
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('abort')) {
      logger.error('Calendar API fetch timed out');
    } else {
      logger.error(`Fetch failed: ${message}`);
    }
    return [];
  }
}
