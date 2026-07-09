import { ChatService } from './chat.service';
import type { AIClient } from '../ai/ai-client';
import type { ContextBuilderService } from '../ai/context/context-builder.service';
import type { AgentRuntime, ToolStatusEvent } from '../ai/tools/agent-runtime';
import type { ToolCatalog } from '../ai/tools/tool-catalog';
import type { ConversationRepository } from './conversation/conversation-repository';
import type { ConversationPersistenceService } from './conversation/conversation-persistence.service';
import { ToolLifecycleStatus } from '../ai/tools/tool-lifecycle';
import type { ChatMessage } from '../ai/ai-client';
import type { UserSettingsService } from '../user-settings/user-settings.service';

function buildService(
  overrides: {
    repoHistoryMessages?: ChatMessage[];
    toolEvents?: ToolStatusEvent[];
  } = {},
) {
  const aiClient = {} as AIClient;
  const contextBuilder = {
    buildContext: jest.fn(async () => ({
      blocks: [],
      totalTokens: 0,
      warnings: [],
      metadata: {},
    })),
  } as unknown as ContextBuilderService;

  let capturedSeed: ChatMessage[] = [];
  const agentRuntime = {
    run: jest.fn(
      async (
        userId: string,
        seedMessages: ChatMessage[],
        opts: any,
        handlers: any,
      ) => {
        capturedSeed = seedMessages;
        for (const ev of overrides.toolEvents ?? []) {
          handlers.onToolStatus(ev);
        }
        // Emit tokens so agentBuffer is populated
        handlers.onToken('analysis ');
        handlers.onToken('complete');
        handlers.onDone();
      },
    ),
  } as unknown as AgentRuntime;

  const toolCatalog = {
    getDefinitions: jest.fn(() => [
      {
        type: 'function',
        function: { name: 'get_portfolio', description: '', parameters: {} },
      },
    ]),
  } as unknown as ToolCatalog;

  const conversationRepo = {
    loadHistory: jest.fn(async () => ({
      threadId: 't1',
      messages: overrides.repoHistoryMessages ?? [],
      lastUpdated: null,
    })),
  } as unknown as ConversationRepository;

  const conversationPersistence = {
    persistUser: jest.fn(),
    persistAssistant: jest.fn(),
    persistToolCall: jest.fn(),
    persistToolResult: jest.fn(),
  } as unknown as ConversationPersistenceService;

  const userSettings = {
    getDecryptedApiKey: jest.fn(async () => null),
  } as unknown as UserSettingsService;

  const service = new ChatService(
    aiClient,
    contextBuilder,
    agentRuntime,
    toolCatalog,
    conversationRepo,
    conversationPersistence,
    userSettings,
  );
  return {
    service,
    capturedSeed: () => capturedSeed,
    conversationPersistence,
    agentRuntime,
  };
}

describe('ChatService conversation memory', () => {
  it('seeds the agent with rehydrated history incl. prior tool results', async () => {
    const priorUser: ChatMessage = {
      role: 'user',
      content: 'my pnl',
    };
    const priorTool: ChatMessage = {
      role: 'tool',
      content: '{"winRate":63}',
      tool_call_id: 'c1',
      name: 'get_analytics',
    };
    const { service, capturedSeed } = buildService({
      repoHistoryMessages: [priorUser, priorTool],
    });

    await service.streamChat(
      'u1',
      {
        messages: [{ role: 'user' as const, content: 'my pnl' }],
        intent: 'portfolio',
        threadId: 't1',
      } as any,
      undefined,
      { onToken: () => {}, onDone: () => {} },
    );

    const seed = capturedSeed();
    // prior tool result must be present so the model does not re-call the tool
    expect(seed.some((m) => m.role === 'tool' && m.tool_call_id === 'c1')).toBe(
      true,
    );
    // current user query must be present so the model answers the question
    expect(seed[seed.length - 1].role).toBe('user');
    expect(seed[seed.length - 1].content).toBe('my pnl');
  });

  it('persists user, tool call, tool result, and assistant across an agent run', async () => {
    const toolEvent: ToolStatusEvent = {
      id: 'c1',
      name: 'get_portfolio',
      status: ToolLifecycleStatus.STARTED,
      args: {},
    };
    const toolResult: ToolStatusEvent = {
      id: 'c1',
      name: 'get_portfolio',
      status: ToolLifecycleStatus.COMPLETED,
      result: '{"totalTrades":10}',
      success: true,
      latencyMs: 5,
    };
    const { service, conversationPersistence } = buildService({
      toolEvents: [toolEvent, toolResult],
    });

    const {
      persistUser,
      persistToolCall,
      persistToolResult,
      persistAssistant,
    } = conversationPersistence as any;

    await service.streamChat(
      'u1',
      {
        messages: [{ role: 'user' as const, content: 'summary' }],
        intent: 'portfolio',
        threadId: 't1',
      } as any,
      undefined,
      { onToken: () => {}, onDone: () => {} },
    );

    expect(persistUser).toHaveBeenCalledWith('t1', 'summary');
    expect(persistToolCall).toHaveBeenCalled();
    expect(persistToolResult).toHaveBeenCalled();
    expect(persistAssistant).toHaveBeenCalled();
  });

  it('persists plain chat user + assistant when no intent', async () => {
    const aiClient = {
      stream: async function* () {
        yield 'hello ';
        yield 'world';
      },
    } as unknown as AIClient;
    const contextBuilder = {} as ContextBuilderService;
    const agentRuntime = {} as AgentRuntime;
    const toolCatalog = {} as ToolCatalog;
    const conversationRepo = {} as ConversationRepository;
    const conversationPersistence = {
      persistUser: jest.fn(),
      persistAssistant: jest.fn(),
    } as unknown as ConversationPersistenceService;
    const userSettings = {
      getDecryptedApiKey: jest.fn(async () => null),
    } as unknown as UserSettingsService;
    const service = new ChatService(
      aiClient,
      contextBuilder,
      agentRuntime,
      toolCatalog,
      conversationRepo,
      conversationPersistence,
      userSettings,
    );

    const { persistUser, persistAssistant } = conversationPersistence as any;

    await service.streamChat(
      'u1',
      {
        messages: [{ role: 'user' as const, content: 'hi' }],
        threadId: 't1',
      } as any,
      undefined,
      { onToken: () => {}, onDone: () => {} },
    );

    expect(persistUser).toHaveBeenCalledWith('t1', 'hi');
    expect(persistAssistant).toHaveBeenCalledWith('t1', 'hello world');
  });
});
