import type { BuiltContext } from './context-provider';

// Base persona + answer-formatting contract applied to every chat turn so the
// model replies like a structured assistant (ChatGPT / Claude style) rather
// than a single wall of text.
export const BASE_ASSISTANT_PROMPT = `You are TradeZen Coach, an AI assistant for traders using the TradeZen carbon-ledger platform.

Answer clearly and in a well-structured way using Markdown:
- Open with a short, direct answer to the question.
- Use headings (## / ###) to separate topics and keep responses scannable.
- Use bullet or numbered lists for steps, options, and multi-part answers.
- Use **bold** for key figures, metrics, and takeaways.
- Use fenced code blocks for any code, formulas, or raw data.
- Use tables when comparing values or showing structured data.
- Keep paragraphs short. Avoid long unbroken blocks of text.
- Be precise with numbers, and state units (e.g. %, R, pips) explicitly.
- If the data needed to answer is missing, say so plainly and suggest what to provide.`;

export interface PromptResult {
  systemPrompt: string;
  blockCount: number;
  totalTokens: number;
}

export function buildSystemPrompt(
  context: BuiltContext | null,
  existingPrompt?: string,
): PromptResult {
  const sections: string[] = [BASE_ASSISTANT_PROMPT];

  if (existingPrompt) {
    sections.push('---');
    sections.push(existingPrompt);
  }

  if (context && context.blocks.length > 0) {
    sections.push('---');

    sections.push(
      'CONTEXTUAL DATA (auto-assembled, prioritize this when relevant):',
    );
    sections.push('');

    for (const block of context.blocks) {
      sections.push(`## ${block.title}`);
      sections.push(block.content);
      sections.push('');
    }

    if (context.warnings.length > 0) {
      sections.push(
        `[Note: ${context.warnings.length} context provider(s) had issues during assembly]`,
      );
    }
  }

  return {
    systemPrompt: sections.join('\n'),
    blockCount: context?.blocks.length ?? 0,
    totalTokens: context?.totalTokens ?? 0,
  };
}
