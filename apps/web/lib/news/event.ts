import type { MarketNewsEvent, EventStatus } from "./types";

export function getEventStatus(event: MarketNewsEvent): EventStatus {
  try {
    const ts = event.timestamp || event.date;
    const eventTime = new Date(ts).getTime();
    const now = Date.now();
    if (eventTime > now) return "upcoming";
    if (now - eventTime < 600000) return "live"; // 10-minute window
    return "released";
  } catch {
    return "released";
  }
}

export function isPastEvent(event: MarketNewsEvent): boolean {
  try {
    const ts = event.timestamp || event.date;
    return new Date(ts).getTime() < Date.now();
  } catch {
    return false;
  }
}

export function isSpeech(title: string): boolean {
  const lower = title.toLowerCase();
  return lower.includes("speaks") || lower.includes("speech");
}
