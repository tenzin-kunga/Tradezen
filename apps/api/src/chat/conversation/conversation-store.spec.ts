import { ChatThreadStore } from './conversation-store';
import type { ChatThreadService } from '../chat-thread.service';

function fakeThreadService() {
  const appended: Array<{
    threadId: string;
    role: string;
    content: string;
    metadata?: Record<string, unknown>;
  }> = [];
  const rows = [
    {
      role: 'user',
      content: 'hi',
      metadata: null,
      createdAt: new Date('2026-01-01'),
    },
    {
      role: 'assistant',
      content: 'hello',
      metadata: { version: 1, type: 'message' },
      createdAt: new Date('2026-01-02'),
    },
  ];
  const addMessage = jest.fn(
    async (
      threadId: string,
      role: string,
      content: string,
      metadata?: Record<string, unknown>,
    ) => {
      appended.push({ threadId, role, content, metadata });
    },
  );
  const svc = {
    addMessage,
    getMessages: jest.fn(() => rows),
  } as unknown as ChatThreadService;
  return { svc, addMessage, appended, rows };
}

describe('ChatThreadStore', () => {
  it('appends via ChatThreadService.addMessage', async () => {
    const { svc, addMessage, appended } = fakeThreadService();
    const store = new ChatThreadStore(svc);
    await store.append('t1', 'user', 'hi', { version: 1 });
    expect(addMessage).toHaveBeenCalledWith('t1', 'user', 'hi', {
      version: 1,
    });
    expect(appended[0].threadId).toBe('t1');
  });

  it('loads rows mapped to StoredConversationRow with createdAt', async () => {
    const { svc, rows } = fakeThreadService();
    const store = new ChatThreadStore(svc);
    const loaded = await store.load('t1', 'u1', 30);
    expect(loaded).toHaveLength(2);
    expect(loaded[1].createdAt).toEqual(new Date('2026-01-02'));
    expect(loaded[1].metadata).toEqual(rows[1].metadata);
  });
});
