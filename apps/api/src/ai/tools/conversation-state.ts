import type { ChatMessage } from '../ai-client';

export interface ToolHistoryEntry {
  id: string;
  name: string;
  args: Record<string, unknown>;
  success: boolean;
  latencyMs: number;
}

export class ConversationState {
  readonly messages: ChatMessage[] = [];
  readonly toolHistory: ToolHistoryEntry[] = [];
  iteration = 0;

  constructor(seed: ChatMessage[] = []) {
    this.messages.push(...seed);
  }

  add(message: ChatMessage): void {
    this.messages.push(message);
  }

  recordTool(entry: ToolHistoryEntry): void {
    this.toolHistory.push(entry);
  }
}
