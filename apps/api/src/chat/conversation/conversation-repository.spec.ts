import { ConversationRepository } from './conversation-repository';
import type {
  ConversationStore,
  StoredConversationRow,
} from './conversation-store';
import { ConversationHistoryPolicy } from './conversation-history';

function fakeStore(rows: StoredConversationRow[]): ConversationStore {
  return {
    append: jest.fn(),
    // ponytail: store trims to limit (DB-side), mimicking ChatThreadService.getMessages
    load: jest.fn((_threadId: string, _userId: string, limit: number) =>
      Promise.resolve(rows.slice(-limit)),
    ),
  };
}

describe('ConversationRepository', () => {
  it('deserializes rows into messages and marks them historical', async () => {
    const rows: StoredConversationRow[] = [
      {
        role: 'user',
        content: 'win rate?',
        metadata: { version: 1, type: 'message' },
        createdAt: new Date(),
      },
      {
        role: 'assistant',
        content: '',
        metadata: {
          version: 1,
          type: 'tool_call',
          toolName: 'get_analytics',
          toolCallId: 'c1',
          args: {},
        },
        createdAt: new Date(),
      },
      {
        role: 'tool',
        content: '{"winRate":63}',
        metadata: {
          version: 1,
          type: 'tool_result',
          toolName: 'get_analytics',
          toolCallId: 'c1',
        },
        createdAt: new Date(),
      },
    ];
    const repo = new ConversationRepository(fakeStore(rows));
    const history = await repo.loadHistory(
      't1',
      'u1',
      new ConversationHistoryPolicy(),
    );

    expect(history.threadId).toBe('t1');
    expect(history.messages).toHaveLength(3);
    // tool result rehydrated as a tool role message, stamped historical
    const toolMsg = history.messages[2];
    expect(toolMsg.role).toBe('tool');
    expect((toolMsg as { historical?: boolean }).historical).toBe(true);
  });

  it('trims to policy.maxMessages', async () => {
    const rows: StoredConversationRow[] = Array.from(
      { length: 35 },
      (_, i) => ({
        role: 'user',
        content: `m${i}`,
        metadata: { version: 1, type: 'message' },
        createdAt: new Date(),
      }),
    );
    const policy = new ConversationHistoryPolicy();
    policy.maxMessages = 10;
    const repo = new ConversationRepository(fakeStore(rows));
    const history = await repo.loadHistory('t1', 'u1', policy);
    expect(history.messages).toHaveLength(10);
  });

  it('returns empty history when no rows', async () => {
    const repo = new ConversationRepository(fakeStore([]));
    const history = await repo.loadHistory(
      't1',
      'u1',
      new ConversationHistoryPolicy(),
    );
    expect(history.messages).toHaveLength(0);
    expect(history.lastUpdated).toBeNull();
  });
});
