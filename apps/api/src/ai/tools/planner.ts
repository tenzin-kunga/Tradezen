import type { ChatResponse } from '../ai-client';

export type PlanDecision =
  | { kind: 'execute_tool'; toolCalls: NonNullable<ChatResponse['tool_calls']> }
  | { kind: 'finish'; content: string }
  | { kind: 'max_iterations'; content: string };

export class Planner {
  constructor(private readonly maxIterations: number) {}

  decide(response: ChatResponse, iteration: number): PlanDecision {
    if (response.tool_calls && response.tool_calls.length > 0) {
      return { kind: 'execute_tool', toolCalls: response.tool_calls };
    }

    if (iteration >= this.maxIterations) {
      return {
        kind: 'max_iterations',
        content:
          response.content ||
          '[Stopped: reached maximum reasoning steps without a final answer.]',
      };
    }

    return { kind: 'finish', content: response.content };
  }
}
