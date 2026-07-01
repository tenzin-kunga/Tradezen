import type { MarketNewsEvent } from "@/lib/api";

export type EventStatus = "upcoming" | "live" | "released";

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
