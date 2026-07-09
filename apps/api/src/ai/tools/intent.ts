// Maps a slash-command / intent name to the set of tools the planner may use.
// Keeps tool names out of the UI so renaming a tool is not a breaking UI change.
export const INTENT_TOOLS: Record<string, string[]> = {
  review: ['get_analytics', 'search_trades', 'get_portfolio'],
  research: ['search_research', 'search_trades'],
  portfolio: ['get_portfolio', 'get_analytics'],
  explain: ['search_trades'],
  default: [
    'get_analytics',
    'search_trades',
    'get_portfolio',
    'search_research',
  ],
};

export function toolsForIntent(intent?: string): string[] {
  if (!intent) return INTENT_TOOLS.default;
  return INTENT_TOOLS[intent] ?? INTENT_TOOLS.default;
}
