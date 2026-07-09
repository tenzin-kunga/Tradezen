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

export function mapEntry(raw: any): EconomicEvent {
  const title = raw.title ?? raw.Name ?? raw.name ?? 'Unknown';
  const country = raw.country ?? raw.Currency ?? '';
  const currency = raw.currency ?? '';
  const impact = (
    raw.impact ??
    raw.Impact ??
    'low'
  ).toLowerCase() as EconomicEvent['impact'];
  let date = raw.date ?? raw.Date ?? '';

  if (/^\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(date)) {
    date = date.replace(/(\d{4})\.(\d{2})\.(\d{2})\s+/, '$1-$2-$3T');
  }

  const actual = raw.actual ?? (raw.Actual != null ? String(raw.Actual) : '');
  const forecast =
    raw.forecast ?? (raw.Forecast != null ? String(raw.Forecast) : '');
  const previous =
    raw.previous ?? (raw.Previous != null ? String(raw.Previous) : '');

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

    const raw = (await res.json()) as any[];
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
