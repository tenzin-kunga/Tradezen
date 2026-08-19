import type { ChatMessage } from '../../ai/ai-client';

export interface ConversationHistory {
  threadId: string;
  messages: ChatMessage[];
  lastUpdated: Date | null;
  summary?: string;
  contextSnapshot?: unknown;
}

export class ConversationHistoryPolicy {
  maxMessages = 30;
  maxTokens?: number;
  maxToolResults?: number;
}
