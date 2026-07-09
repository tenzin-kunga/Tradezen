import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  RequestTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AIClient, ChatMessage, ProviderContext } from '../ai/ai-client';
import { AIServiceUnavailableError, AITimeoutError } from '../ai/ai-errors';
import { CreateChatDto } from './dto/create-chat.dto';
import { ContextBuilderService } from '../ai/context/context-builder.service';
import { buildSystemPrompt } from '../ai/context/prompt-builder';
import { AgentRuntime, ToolStatusEvent } from '../ai/tools/agent-runtime';
import { ToolCatalog } from '../ai/tools/tool-catalog';
import { toolsForIntent } from '../ai/tools/intent';
import { ChatRole } from './dto/chat-message.dto';
import { ConversationRepository } from './conversation/conversation-repository';
import { ConversationPersistenceService } from './conversation/conversation-persistence.service';
import { ConversationHistoryPolicy } from './conversation/conversation-history';
import { ToolLifecycleStatus } from '../ai/tools/tool-lifecycle';
import { UserSettingsService } from '../user-settings/user-settings.service';

interface AiServiceModel {
  id: string;
  displayName?: string;
  contextWindow?: number | null;
  category?: string;
  speed?: string;
  qualityScore?: number;
  recommended?: boolean;
  supportsSql?: boolean;
  supportsRag?: boolean;
  supportsCoaching?: boolean;
  supportsTools?: boolean;
  supportsVision?: boolean;
  supportsReasoning?: boolean;
}

interface AiServiceProvider {
  id: string;
  displayName: string;
  models: AiServiceModel[];
}

interface AiServiceModels {
  defaultModel: string;
  providers: AiServiceProvider[];
}

export interface ProviderHealth {
  id: string;
  status: string;
  latency: number | null;
  lastChecked: string | null;
  reason: string | null;
}

export interface ModelsPayload {
  defaultModel: string;
  models: string[];
  providers: Array<{
    id: string;
    name: string;
    baseUrl: string;
    models: AiServiceModel[];
  }>;
}

export type StreamHandlers = {
  onToken: (token: string) => void;
  onDone: () => void;
  onToolStatus?: (event: ToolStatusEvent) => void;
};

@Injectable()
export class ChatService {
  private readonly defaultModel = process.env.AI_MODEL ?? 'qwen3:latest';
  private readonly historyPolicy = new ConversationHistoryPolicy();
  private customProviders: Array<{
    id: string;
    name: string;
    baseUrl: string;
    apiKey?: string;
    models: string[];
  }> = [];

  constructor(
    private readonly aiClient: AIClient,
    private readonly contextBuilder: ContextBuilderService,
    private readonly agentRuntime: AgentRuntime,
    private readonly toolCatalog: ToolCatalog,
    private readonly conversationRepo: ConversationRepository,
    private readonly conversationPersistence: ConversationPersistenceService,
    private readonly userSettings: UserSettingsService,
  ) {}

  /**
   * Minimal hardcoded fallback used only when the AI service is unreachable
   * AND no cached catalog exists. The AI service is the source of truth; this
   * just guarantees the dropdown is never empty.
   */
  private getModelsFallback(): ModelsPayload {
    const models = [this.defaultModel];
    const providers: ModelsPayload['providers'] = this.customProviders.map(
      (p) => ({
        id: p.id,
        name: p.name,
        baseUrl: p.baseUrl,
        models: p.models.map((m) => ({ id: m })),
      }),
    );
    return { defaultModel: this.defaultModel, models, providers };
  }

