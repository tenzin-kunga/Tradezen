export type SectionId =
  | "equity-curve"
  | "daily-summary"
  | "recent-trades"
  | "journal-snapshot"
  | "behavior-analytics"
  | "heatmap"
  | "ai-coach"
  | "market-news";

export interface SectionDefinition {
  id: SectionId;
  title: string;
  question: string;
  priority: "critical" | "important" | "optional";
  defaultColumn: "left" | "right";
  preferredHeight: "sm" | "md" | "lg";
}

export const DASHBOARD_SECTIONS: SectionDefinition[] = [
  {
    id: "equity-curve",
    title: "Equity Curve",
    question: "What's my trajectory?",
    priority: "critical",
    defaultColumn: "left",
    preferredHeight: "lg",
  },
  {
    id: "daily-summary",
    title: "Today's Trading",
    question: "How did I trade today?",
    priority: "important",
    defaultColumn: "right",
    preferredHeight: "sm",
  },
  {
    id: "recent-trades",
    title: "Recent Activity",
    question: "What caused today's result?",
    priority: "critical",
    defaultColumn: "left",
    preferredHeight: "lg",
  },
  {
    id: "journal-snapshot",
    title: "Journal",
    question: "What did I learn?",
    priority: "important",
    defaultColumn: "right",
    preferredHeight: "md",
  },
  {
    id: "behavior-analytics",
    title: "Behavior",
    question: "Why did I trade this way?",
    priority: "important",
    defaultColumn: "right",
    preferredHeight: "md",
  },
  {
    id: "heatmap",
    title: "Trading Heatmap",
    question: "When am I most active?",
    priority: "optional",
    defaultColumn: "left",
    preferredHeight: "md",
  },
  {
    id: "ai-coach",
    title: "AI Coach",
    question: "What should I do next?",
    priority: "optional",
    defaultColumn: "right",
    preferredHeight: "md",
  },
  {
    id: "market-news",
    title: "Market News",
    question: "What's moving the market?",
    priority: "optional",
    defaultColumn: "right",
    preferredHeight: "lg",
  },
];

export function getSection(id: SectionId): SectionDefinition | undefined {
  return DASHBOARD_SECTIONS.find((s) => s.id === id);
}
