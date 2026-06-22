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
}

export interface DashboardLayout {
  widgets: LayoutWidget[];
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: [
    { id: "equity-curve", visible: true, size: "M" },
    { id: "daily-summary", visible: true, size: "M" },
    { id: "recent-trades", visible: true, size: "M" },
    { id: "journal-snapshot", visible: true, size: "M" },
    { id: "behavior-analytics", visible: true, size: "M" },
    { id: "heatmap", visible: true, size: "M" },
    { id: "analytics-insights", visible: true, size: "M" },
    { id: "ai-coach", visible: true, size: "M" },
  ],
};
