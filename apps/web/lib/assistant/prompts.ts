export const SUGGESTED_PROMPTS = [
  {
    id: "review-trades",
    label: "Review today's trades",
    icon: "📊",
    prompt: "Review my trades from today and identify patterns",
  },
  {
    id: "analyze-journal",
    label: "Analyze my journal",
    icon: "📝",
    prompt: "Analyze my recent journal entries for insights",
  },
  {
    id: "explain-drawdown",
    label: "Explain my drawdown",
    icon: "📉",
    prompt: "Help me understand my recent drawdown",
  },
  {
    id: "find-mistakes",
    label: "Find recurring mistakes",
    icon: "🔍",
    prompt: "What mistakes do I keep making?",
  },
  {
    id: "research-stock",
    label: "Research a stock",
    icon: "💹",
    prompt: "Research",
  },
] as const;

export type SuggestedPromptId = (typeof SUGGESTED_PROMPTS)[number]["id"];
