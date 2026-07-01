import type { SectionId } from "./section-types";

export type PresetName = "default" | "compact" | "analytics" | "journal";

export interface SectionLayout {
  id: SectionId;
  visible: boolean;
  column: "left" | "right";
  order: number;
}

export interface DashboardLayout {
  sections: SectionLayout[];
  preset?: string;
}

export const DEFAULT_SECTIONS: SectionLayout[] = [
  { id: "equity-curve", visible: true, column: "left", order: 0 },
  { id: "daily-summary", visible: true, column: "right", order: 0 },
  { id: "recent-trades", visible: true, column: "left", order: 1 },
  { id: "journal-snapshot", visible: true, column: "right", order: 1 },
  { id: "behavior-analytics", visible: true, column: "right", order: 2 },
  { id: "heatmap", visible: true, column: "left", order: 2 },
  { id: "market-news", visible: true, column: "right", order: 3 },
  { id: "ai-coach", visible: true, column: "right", order: 4 },
];

const COMPACT_SECTIONS: SectionLayout[] = [
  { id: "equity-curve", visible: true, column: "left", order: 0 },
  { id: "daily-summary", visible: true, column: "right", order: 0 },
  { id: "recent-trades", visible: true, column: "left", order: 1 },
  { id: "journal-snapshot", visible: true, column: "right", order: 1 },
  { id: "behavior-analytics", visible: true, column: "right", order: 2 },
  { id: "heatmap", visible: false, column: "left", order: 2 },
  { id: "market-news", visible: false, column: "right", order: 3 },
  { id: "ai-coach", visible: false, column: "right", order: 4 },
];

const ANALYTICS_SECTIONS: SectionLayout[] = [
  { id: "equity-curve", visible: true, column: "left", order: 0 },
  { id: "daily-summary", visible: true, column: "right", order: 0 },
  { id: "recent-trades", visible: true, column: "left", order: 1 },
  { id: "journal-snapshot", visible: false, column: "right", order: 1 },
  { id: "behavior-analytics", visible: true, column: "right", order: 2 },
  { id: "heatmap", visible: true, column: "left", order: 2 },
  { id: "market-news", visible: false, column: "right", order: 3 },
  { id: "ai-coach", visible: false, column: "right", order: 4 },
];

const JOURNAL_SECTIONS: SectionLayout[] = [
  { id: "equity-curve", visible: false, column: "left", order: 0 },
  { id: "daily-summary", visible: true, column: "right", order: 0 },
  { id: "recent-trades", visible: true, column: "left", order: 1 },
  { id: "journal-snapshot", visible: true, column: "left", order: 2 },
  { id: "behavior-analytics", visible: true, column: "right", order: 1 },
  { id: "heatmap", visible: false, column: "left", order: 3 },
  { id: "market-news", visible: true, column: "right", order: 2 },
  { id: "ai-coach", visible: true, column: "right", order: 3 },
];

export const SECTION_PRESETS: Record<PresetName, SectionLayout[]> = {
  default: DEFAULT_SECTIONS,
  compact: COMPACT_SECTIONS,
  analytics: ANALYTICS_SECTIONS,
  journal: JOURNAL_SECTIONS,
};

export const PRESET_LABELS: Record<PresetName, string> = {
  default: "Default",
  compact: "Compact",
  analytics: "Analytics",
  journal: "Journal",
};

/** @deprecated Use SectionId from section-types.ts */
export type WidgetId = SectionId;

/** @deprecated Use section preference height instead */
export type WidgetSize = "S" | "M" | "L";

/** @deprecated Use SectionLayout */
export interface LayoutWidget {
  id: WidgetId;
  visible: boolean;
  size: WidgetSize;
  column: 0 | 1;
  order: number;
}

/** @deprecated Use section definitions from section-types.ts */
export const WIDGET_TITLES: Record<WidgetId, string> = {
  "equity-curve": "Equity Curve",
  "daily-summary": "Daily Summary",
  "recent-trades": "Recent Trades",
  "journal-snapshot": "Journal",
  "behavior-analytics": "Behavior Analytics",
  heatmap: "Trading Heatmap",
  "ai-coach": "AI Coach",
  "market-news": "Market News",
};

/** @deprecated Use section-based rendering */
export const WIDGET_COLORS: Record<WidgetId, string> = {
  "equity-curve": "var(--accent-profit)",
  "daily-summary": "var(--accent)",
  "recent-trades": "var(--accent)",
  "journal-snapshot": "var(--accent-insight)",
  "behavior-analytics": "var(--accent)",
  heatmap: "var(--accent)",
  "ai-coach": "var(--accent-insight)",
  "market-news": "var(--accent-warn)",
};
