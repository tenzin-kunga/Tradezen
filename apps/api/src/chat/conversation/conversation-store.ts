import { ChatThreadService } from '../chat-thread.service';
import type { StoredMessageRow } from './conversation-serializer';

export abstract class ConversationStore {
  abstract append(
    threadId: string,
    role: string,
    content: string,
    metadata: Record<string, unknown>,
  ): Promise<void>;
  abstract load(
    threadId: string,
    userId: string,
    limit: number,
  ): Promise<StoredConversationRow[]>;
}

export interface StoredConversationRow extends StoredMessageRow {
  createdAt?: Date | null;
}

export class ChatThreadStore implements ConversationStore {
  constructor(private readonly threadService: ChatThreadService) {}

  async append(
    threadId: string,
    role: string,
    content: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.threadService.addMessage(threadId, role, content, metadata);
  }

  async load(
    threadId: string,
    userId: string,
    limit: number,
  ): Promise<StoredConversationRow[]> {
    const rows = await this.threadService.getMessages(threadId, userId, limit);
    return rows.map((r) => ({
      role: r.role,
      content: r.content,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      createdAt: r.createdAt,
    }));
  }
}