  /**
   * Pulls the model catalog from the AI service (single source of truth) and
   * merges in any locally-registered custom providers. Results are cached so an
   * AI service restart or blip doesn't flicker the dropdown; the hardcoded
   * fallback is only used when there is no cached value at all.
   */
  async getModelsV2(): Promise<ModelsPayload> {
    const cached = this.getModelsCache();
    if (cached) return cached;

    try {
      const base =
        (process.env.AI_SERVICE_URL ?? 'http://localhost:8000') + '/v1';
      const key = process.env.AI_SERVICE_API_KEY ?? 'tradezen-internal';
      const res = await fetch(`${base}/models`, {
        headers: { 'x-internal-api-key': key },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`AI service returned ${res.status}`);
      const ai = (await res.json()) as AiServiceModels;

      const providers: ModelsPayload['providers'] = ai.providers.map((p) => ({
        id: p.id,
        name: p.displayName ?? p.id,
        baseUrl: '',
        models: p.models,
      }));
      const models = providers.flatMap((p) => p.models.map((m) => m.id));

      // Merge locally-registered custom providers (not known to the AI service).
      for (const cp of this.customProviders) {
        providers.push({
          id: cp.id,
          name: cp.name,
          baseUrl: cp.baseUrl,
          models: cp.models.map((m) => ({ id: m })),
        });
        models.push(...cp.models.map((m) => `${cp.id}/${m}`));
      }

      const payload: ModelsPayload = {
        defaultModel: ai.defaultModel ?? this.defaultModel,
        models,
        providers,
      };
      this.setModelsCache(payload);
      return payload;
    } catch {
      if (this.modelsCache) return this.modelsCache.data;
      return this.getModelsFallback();
    }
  }

  private modelsCache: { data: ModelsPayload; at: number } | null = null;
  private readonly modelsCacheTtlMs = 5 * 60 * 1000;

  private getModelsCache(): ModelsPayload | null {
    if (
      this.modelsCache &&
      Date.now() - this.modelsCache.at < this.modelsCacheTtlMs
    ) {
      return this.modelsCache.data;
    }
    return null;
  }

  private setModelsCache(data: ModelsPayload): void {
    this.modelsCache = { data, at: Date.now() };
  }

  /** Provider health status from the AI service (cached, no local cache). */
  async getProviderHealth(): Promise<ProviderHealth[]> {
    const base =
      (process.env.AI_SERVICE_URL ?? 'http://localhost:8000') + '/v1';
    const key = process.env.AI_SERVICE_API_KEY ?? 'tradezen-internal';
    const res = await fetch(`${base}/providers`, {
      headers: { 'x-internal-api-key': key },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`AI service returned ${res.status}`);
    return (await res.json()) as ProviderHealth[];
  }

  /** Force the AI service to re-discover models from all providers. */
  async refreshModels(): Promise<{ status: string; providers: string[] }> {
    const base =
      (process.env.AI_SERVICE_URL ?? 'http://localhost:8000') + '/v1';
    const key = process.env.AI_SERVICE_API_KEY ?? 'tradezen-internal';
    const res = await fetch(`${base}/models/refresh`, {
      method: 'POST',
      headers: { 'x-internal-api-key': key },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`AI service returned ${res.status}`);
    this.modelsCache = null; // drop local catalog cache
    return (await res.json()) as { status: string; providers: string[] };
  }

  addProvider(provider: {
    name: string;
    baseUrl: string;
    apiKey?: string;
    models: string[];
  }): { id: string } {
    const id = provider.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const existing = this.customProviders.find((p) => p.id === id);
    if (existing) {
      existing.baseUrl = provider.baseUrl;
      existing.apiKey = provider.apiKey;
      existing.models = provider.models;
      return { id };
    }
    this.customProviders.push({ id, ...provider });
    return { id };
  }

  removeProvider(id: string): boolean {
    const idx = this.customProviders.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.customProviders.splice(idx, 1);
    return true;
  }

  private async getProviderContext(userId: string): Promise<ProviderContext> {
    const result = await this.userSettings.getDecryptedApiKey(userId);
    if (result) {
      return { provider: result.provider, apiKey: result.key };
    }
    return {};
  }

  async streamChat(
    userId: string,
    dto: CreateChatDto,
    signal: AbortSignal | undefined,
    handlers: StreamHandlers,
  ) {
    if (dto.messages.length === 0) {
      throw new BadRequestException('At least one chat message is required');
    }

    let systemPrompt = dto.systemPrompt?.trim() ?? '';
    if (dto.contextRequest) {
      const lastUserMsg = [...dto.messages]
        .reverse()
        .find((m) => m.role === ChatRole.USER)?.content;

      const ctx = await this.contextBuilder.buildContext(
        userId,
        dto.contextRequest ?? {},
        lastUserMsg,
      );
      const { systemPrompt: assembled } = buildSystemPrompt(ctx, systemPrompt);
      systemPrompt = assembled;
    } else {
      // Always apply the base assistant prompt (persona + formatting).
      systemPrompt = buildSystemPrompt(null, systemPrompt).systemPrompt;
    }

    const currentMessages: ChatMessage[] = systemPrompt
      ? [
          { role: 'system', content: systemPrompt },
          ...dto.messages.map((m) => this.toChatMessage(m)),
        ]
      : dto.messages.map((m) => this.toChatMessage(m));

    const lastUser = [...dto.messages]
      .reverse()
      .find((m) => m.role === ChatRole.USER);
    if (dto.threadId && lastUser) {
      await this.conversationPersistence.persistUser(
        dto.threadId,
        lastUser.content,
      );
    }

    // Agent path: an intent scopes which tools the planner may invoke.
    if (dto.intent) {
      const allowed = new Set(toolsForIntent(dto.intent));
      const tools = this.toolCatalog
        .getDefinitions()
        .filter((t) => allowed.has(t.function.name));

      // Rehydrate prior turns (incl. tool results) so the model doesn't re-call tools.
      let seedMessages = currentMessages;
      if (dto.threadId) {
        const history = await this.conversationRepo.loadHistory(
          dto.threadId,
          userId,
          this.historyPolicy,
        );
        if (history.messages.length > 0) {
          // Keep prior turns, but guarantee the current user query is present.
          // persistUser() is fire-and-forget, so history may or may not already
          // include this turn — append it unless the last message is already it.
          const currentUser: ChatMessage | null = lastUser
            ? { role: 'user', content: lastUser.content }
            : null;
          const last = history.messages[history.messages.length - 1];
          seedMessages =
            currentUser &&
            last?.role === 'user' &&
            last.content === currentUser.content
              ? history.messages
              : currentUser
                ? [...history.messages, currentUser]
                : history.messages;
        }
      }

      const threadId = dto.threadId;
      let agentBuffer = '';
      try {
        const providerContext = await this.getProviderContext(userId);
        await this.agentRuntime.run(
          userId,
          seedMessages,
          {
            model: dto.model?.trim() || this.defaultModel,
            temperature: dto.temperature ?? 0.4,
            signal,
            systemPrompt,
            tools,
            providerContext,
          },
          {
            onToken: (token) => {
              agentBuffer += token;
              handlers.onToken(token);
            },
            onToolStatus: (event) => {
              if (threadId) {
                if (event.status === ToolLifecycleStatus.STARTED) {
                  void this.conversationPersistence.persistToolCall(
                    threadId,
                    event,
                  );
                } else {
                  void this.conversationPersistence.persistToolResult(
                    threadId,
                    event,
                  );
                }
              }
              handlers.onToolStatus?.(event);
            },
            onDone: () => {
              if (threadId && agentBuffer) {
                void this.conversationPersistence.persistAssistant(
                  threadId,
                  agentBuffer,
                );
              }
              handlers.onDone();
            },
          },
        );
      } catch (error) {
        throw this.mapError(error);
      }
      return;
    }

    // Plain streaming path (no tools).
    let assistantBuffer = '';
    try {
      const providerContext = await this.getProviderContext(userId);
      const stream = this.aiClient.stream(currentMessages, {
        model: dto.model?.trim() || this.defaultModel,
        temperature: dto.temperature ?? 0.4,
        signal,
        providerContext,
      });

      for await (const token of stream) {
        if (signal?.aborted) return;
        assistantBuffer += token;
        handlers.onToken(token);
      }
      if (dto.threadId) {
        await this.conversationPersistence.persistAssistant(
          dto.threadId,
          assistantBuffer,
        );
      }
      handlers.onDone();
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private toChatMessage(m: {
    role: ChatRole;
    content: string;
    tool_calls?: unknown[];
    tool_call_id?: string;
  }): ChatMessage {
    return {
      role: m.role,
      content: m.content,
      tool_calls: m.tool_calls as ChatMessage['tool_calls'],
      tool_call_id: m.tool_call_id,
    };
  }

  private mapError(error: unknown): Error {
    if (error instanceof AIServiceUnavailableError) {
      return new ServiceUnavailableException('AI service is unavailable');
    }
    if (error instanceof AITimeoutError) {
      return new RequestTimeoutException('AI service request timed out');
    }
    const msg = error instanceof Error ? error.message : String(error);
    return new InternalServerErrorException(`AI service error: ${msg}`);
  }
}
