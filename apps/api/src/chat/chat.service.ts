import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
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
import { runFormattingPipeline } from './formatting-pipeline';
import type { FormattingResult } from './validators';
import { FORMATTER_PROMPT_V1 } from './formatting-prompts';
import { detectStyle, requiresStructuredOutput } from './format-router';

const DEFAULT_MODELS_CACHE_TTL_MS = 5 * 60 * 1000;

export function resolveModelsCacheTtlMs(envValue?: string): number {
  const parsed = parseInt(envValue ?? '', 10);
  if (Number.isNaN(parsed) || parsed < 0) return DEFAULT_MODELS_CACHE_TTL_MS;
  return parsed;
}

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
  onResponseReformatted?: (markdown: string) => void;
  onUsage?: (usage: { promptTokens: number; completionTokens: number }) => void;
};
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly defaultModel = process.env.AI_MODEL ?? 'qwen3:latest';
  private readonly historyPolicy = new ConversationHistoryPolicy();
  private readonly contextOwnedEnabled =
    (process.env.RETRIEVAL_CLIENT_ENABLED ?? 'false').toLowerCase() === 'true';
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
        models: p.models.map((m) => ({ id: `${p.id}/${m}` })),
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
  async getModelsV2(userId?: string, refresh = false): Promise<ModelsPayload> {
    if (!refresh) {
      const cached = this.getModelsCache();
      if (cached) return cached;
    }

    try {
      const base =
        (process.env.AI_SERVICE_URL ?? 'http://localhost:8000') + '/v1';
      const key = process.env.AI_SERVICE_API_KEY ?? 'tradezen-internal';

      // If user has a saved provider, forward it so AI service can discover its models.
      const providerHeaders: Record<string, string> = {};
      if (userId) {
        const ctx = await this.getProviderContext(userId);
        if (ctx.provider) {
          providerHeaders['x-ai-provider'] = ctx.provider;
        }
        if (ctx.apiKey) {
          providerHeaders['x-ai-provider-key'] = ctx.apiKey;
        }
        if (ctx.baseUrl) {
          providerHeaders['x-ai-provider-base-url'] = ctx.baseUrl;
        }
      }

      const res = await fetch(`${base}/models`, {
        headers: { 'x-internal-api-key': key, ...providerHeaders },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`AI service returned ${res.status}`);
      const ai = (await res.json()) as AiServiceModels;

      const providers: ModelsPayload['providers'] = [];
      const models: string[] = [];

      // Split cloud models into per-vendor groups by model ID prefix.
      // AI service returns all cloud models under a single "cloud" provider
      // with IDs like "openai/gpt-4o", "anthropic/claude-sonnet-4", etc.
      const VENDOR_NAMES: Record<string, string> = {
        openai: 'OpenAI',
        anthropic: 'Anthropic',
        google: 'Google',
        groq: 'Groq',
        mistral: 'Mistral',
        deepseek: 'DeepSeek',
        meta: 'Meta',
        qwen: 'Qwen',
        cohere: 'Cohere',
        xai: 'xAI',
        perplexity: 'Perplexity',
        fireworks: 'Fireworks',
        together: 'Together',
        nvidia: 'NVIDIA',
        alibaba: 'Alibaba',
        mistralai: 'Mistral AI',
        'meta llama': 'Meta',
      };

      for (const p of ai.providers) {
        if (p.id === 'cloud') {
          // Group by vendor prefix extracted from model ID
          const byVendor = new Map<string, AiServiceModel[]>();
          for (const m of p.models) {
            const parts = m.id.split('/');
            const vendor =
              parts.length > 1 ? parts[0].toLowerCase() : '_unclassified';
            if (!byVendor.has(vendor)) byVendor.set(vendor, []);
            byVendor.get(vendor)!.push(m);
          }
          for (const [vendor, vendorModels] of byVendor) {
            const vendorId = `cloud-${vendor}`;
            const displayName =
              VENDOR_NAMES[vendor] ??
              vendor.charAt(0).toUpperCase() + vendor.slice(1);
            providers.push({
              id: vendorId,
              name: displayName,
              baseUrl: '',
              models: vendorModels,
            });
            models.push(...vendorModels.map((m) => m.id));
          }
        } else {
          // Non-cloud providers (ollama, etc.) — keep as-is
          const mapped = {
            id: p.id,
            name: p.displayName ?? p.id,
            baseUrl: '',
            models: p.models,
          };
          providers.push(mapped);
          models.push(...mapped.models.map((m) => m.id));
        }
      }

      // Merge locally-registered custom providers (not known to the AI service).
      for (const cp of this.customProviders) {
        const prefixedModels = cp.models.map((m) => ({
          id: `${cp.id}/${m}`,
        }));
        providers.push({
          id: cp.id,
          name: cp.name,
          baseUrl: cp.baseUrl,
          models: prefixedModels,
        });
        models.push(...prefixedModels.map((m) => m.id));
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
  private readonly modelsCacheTtlMs = resolveModelsCacheTtlMs(
    process.env.MODELS_CACHE_TTL_MS,
  );

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

  async addProvider(provider: {
    name: string;
    baseUrl: string;
    apiKey?: string;
    models: string[];
  }): Promise<{ id: string; models: string[] }> {
    const id = provider.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    // Discover models from the provider's /v1/models endpoint
    let discoveredModels: string[] = [];
    if (provider.baseUrl && provider.apiKey) {
      try {
        const headers: Record<string, string> = {};
        // Anthropic uses x-api-key header
        if (id === 'anthropic') {
          headers['x-api-key'] = provider.apiKey;
        } else {
          headers['Authorization'] = `Bearer ${provider.apiKey}`;
        }
        const res = await fetch(`${provider.baseUrl}/models`, {
          headers,
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = (await res.json()) as { data?: Array<{ id: string }> };
          discoveredModels = (data.data ?? []).map((m) => m.id).filter(Boolean);
        }
      } catch {
        // If discovery fails, use provided models or empty
        discoveredModels = provider.models;
      }
    }

    // Fallback model IDs for known providers when discovery fails
    const DEFAULT_MODELS: Record<string, string[]> = {
      openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
      anthropic: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414'],
      google: ['gemini-2.5-pro', 'gemini-2.5-flash'],
      groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
      mistral: ['mistral-large-latest', 'mistral-small-latest'],
      deepseek: ['deepseek-chat', 'deepseek-reasoner'],
      openrouter: [],
      together: [],
      xai: ['grok-3', 'grok-3-mini'],
      perplexity: ['sonar-pro', 'sonar'],
      fireworks: [],
    };

    const models =
      discoveredModels.length > 0
        ? discoveredModels
        : (DEFAULT_MODELS[id] ?? provider.models);

    const existing = this.customProviders.find((p) => p.id === id);
    if (existing) {
      existing.baseUrl = provider.baseUrl;
      existing.apiKey = provider.apiKey;
      existing.models = models;
      this.modelsCache = null;
      return { id, models };
    }
    this.customProviders.push({ id, ...provider, models });
    this.modelsCache = null;
    return { id, models };
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
      return {
        provider: result.provider,
        apiKey: result.key,
        baseUrl: result.baseUrl,
      };
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
        { ...dto.contextRequest, intent: dto.intent },
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
              // Persist + format after run() returns so the reformatted event
              // is emitted before onDone (see finalizeAssistant).
            },
            onUsage: (usage) => handlers.onUsage?.(usage),
          },
        );
        await this.finalizeAssistant(threadId, agentBuffer, handlers);
        handlers.onDone();
      } catch (error) {
        throw this.mapError(error);
      }
      return;
    }

    // Plain streaming path (no tools).
    let assistantBuffer = '';
    try {
      const providerContext = await this.getProviderContext(userId);
      let usage: { promptTokens: number; completionTokens: number } | null =
        null;
      const stream = this.aiClient.stream(currentMessages, {
        model: dto.model?.trim() || this.defaultModel,
        temperature: dto.temperature ?? 0.4,
        signal,
        providerContext,
        contextOwned: this.contextOwnedEnabled && !!dto.contextRequest,
        onUsage: (u) => {
          usage = {
            promptTokens: u.prompt_tokens,
            completionTokens: u.completion_tokens,
          };
        },
      });

      for await (const token of stream) {
        if (signal?.aborted) return;
        assistantBuffer += token;
        handlers.onToken(token);
      }
      if (usage) handlers.onUsage?.(usage);
      await this.finalizeAssistant(dto.threadId, assistantBuffer, handlers);
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

  private async finalizeAssistant(
    threadId: string | undefined,
    buffer: string,
    handlers: StreamHandlers,
  ): Promise<void> {
    const pipelineEnabled = (process.env.AI_FORMAT_PIPELINE ?? '1') !== '0';
    if (!pipelineEnabled || !buffer.trim()) {
      if (threadId) {
        await this.conversationPersistence.persistAssistant(threadId, buffer);
      }
      return;
    }

    const formatterModel = process.env.AI_FORMAT_MODEL?.trim() || undefined;
    const formatter = formatterModel
      ? (text: string) =>
          this.aiClient
            .complete(
              [
                { role: 'system', content: FORMATTER_PROMPT_V1 },
                { role: 'user', content: text },
              ],
              { model: formatterModel, temperature: 0 },
            )
            .then((r) => r.content)
      : undefined;

    const style = detectStyle(buffer);
    let result: FormattingResult;
    try {
      result = await runFormattingPipeline(buffer, { formatter });
    } catch (err) {
      // ponytail: formatting failure must never block delivery or wipe the streamed reply
      this.logger.warn(
        `[format] pipeline skipped, persisting raw: ${err instanceof Error ? err.message : String(err)}`,
      );
      if (threadId) {
        await this.conversationPersistence.persistAssistant(threadId, buffer);
      }
      return;
    }

    const finalMarkdown =
      result.markdown.trim().length > 0 ? result.markdown : buffer;

    if (threadId) {
      await this.conversationPersistence.persistAssistant(
        threadId,
        finalMarkdown,
      );
    }

    if (result.changed && finalMarkdown !== buffer) {
      this.logger.log(
        `[format] reformatted ${result.scoreBefore}->${result.scoreAfter} reason=${result.repairReason} style=${style}`,
      );
      this.logger.debug(
        JSON.stringify({
          event: 'response_reformatted',
          style,
          requiresStructuredOutput: requiresStructuredOutput(style),
          generationModel: this.defaultModel,
          formatterModel: formatterModel ?? null,
          promptVersion: 'v1',
          scoreBefore: result.scoreBefore,
          scoreAfter: result.scoreAfter,
          formatterInvoked: result.formatterInvoked,
          repairReason: result.repairReason,
          ruleMetrics: result.ruleMetrics,
          validationMs: result.timings.validationMs,
          formatterMs: result.timings.formatterMs,
        }),
      );
      handlers.onResponseReformatted?.(finalMarkdown);
    }
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
