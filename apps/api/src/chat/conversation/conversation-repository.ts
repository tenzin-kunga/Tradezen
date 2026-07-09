import { Inject, Injectable } from '@nestjs/common';
import type { ChatMessage } from '../../ai/ai-client';
import { ConversationSerializer } from './conversation-serializer';
import {
  ConversationHistory,
  ConversationHistoryPolicy,
} from './conversation-history';
import { ConversationStore } from './conversation-store';

@Injectable()
export class ConversationRepository {
  constructor(
    @Inject(ConversationStore)
    private readonly store: ConversationStore,
  ) {}

  async loadHistory(
    threadId: string,
    userId: string,
    policy = new ConversationHistoryPolicy(),
  ): Promise<ConversationHistory> {
    const rows = await this.store.load(threadId, userId, policy.maxMessages);

    const messages: ChatMessage[] = rows.map((row) =>
      // Replay safety: every rehydrated message is historical (audit log, not executable state).
      ConversationSerializer.deserialize(row, true),
    );

    const lastUpdated = rows.length
      ? new Date(rows[rows.length - 1].createdAt ?? Date.now())
      : null;

    return {
      threadId,
      messages,
      lastUpdated,
      summary: undefined,
      contextSnapshot: null,
    };
  }
}
