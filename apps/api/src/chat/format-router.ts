export type ResponseStyle =
  | 'conversational'
  | 'bullet_list'
  | 'numbered_guide'
  | 'comparison_table'
  | 'markdown_article'
  | 'code_first';

export function requiresStructuredOutput(style: ResponseStyle): boolean {
  return style !== 'conversational';
}

// Heuristic style detection from the generated text. Used for telemetry and an
// optional system-prompt nudge — never for model routing (generation always uses
// AI_MODEL). This is deliberately lightweight; it only needs to be roughly right.
export function detectStyle(text: string): ResponseStyle {
  const t = text.toLowerCase();
  if (
    /```/.test(text) &&
    /\b(code|function|script|snippet|endpoint)\b/.test(t)
  ) {
    return 'code_first';
  }
  if (
    /\|.*\|.*\n\|[\s:|-]+\|/.test(text) ||
    /\b(compare|vs\.?|comparison|difference between| versus )\b/.test(t)
  ) {
    return 'comparison_table';
  }
  if (/\b(step[s]?|guide|how to|tutorial|walkthrough)\b/.test(t)) {
    return 'numbered_guide';
  }
  if (
    /(^|\n)\s*([-*+])\s+/.test(text) ||
    /\b(checklist|bullets?|list of)\b/.test(t)
  ) {
    return 'bullet_list';
  }
  if (/^#{1,6}\s/m.test(text) && text.includes('\n\n')) {
    return 'markdown_article';
  }
  return 'conversational';
}

export function detectIntent(
  messages: { role: string; content: string }[],
): string | undefined {
  const last = [...messages].reverse().find((m) => m.role === 'user');
  if (!last) return undefined;
  const t = last.content.toLowerCase();
  if (/\b(checklist|pre-trade|preparation)\b/.test(t)) return 'checklist';
  if (/\b(compare|vs\.?|comparison)\b/.test(t)) return 'comparison';
  return undefined;
}
