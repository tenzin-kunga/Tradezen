export type WidgetId =
  | "equity-curve"
  | "daily-summary"
  | "recent-trades"
  | "journal-snapshot"
  | "behavior-analytics"
  | "heatmap"
  | "analytics-insights"
  | "ai-coach";

export type WidgetSize = "S" | "M" | "L";

export interface LayoutWidget {
  id: WidgetId;
  visible: boolean;
  size: WidgetSize;
  column: 0 | 1;
  order: number;
}

export interface DashboardLayout {
  widgets: LayoutWidget[];
}

export const WIDGET_TITLES: Record<WidgetId, string> = {
  "equity-curve": "Equity Curve",
  "daily-summary": "Daily Summary",
  "recent-trades": "Recent Trades",
  "journal-snapshot": "Journal",
  "behavior-analytics": "Behavior Analytics",
  "heatmap": "Trading Heatmap",
  "analytics-insights": "Insights",
  "ai-coach": "AI Coach",
};

export const WIDGET_COLORS: Record<WidgetId, string> = {
  "equity-curve": "rgb(34, 197, 94)",
  "daily-summary": "rgb(59, 130, 246)",
  "recent-trades": "rgba(255,255,255,0.15)",
  "journal-snapshot": "rgb(168, 85, 247)",
  "behavior-analytics": "rgb(249, 115, 22)",
  "heatmap": "rgb(234, 179, 8)",
  "analytics-insights": "rgb(6, 182, 212)",
  "ai-coach": "rgb(34, 197, 94)",
};

export const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: [
    { id: "equity-curve", visible: true, size: "M", column: 0, order: 0 },
    { id: "daily-summary", visible: true, size: "M", column: 1, order: 0 },
    { id: "recent-trades", visible: true, size: "M", column: 0, order: 1 },
    { id: "journal-snapshot", visible: true, size: "M", column: 1, order: 1 },
    { id: "behavior-analytics", visible: true, size: "M", column: 0, order: 2 },
    { id: "heatmap", visible: true, size: "M", column: 1, order: 2 },
    { id: "analytics-insights", visible: true, size: "M", column: 0, order: 3 },
    { id: "ai-coach", visible: true, size: "M", column: 1, order: 3 },
  ],
};
