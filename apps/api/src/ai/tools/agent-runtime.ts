import { Injectable, Logger } from '@nestjs/common';
import {
  AIClient,
  ChatMessage,
  ToolDefinition,
  ProviderContext,
} from '../ai-client';
import { Planner } from './planner';
import { ToolExecutor } from './tool-executor';
import { ConversationState } from './conversation-state';
import { ToolLifecycleStatus } from './tool-lifecycle';
import type { WorkspaceAction } from '../context/context-provider';

export interface AgentHandlers {
  onToken: (token: string) => void;
  onToolStatus: (event: ToolStatusEvent) => void;
  onDone: () => void;
  onUsage?: (usage: { promptTokens: number; completionTokens: number }) => void;
}

export interface ToolStatusEvent {
  id: string;
  name: string;
  status: ToolLifecycleStatus;
  args?: Record<string, unknown>;
  result?: string;
  success?: boolean;
  latencyMs?: number;
  suggestedActions?: WorkspaceAction[];
}

export interface AgentRunOptions {
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
  systemPrompt?: string;
  tools?: ToolDefinition[];
  providerContext?: ProviderContext;
}

@Injectable()
export class AgentRuntime {
  private readonly logger = new Logger(AgentRuntime.name);
  private readonly maxIterations = 5;

  constructor(
    private readonly aiClient: AIClient,
    private readonly planner: Planner,
    private readonly executor: ToolExecutor,
  ) {}

  async run(
    userId: string,
    seedMessages: ChatMessage[],
    options: AgentRunOptions,
    handlers: AgentHandlers,
  ): Promise<void> {
    const state = new ConversationState(seedMessages);
    if (options.systemPrompt) {
      state.add({ role: 'system', content: options.systemPrompt });
    }

    const tools = options.tools ?? [];
    let promptTokens = 0;
    let completionTokens = 0;

    for (
      state.iteration = 1;
      state.iteration <= this.maxIterations;
      state.iteration++
    ) {
      if (options.signal?.aborted) return;

      const response = await this.aiClient.complete(state.messages, {
        model: options.model,
        temperature: options.temperature ?? 0.4,
        tools,
        signal: options.signal,
        providerContext: options.providerContext,
      });

      promptTokens += response.usage.prompt_tokens;
      completionTokens += response.usage.completion_tokens;

      if (response.tool_calls && response.tool_calls.length > 0) {
        state.add({
          role: 'assistant',
          content: response.content,
          tool_calls: response.tool_calls,
        });

        for (const call of response.tool_calls) {
          const args = this.parseArgs(call.function.arguments);
          handlers.onToolStatus({
            id: call.id,
            name: call.function.name,
            status: ToolLifecycleStatus.STARTED,
            args,
          });

          const result = await this.executor.run(call, userId);

          handlers.onToolStatus({
            id: call.id,
            name: call.function.name,
            status: result.success
              ? ToolLifecycleStatus.COMPLETED
              : ToolLifecycleStatus.FAILED,
            result: result.content,
            success: result.success,
            latencyMs: result.metadata.latencyMs,
            suggestedActions: result.suggestedActions,
          });

          state.recordTool({
            id: call.id,
            name: call.function.name,
            args,
            success: result.success,
            latencyMs: result.metadata.latencyMs,
          });

          state.add({
            role: 'tool',
            tool_call_id: call.id,
            name: call.function.name,
            content: result.content,
          });
        }
        continue;
      }

      // No tool calls — final answer. Stream it token-by-token as a fallback,
      // but complete() returned it whole; emit as a single token stream.
      const content = response.content;
      if (content) {
        for (const token of this.chunkForStream(content)) {
          handlers.onToken(token);
        }
      }
      handlers.onUsage?.({ promptTokens, completionTokens });
      handlers.onDone();
      return;
    }

    handlers.onUsage?.({ promptTokens, completionTokens });
    handlers.onToken(
      '\n\n_[Stopped: reached maximum reasoning steps. The answer may be incomplete.]_',
    );
    handlers.onDone();
  }

  private parseArgs(raw: string): Record<string, unknown> {
    try {
      return JSON.parse(raw || '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private chunkForStream(content: string): string[] {
    // ponytail: coarse chunking so the UI streams progressively without re-calling the model
    const parts = content.match(/.{1,24}(\s|$)/g);
    return parts ?? [content];
  }
}
