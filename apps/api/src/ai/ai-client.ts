import { Injectable, Logger } from '@nestjs/common';
import {
  AIServiceError,
  AIServiceResponseError,
  AIServiceUnavailableError,
  AITimeoutError,
  classifyError,
} from './ai-errors';
import { AiMetricsService } from './ai-metrics.service';

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ToolChoice {
  type: 'function';
  function: { name: string };
}

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ProviderContext {
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  tool_calls?: ToolCall[];
  usage: { prompt_tokens: number; completion_tokens: number };
}

interface ChatCompletionToolCall {
  id?: string;
  function?: { name?: string; arguments?: string };
}

interface ChatCompletionResponse {
  choices?: {
    message?: {
      content?: string | null;
      tool_calls?: ChatCompletionToolCall[];
    };
  }[];
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

interface StreamChunk {
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  choices?: { delta?: { content?: string } }[];
}

const RETRYABLE_STATUSES = new Set([502, 503, 504]);

const enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

@Injectable()
export class AIClient {
  private readonly logger = new Logger(AIClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly maxRetries: number;
  private readonly defaultTimeoutMs: number;

  // Circuit breaker
  private circuitState = CircuitState.CLOSED;
  private circuitFailures = 0;
  private circuitOpenedAt = 0;
  private readonly circuitFailureThreshold = 5;
  private readonly circuitCooldownMs = 30_000;

  constructor(private readonly metrics: AiMetricsService) {
    this.baseUrl =
      (process.env.AI_SERVICE_URL ?? 'http://localhost:8000') + '/v1';
    this.apiKey = process.env.AI_SERVICE_API_KEY ?? 'tradezen-internal';
    this.maxRetries = 3;
    this.defaultTimeoutMs = 30_000;
  }

  async complete(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      timeoutMs?: number;
      tools?: ToolDefinition[];
      toolChoice?: ToolChoice | 'auto' | 'none';
      signal?: AbortSignal;
      providerContext?: ProviderContext;
      // Treat messages as already-final (formatter/agent passthrough) — the AI
      // service must not re-run intent/agent/prompt pipelines on them.
      contextOwned?: boolean;
    },
  ): Promise<ChatResponse> {
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

    return this.executeWithRetry(
      async (signal) => {
        const body: Record<string, unknown> = {
          model: options?.model,
          temperature: options?.temperature ?? 0.4,
          stream: false,
          messages,
        };
        if (options?.tools?.length) {
          body.tools = options.tools;
          body.tool_choice = options.toolChoice ?? 'auto';
        }

        const resp = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': this.apiKey,
            ...(options?.providerContext?.provider && {
              'X-AI-Provider': options.providerContext.provider,
            }),
            ...(options?.providerContext?.apiKey && {
              'X-AI-Provider-Key': options.providerContext.apiKey,
            }),
            ...(options?.providerContext?.baseUrl && {
              'X-AI-Provider-Base-URL': options.providerContext.baseUrl,
            }),
            ...(options?.contextOwned && {
              'x-context-owned-by-nestjs': 'true',
            }),
          },
          signal,
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          const body = await resp.text().catch(() => '');
          throw new AIServiceResponseError(resp.status, body);
        }

        const data = (await resp.json()) as unknown as ChatCompletionResponse;
        const msg = data.choices?.[0]?.message;
        if (!msg) {
          throw new AIServiceResponseError(
            502,
            `Empty response from AI service (choices: ${JSON.stringify(data.choices ?? [])})`,
          );
        }
        const toolCalls: ToolCall[] | undefined = msg.tool_calls
          ?.filter((tc) => !!tc.id && !!tc.function?.name)
          .map((tc) => ({
            id: tc.id as string,
            type: 'function' as const,
            function: {
              name: tc.function?.name as string,
              arguments: tc.function?.arguments ?? '{}',
            },
          }));

        return {
          content: msg.content ?? '',
          model: data.model ?? options?.model ?? 'unknown',
          tool_calls: toolCalls,
          usage: {
            prompt_tokens: data.usage?.prompt_tokens ?? 0,
            completion_tokens: data.usage?.completion_tokens ?? 0,
          },
        };
      },
      timeoutMs,
      options?.signal,
    );
  }

  async *stream(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      signal?: AbortSignal;
      timeoutMs?: number;
      providerContext?: ProviderContext;
      contextOwned?: boolean;
      onUsage?: (usage: {
        prompt_tokens: number;
        completion_tokens: number;
      }) => void;
    },
  ): AsyncGenerator<string> {
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    let lastError: AIServiceError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        this.checkCircuitBreaker();

        // Combine caller's abort signal with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // Link caller's signal to our controller
        if (options?.signal) {
          if (options.signal.aborted) {
            clearTimeout(timeoutId);
            return;
          }
          options.signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timeoutId);
              controller.abort();
            },
            { once: true },
          );
        }

        const resp = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': this.apiKey,
            ...(options?.providerContext?.provider && {
              'X-AI-Provider': options.providerContext.provider,
            }),
            ...(options?.providerContext?.apiKey && {
              'X-AI-Provider-Key': options.providerContext.apiKey,
            }),
            ...(options?.providerContext?.baseUrl && {
              'X-AI-Provider-Base-URL': options.providerContext.baseUrl,
            }),
            ...(options?.contextOwned && {
              'x-context-owned-by-nestjs': 'true',
            }),
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: options?.model,
            temperature: options?.temperature ?? 0.4,
            stream: true,
            messages,
          }),
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
          const body = await resp.text().catch(() => '');
          throw new AIServiceResponseError(resp.status, body);
        }

        if (!resp.body) {
          throw new AIServiceResponseError(200, 'No response body');
        }

        yield* this.consumeSSE(resp.body, options?.signal, options?.onUsage);
        this.onSuccess();
        return; // Success — exit retry loop
      } catch (error) {
        lastError = classifyError(error, this.baseUrl, timeoutMs);
        this.metrics.incFailure();
        if (lastError instanceof AITimeoutError) this.metrics.incTimeout();

        // Don't retry non-streaming callers' abort, or client errors
        if (options?.signal?.aborted) throw lastError;
        if (
          lastError instanceof AIServiceResponseError &&
          !RETRYABLE_STATUSES.has(lastError.statusCode)
        ) {
          this.onFailure();
          throw lastError;
        }

        if (attempt < this.maxRetries) {
          this.metrics.incRetry();
          const delay = this.retryDelay(attempt);
          this.logger.warn(
            `Stream attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms.`,
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    this.onFailure();
    throw lastError!;
  }

  private async executeWithRetry<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number,
    externalSignal?: AbortSignal,
  ): Promise<T> {
    let lastError: AIServiceError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        this.checkCircuitBreaker();

        if (externalSignal?.aborted) {
          throw new AIServiceUnavailableError(this.baseUrl);
        }

        this.metrics.incRequest();
        const signal = externalSignal ?? AbortSignal.timeout(timeoutMs);
        const result = await fn(signal);
        this.onSuccess();
        return result;
      } catch (error) {
        lastError = classifyError(error, this.baseUrl, timeoutMs);
        this.metrics.incFailure();
        if (lastError instanceof AITimeoutError) this.metrics.incTimeout();

        if (
          lastError instanceof AIServiceResponseError &&
          lastError.statusCode >= 400 &&
          lastError.statusCode < 500
        ) {
          this.onFailure();
          throw lastError;
        }

        if (attempt < this.maxRetries) {
          this.metrics.incRetry();
          const delay = this.retryDelay(attempt);
          this.logger.warn(
            `Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms.`,
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    this.onFailure();
    throw lastError!;
  }

  private checkCircuitBreaker(): void {
    if (this.circuitState === CircuitState.CLOSED) return;

    if (this.circuitState === CircuitState.OPEN) {
      const elapsed = Date.now() - this.circuitOpenedAt;
      if (elapsed >= this.circuitCooldownMs) {
        this.circuitState = CircuitState.HALF_OPEN;
        this.logger.log('Circuit breaker: open → half_open');
        return;
      }
      throw new AIServiceUnavailableError(this.baseUrl);
    }

    // HALF_OPEN — allow exactly one request through (handled by caller)
  }

  private onSuccess(): void {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.logger.log('Circuit breaker: half_open → closed');
    }
    this.circuitState = CircuitState.CLOSED;
    this.circuitFailures = 0;
  }

  private onFailure(): void {
    this.circuitFailures++;
    if (this.circuitFailures >= this.circuitFailureThreshold) {
      this.circuitState = CircuitState.OPEN;
      this.circuitOpenedAt = Date.now();
      this.metrics.incCircuitBreakerOpen();
      this.logger.warn(
        `Circuit breaker: closed → open (failures: ${this.circuitFailures})`,
      );
    }
  }

  private retryDelay(attempt: number): number {
    const base = 100 * Math.pow(3, attempt);
    const jitter = base * (0.5 + Math.random() * 0.5);
    return Math.min(jitter, 2000);
  }

  private async *consumeSSE(
    body: ReadableStream<Uint8Array>,
    signal?: AbortSignal,
    onUsage?: (usage: {
      prompt_tokens: number;
      completion_tokens: number;
    }) => void,
  ): AsyncGenerator<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        if (signal?.aborted) return;

        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') return;

          try {
            const parsed = JSON.parse(payload) as unknown as StreamChunk;
            const usage = parsed?.usage;
            if (usage && typeof usage.prompt_tokens === 'number') {
              onUsage?.({
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens ?? 0,
              });
              continue;
            }
            const token = parsed?.choices?.[0]?.delta?.content;
            if (typeof token === 'string' && token.length > 0) {
              yield token;
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
  }
}
