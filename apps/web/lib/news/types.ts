import type { MarketNewsEvent, Impact } from "@/lib/api";

export type { MarketNewsEvent, Impact };

export type EventStatus = "upcoming" | "live" | "released";

export interface ImpactColors {
  bar: string;
  bg: string;
  badge: string;
  glow: string;
}
