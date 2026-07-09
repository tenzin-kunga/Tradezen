import { ConversationPersistenceService } from './conversation-persistence.service';
import type { ConversationStore } from './conversation-store';
import type { ToolStatusEvent } from '../../ai/tools/agent-runtime';
import { ToolLifecycleStatus } from '../../ai/tools/tool-lifecycle';

function fakeStore() {
  const calls: string[] = [];
  const store: ConversationStore = {
    append: jest.fn((threadId: string, role: string) => {
      calls.push(role);
      return Promise.resolve();
    }),
    load: jest.fn(),
  };
  return { store, calls };
}

describe('ConversationPersistenceService', () => {
  it('persists user and assistant messages', async () => {
    const { store, calls } = fakeStore();
    const svc = new ConversationPersistenceService(store);
    await svc.persistUser('t1', 'hi');
    await svc.persistAssistant('t1', 'answer');
    expect(calls).toEqual(['user', 'assistant']);
  });

  it('persists tool call (started) and tool result (completed)', async () => {
    const { store, calls } = fakeStore();
    const svc = new ConversationPersistenceService(store);
    const started: ToolStatusEvent = {
      id: 'c1',
      name: 'get_analytics',
      status: ToolLifecycleStatus.STARTED,
      args: { x: 1 },
    };
    const done: ToolStatusEvent = {
      id: 'c1',
      name: 'get_analytics',
      status: ToolLifecycleStatus.COMPLETED,
      result: '{"winRate":63}',
      success: true,
      latencyMs: 12,
    };
    await svc.persistToolCall('t1', started);
    await svc.persistToolResult('t1', done);
    expect(calls).toEqual(['assistant', 'tool']);
  });

  it('does not throw when the store fails (fire-and-forget)', async () => {
    const failingStore: ConversationStore = {
      append: jest.fn().mockRejectedValue(new Error('db down')),
      load: jest.fn(),
    };
    const svc = new ConversationPersistenceService(failingStore);
    await expect(svc.persistUser('t1', 'hi')).resolves.toBeUndefined();
  });
});
