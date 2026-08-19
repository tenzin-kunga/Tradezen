import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ChatMessage } from '../../ai/ai-client';
import type { ToolStatusEvent } from '../../ai/tools/agent-runtime';
import { ConversationSerializer } from './conversation-serializer';
import { ConversationStore } from './conversation-store';

@Injectable()
export class ConversationPersistenceService {
  private readonly logger = new Logger(ConversationPersistenceService.name);

  constructor(
    @Inject(ConversationStore)
    private readonly store: ConversationStore,
  ) {}

  async persistUser(threadId: string, content: string): Promise<void> {
    await this.safeAppend(
      this.store.append(
        threadId,
        'user',
        content,
        ConversationSerializer.serialize({ role: 'user', content }).metadata,
      ),
    );
  }

  async persistAssistant(threadId: string, content: string): Promise<void> {
    await this.safeAppend(
      this.store.append(
        threadId,
        'assistant',
        content,
        ConversationSerializer.serialize({ role: 'assistant', content })
          .metadata,
      ),
    );
  }

  async persistToolCall(
    threadId: string,
    event: ToolStatusEvent,
  ): Promise<void> {
    const msg: ChatMessage = {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: event.id,
          type: 'function',
          function: {
            name: event.name,
            arguments: JSON.stringify(event.args ?? {}),
          },
        },
      ],
    };
    await this.safeAppend(
      this.store.append(
        threadId,
        'assistant',
        JSON.stringify(event.args ?? {}),
        ConversationSerializer.serialize(msg).metadata,
      ),
    );
  }

  async persistToolResult(
    threadId: string,
    event: ToolStatusEvent,
  ): Promise<void> {
    const msg: ChatMessage = {
      role: 'tool',
      content: event.result ?? '',
      tool_call_id: event.id,
      name: event.name,
    };
    await this.safeAppend(
      this.store.append(
        threadId,
        'tool',
        event.result ?? '',
        ConversationSerializer.serialize(msg).metadata,
      ),
    );
  }

  private async safeAppend(p: Promise<void>): Promise<void> {
    // ponytail: persistence must never break the stream. Fire-and-forget with guard.
    try {
      await p;
    } catch (e) {
      this.logger.warn(`Conversation persistence failed: ${e}`);
    }
  }
}
